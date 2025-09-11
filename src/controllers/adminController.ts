import { Request, Response, NextFunction } from 'express';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import { SUCCESS } from '../constants/responseConstants';
import APIError from '../classes/APIError';
import { DateTime } from 'luxon';
import { getUserFullInformationService } from '../services/userService';
import { Role } from '@prisma/client';

const { ADMIN } = Role;

const getUserReports = errorHandler(async(req: Request, res: Response, next: NextFunction) =>{
  const { limit } = req.query;

  const take = (limit) ? Number(limit) : undefined;

  const pendingUserReports = await prisma.userReports.findMany({
    take,
    where: {
      resolvedBy: null,
    },
    orderBy: {
      reportedAt: 'desc',
    },
  });

  const resolvedUserReports = await prisma.userReports.findMany({
    take,
    where: {
      resolvedBy: {
        not: null,
      },
    },
    orderBy: {
      reportedAt: 'desc',
    },
  });

  res.status(200).json({
    status: SUCCESS,
    userReports: {
      pending: pendingUserReports,
      resolved: resolvedUserReports,
    },
  });

});

const resolveUserReport = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { action, banReason } = req.body;
  const { id: adminId } = req.user;

  const userReport = await prisma.userReports.findFirst({
    where: {
      id,
      resolvedBy: null,
    },
  });

  if (!userReport){
    return next(new APIError(404, 'User report was not found'));
  }

  if (action === 'ban' && !banReason){
    return next(new APIError(400, 'You must specify a reason for your ban'));
  }

  if (action === 'ban'){
    await prisma.$transaction([
      prisma.userReports.updateMany({
        where: {
          reportedUserId: userReport.reportedUserId,
          resolvedBy: null,
        },
        data: {
          resolvedBy: adminId,
        },
      }),
      prisma.bannedUsers.create({
        data: {
          bannedById: adminId,
          banReason,
          bannedAt: DateTime.now().toJSDate(),
          userId: userReport.reportedUserId,
        },
      }),
    ]);
  } else if (action === 'discard'){
    await prisma.userReports.deleteMany({
      where: {
        id,
      },
    });
  }

  res.status(200).json({
    status: SUCCESS,
    message: 'User report has been resolved successfully',
  });

});

const getBannedUsers = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { limit } = req.query;

  const take = (limit) ? Number(limit) : undefined;

  const result = await prisma.bannedUsers.findMany({
    take,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const bannedUsers = result.map((user) => {
    return {
      id: user.userId,
      name: user.user.name,
      bannedBy: user.bannedById,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
    }
  });

  res.status(200).json({
    status: SUCCESS,
    bannedUsers,
  });

});

const liftUserBan = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: userId } = req.params;

  const deleteCount = await prisma.bannedUsers.deleteMany({
    where: {
      userId,
    },
  });

  if (deleteCount.count === 0){
    return next(new APIError(404, `No banned user was found with an ID of ${userId}`));
  }

  res.status(204).json();

});

const banUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: userId } = req.params;
  const { banReason } = req.body;
  const { id: adminId } = req.user;

  const user = await prisma.users.findFirst({
    where: {
      id: userId,
    },
    include: {
      bannedUsers: true,
    },
  });

  if (!user){
    return next(new APIError(404, 'User not found'));
  }

  if (user.bannedUsers){
    return next(new APIError(409, 'This user is already banned'));
  }

  if (user.role === ADMIN){
    return next(new APIError(403, 'You can\'t ban an admin'));
  }

  await prisma.bannedUsers.create({
    data: {
      userId,
      bannedById: adminId,
      banReason,
      bannedAt: DateTime.now().toJSDate(),
    },
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'User banned successfully',
  });


});

const getUserFullInformation = errorHandler(async(req: Request, res: Response, next: NextFunction) =>{
  const { timezone } = req.user;
  const { id } = req.params;

  const user = await getUserFullInformationService(id, timezone);

  if (!user){
    return next(new APIError(404, 'User not found'));
  }

  res.status(200).json({
    status: SUCCESS,
    user,
  });

});

export {
  getUserReports,
  resolveUserReport,
  getBannedUsers,
  liftUserBan,
  banUser,
  getUserFullInformation,
}
