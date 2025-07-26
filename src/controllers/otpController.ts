import APIError from '../classes/APIError';
import prisma from '../db';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';


export default function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const verifyOTP = asyncHandler(async(req, res, next) => {
  const { userId, otp } = req.body;

  const record = await prisma.authCredentials.findUnique({
    where: { userId },
  });

  if (!record) {
    return next(new APIError(404, 'No OTP record found'));
  }

  if (record.twoFactorOTP !== otp) {
    return next(new APIError(400, 'Incorrect OTP'));
  }

  if (!record.resetExpiry || new Date() > record.resetExpiry) {
    return next(new APIError(400, 'OTP expired'));
  }

  // Optionally clear OTP after successful verification
  await prisma.authCredentials.update({
    where: { userId },
    data: {
      twoFactorOTP: null,
      resetExpiry: null,
      twoFactorEnabled: true, // or whatever flag you use
    },
  });

  return res.status(200).json({
    status: 'Success',
    message: 'OTP verified',
  });
});
function asyncHandler(arg0: (req: any, res: any, next: any) => Promise<any>) {
  throw new Error('Function not implemented.');
}

