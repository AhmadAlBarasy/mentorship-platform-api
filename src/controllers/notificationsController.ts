import { Request, Response, NextFunction } from 'express';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import { SUCCESS } from '../constants/responseConstants';

const getUserNotifications = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: userId } = req.user;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notifications.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notifications.count({
      where: { userId, isRead: false },
    }),
  ]);

  res.status(200).json({
    status: SUCCESS,
    notifications,
    newNotifications: unreadCount > 0,
  });

});

export {
  getUserNotifications,
}
