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

  const alreadyMember = await prisma.participations.findFirst({
    where: {
      userId: user.id,
      communityId: community.id,
    },
  });

  if (alreadyMember){
    return next(new APIError(400, 'You are already a participant in this community'));
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

const getAuthenticatedUserJoinRequests = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: userId } = req.user;
  const joinRequests = await prisma.communityJoinRequests.findMany({
    where: {
      userId,
    },
  });

  res.status(200).json({
    status: SUCCESS,
    joinRequests,
  });
});

export {
  requestToJoinCommunity,
  withdrawCommunityJoinRequest,
  getAuthenticatedUserJoinRequests,
};
