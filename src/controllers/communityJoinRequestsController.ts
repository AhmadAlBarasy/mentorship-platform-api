import errorHandler from '../utils/asyncErrorHandler';
import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import APIError from '../classes/APIError';
import prisma from '../db';
import { getCommunityByFieldService } from '../services/communityService';

const requestToJoinCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { user } = req;
  const { id: userId } = user;

  const community = await getCommunityByFieldService({ searchBy: { id } });

  if (!community){
    return next(new APIError(404, 'Community not found'));
  }

  const joinRequestExists = await prisma.communityJoinRequests.findFirst({
    where: {
      userId: userId,
      communityId: id,
    },
  });

  if (joinRequestExists){
    return next(new APIError(409, 'You\'ve already submitted a request to join this community'));
  }

  await prisma.communityJoinRequests.create({
    data: {
      userId,
      communityId: id,
    },
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Join request submitted successfully',
  });

});

const withdrawCommunityJoinRequest = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { user } = req;
  const { id: userId } = user;

  const community = await getCommunityByFieldService({ searchBy: { id } });

  if (!community){
    return next(new APIError(404, 'Community not found'));
  }

  const joinRequestExists = await prisma.communityJoinRequests.findFirst({
    where: {
      userId: userId,
      communityId: id,
    },
  });

  if (!joinRequestExists){
    return next(new APIError(409, 'You haven\'t submitted a request to join this community'));
  }

  await prisma.communityJoinRequests.delete({
    where: {
      id: joinRequestExists.id,
    },
  });

  res.status(204).json({});

});

export {
  requestToJoinCommunity,
  withdrawCommunityJoinRequest,
};
