import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import path from 'path';
import mime from 'mime-types';
import { getCommunityByFieldService } from '../services/communityService';
import { getSupabasePathFromURL } from '../utils/supabaseUtils';
import supabase from '../services/supabaseClient';

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const createCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, body } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (community){
    return next(new APIError(409, 'You already have a community'));
  }

  const communityWithSameId = await getCommunityByFieldService({ searchBy: { id: body.id } });

  if (communityWithSameId){
    return next(new APIError(400, `${body.id} has already been taken`));
  }

  body.managerId = user.id;

  const newCommunity = await prisma.communities.create({
    data: body,
  });

  res.status(201).json({
    status: SUCCESS,
    message: 'Community created successfully',
    community: newCommunity,
  });

});

const updateCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, body } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const updatedCommunity = await prisma.communities.update({
    where: {
      id: community.id,
    },
    data: body,
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Community updated successfully',
    community: updatedCommunity,
  });

});

const updateAuthenticatedUserCommunityImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  if (!req.file) {
    return next(new APIError(400, 'No image provided'));
  }

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { imageUrl, id } = community;

  const UPLOAD_TESTER = process.env.UPLOAD_TESTER;

  // Create the path for Supabase
  const TESTER = UPLOAD_TESTER ? `${UPLOAD_TESTER}/` : ''; // if UPLOAD_TESTER exists, add its value as a base path
  const fileBuffer = req.file.buffer;
  const fileExt = path.extname(req.file.originalname);
  const fileName = `${id}${fileExt}`;
  const supabasePath = `${TESTER}communities/${fileName}`;
  const contentType = mime.lookup(fileExt) || 'application/octet-stream';

  // Delete previous image if it exists
  if (imageUrl){
    const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);
    await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);
  }
  // Upload new image
  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).upload(
    supabasePath,
    fileBuffer,
    {
      upsert: true,
      contentType,
    },
  );

  if (error) {
    return next(new APIError(500, 'Image uploading failed'));
  }

  await prisma.communities.update({
    where: {
      managerId: user.id,
    },
    data: {
      imageUrl: supabasePath,
    },
  });

  const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(supabasePath);

  res.status(200).json({
    status: SUCCESS,
    message: 'Community image uploaded successfully',
    url: data.publicUrl,
  });

});

const deleteAuthenticatedUserCommunityImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { imageUrl } = community;

  if (!imageUrl){
    return next(new APIError(404, 'Resource to be deleted not found'));
  }

  const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);

  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);

  if (error){
    return next(new APIError(500, 'Failed to delete image'));
  }

  await prisma.communities.update({
    where: {
      managerId: user.id,
    },
    data: {
      imageUrl: null,
    },
  });

  res.status(204).json({});

});


const getCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const community = await getCommunityByFieldService({ searchBy: { id } });

  if (!community) {
    return next(new APIError(404, 'Community not found'));
  }

  res.status(200).json({
    status: SUCCESS,
    community,
  });
});

const getAuthenticatedUserCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  res.status(200).json({
    status: SUCCESS,
    community,
  });

});

export {
  createCommunity,
  updateCommunity,
  updateAuthenticatedUserCommunityImage,
  deleteAuthenticatedUserCommunityImage,
  getCommunity,
  getAuthenticatedUserCommunity,
};
