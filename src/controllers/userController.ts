import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import prisma from '../db';
import APIError from '../classes/APIError';
import { getUserService } from '../services/userService';

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

export {
  getUser,
  getAuthenticatedUser,
  updateAuthenticatedUser,
};
