import { Request, Response, NextFunction } from 'express';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import { SUCCESS } from '../constants/responseConstants';
import APIError from '../classes/APIError';
import { DateTime } from 'luxon';

const getUserReports = errorHandler(async(req: Request, res: Response, next: NextFunction) =>{

  const pendingUserReports = await prisma.userReports.findMany({
    where: {
      resolvedBy: null,
    },
    orderBy: {
      reportedAt: 'desc',
    },
  });

  const resolvedUserReports = await prisma.userReports.findMany({
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

export {
  getUserReports,
  resolveUserReport,
}
