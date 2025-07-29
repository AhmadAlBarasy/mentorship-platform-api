import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import { enable2FAService } from '../services/otpService';

export const enable2FA = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(new APIError(401, 'Unauthorized'));
  }

  await enable2FAService(userId);

  res.status(200).json({
    status: SUCCESS,
    message: 'Two-factor authentication has been enabled.',
  });
});
