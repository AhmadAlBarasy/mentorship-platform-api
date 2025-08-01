import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import APIError from '../classes/APIError';
import supabase from '../services/supabaseClient';
import path from 'path';
import mime from 'mime-types';
import { checkExistingUserReport, createUserReport, getUserService } from '../services/userService';
import { Role } from '@prisma/client';
import { getSupabasePathFromURL } from '../utils/supabaseUtils';

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const getUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = await getUserService({
    searchBy: { id },
    includeUserLinks: true,
    includePassword: false,
  });

  if (!user){
    return next(new APIError(404, 'User not found'));
  }

  res.status(200).json({
    status: SUCCESS,
    user,
  });
});

const getAuthenticatedUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: SUCCESS,
    user: req.user,
  });
});

const updateAuthenticatedUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const updatedUser = await prisma.users.update({
    omit: {
      password: true,
    },
    where: {
      id: user.id,
    },
    data: req.body,
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'User updated successfully',
    user: updatedUser,
  });
});

const reportUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const reporterId = req.user.id;
  const reportedUserId = req.params.id;
  const { violation, additionalDetails } = req.body;

  if (reporterId === reportedUserId) {
    return next(new APIError(400, 'You cannot report yourself!'));
  }

  const reportedUser = await getUserService({
    searchBy: { id: reportedUserId },
    includeAuth: false,
    includeUserLinks: false,
    includePassword: false,
  });


  if (!reportedUser) {
    return next(new APIError(404, 'User not found'));
  }

  if (reportedUser.role === Role.ADMIN) {
    return next(new APIError(403, 'You cannot report an ADMIN'));
  }


  if (await checkExistingUserReport(reporterId, reportedUserId)) {
    return next(new APIError(409, 'You have already reported this user'));
  }

  await createUserReport({ userId: reporterId, reportedUserId, violation, additionalDetails });


  res.status(201).json({
    status: SUCCESS,
    message: 'User reported successfully',
  });
});

const updateAuthenticatedUserImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const { id, imageUrl } = user;
  if (!req.file) {
    return next(new APIError(400, 'No image provided'));
  }

  const UPLOAD_TESTER = process.env.UPLOAD_TESTER;

  // Create the path for Supabase
  const TESTER = UPLOAD_TESTER ? `${UPLOAD_TESTER}/` : ''; // if UPLOAD_TESTER exists, add its value as a base path
  const fileBuffer = req.file.buffer;
  const fileExt = path.extname(req.file.originalname);
  const fileName = `${user.id}${fileExt}`;
  const supabasePath = `${TESTER}avatars/${fileName}`;
  const contentType = mime.lookup(fileExt) || 'application/octet-stream';

  // Delete previous avatar if it exists
  if (user.imageUrl){
    const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);
    await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);
  }
  // Upload new avatar
  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).upload(
    supabasePath,
    fileBuffer,
    {
      upsert: true,
      contentType,
    },
  );

  if (error) {
    return next(new APIError(500, 'Upload to Supabase failed'));
  }

  await prisma.users.update({
    where: {
      id,
    },
    data: {
      imageUrl: supabasePath,
    },
  });

  const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(supabasePath);

  res.status(200).json({
    status: SUCCESS,
    message: 'Profile picture uploaded successfully',
    url: data.publicUrl,
  });
});

const deleteAuthenticatedUserImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const { id, imageUrl } = user;

  if (!imageUrl){
    return next(new APIError(404, 'Resource to be deleted not found'));
  }
  const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);

  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);

  if (error){
    return next(new APIError(500, 'Failed to delete image'));
  }

  await prisma.users.update({
    where: {
      id,
    },
    data: {
      imageUrl: null,
    },
  });

  res.status(204).json({});
});


export {
  getUser,
  getAuthenticatedUser,
  updateAuthenticatedUser,
  reportUser,
  updateAuthenticatedUserImage,
  deleteAuthenticatedUserImage,
};
