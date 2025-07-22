import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import { getCommunityByFieldService } from '../services/communityService';

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

export { createCommunity };
