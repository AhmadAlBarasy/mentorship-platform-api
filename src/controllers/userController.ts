import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import APIError from '../classes/APIError';
import { getUserService } from '../services/userService';
import supabase from '../services/supabaseClient';
import path from 'path';
import mime from 'mime-types';

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

const updateAuthenticatedUserImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const { id, imageUrl } = user;
  if (!req.file) {
    return next(new APIError(400, 'No image provided'));
  }

  const UPLOAD_TESTER = process.env.UPLOAD_TESTER;
  const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

  // Create the path for Supabase
  const TESTER = UPLOAD_TESTER ? `${UPLOAD_TESTER}/` : ''; // if UPLOAD_TESTER exists, add its value as a base path
  const fileBuffer = req.file.buffer;
  const fileExt = path.extname(req.file.originalname);
  const fileName = `${user.id}${fileExt}`;
  const supabasePath = `${TESTER}avatars/${fileName}`;
  const contentType = mime.lookup(fileExt) || 'application/octet-stream';

  // Delete previous avatar if it exists
  if (user.imageUrl){
    await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([imageUrl]);
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

  await supabase.storage.from('growthly-storage').remove([imageUrl]);
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
  updateAuthenticatedUserImage,
  deleteAuthenticatedUserImage,
};
