import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import APIError from '../classes/APIError';
import prisma from '../db';

const { ADMIN } = Role;


export const authorizeCommunityDetailsAccess = async(req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  const communityId = req.params.id;

  if (user.role === ADMIN) {
    return next();
  }

  const community = await prisma.communities.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    return next(new APIError(404, 'Community not found'));
  }

  if (community.managerId === user.id) {
    return next();
  }

  const participation = await prisma.participations.findFirst({
    where: {
      userId: user.id,
      communityId,
    },
    include: {
      user: { select: { role: true } },
    },
  });


  if (!participation || !['MENTOR', 'MENTEE'].includes(participation.user.role)) {
    return next(new APIError(403, 'You are not allowed to access community details'));
  }

  return next();
};
