import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import APIError from '../classes/APIError';
import { checkExistingUserReport, createUserReport, getUserService } from '../services/userService';
import { Role } from '@prisma/client';

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

const reportUser = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
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
    return next(new APIError(404, 'User not found'));
  }

  if (reportedUser.role === Role.ADMIN) {
    return next(new APIError(403, 'You cannot report an ADMIN'));
  }


  if (await checkExistingUserReport(reporterId, reportedUserId)) {
    return next(new APIError(409, 'You have already reported this user'));
  }

  await createUserReport({ userId: reporterId, reportedUserId, violation, additionalDetails });


  res.status(201).json({
    status: SUCCESS,
    message: 'User reported successfully',
  });
});

export {
  getUser,
  getAuthenticatedUser,
  updateAuthenticatedUser,
  reportUser,
};
