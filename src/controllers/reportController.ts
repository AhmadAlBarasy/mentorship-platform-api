import { Request, Response, NextFunction } from 'express';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import { SUCCESS } from '../constants/responseConstants';
import { Role } from '@prisma/client';
import {
  getUserService,
  createUserReport,
  checkExistingUserReport,
} from '../services/userService';

export const reportUser = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
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
    return next(new APIError(404, 'User not found.'));
  }

  if (reportedUser.role === Role.ADMIN) {
    return next(new APIError(403, 'You cannot report an ADMIN.'));
  }


  if (await checkExistingUserReport(reporterId, reportedUserId)) {
    return next(new APIError(409, 'You have already reported this user.'));
  }

  await createUserReport({ userId: reporterId, reportedUserId, violation, additionalDetails });


  res.status(201).json({
    status: SUCCESS,
    message: 'User reported successfully.',
  });
});
