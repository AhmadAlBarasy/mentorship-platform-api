import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import APIError from '../classes/APIError';
import prisma from '../db';
import { clearOTPService } from '../services/otpService';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import { getUserService } from '../services/userService';

const verifyOTP = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { userId: id, otp } = req.body;

  const user = await getUserService({ searchBy: { id }, includeAuth: true });
  if (!user) {
    return next(new APIError(401, 'Invalid id or otp'));
  }
  const record = await prisma.authCredentials.findUnique({
    where: { userId: id },
  });

  if (!record || !record.twoFactorOTP || !record.otpExpiresAt) {
    return next(new APIError(404, 'OTP not found or expired.'));
  }

  const now = new Date();
  if (record.twoFactorOTP !== otp || now > record.otpExpiresAt) {
    return next(new APIError(401, 'Invalid or expired OTP.'));
  }

  await clearOTPService(id);

  const emailVerified = user.authCredentials?.emailVerified;
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      iss: process.env.JWT_ISS,
      partial: emailVerified ? undefined : true,
    },
      process.env.JWT_SECRET as string,
      {
        expiresIn: emailVerified ? '1d' : '1h',
      },
  );

  const cookieExpiry = 60 * 60 * 1000;
  res.cookie('token', token, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: emailVerified ? cookieExpiry * 24 : cookieExpiry,
  });


  res.status(200).json({
    status: SUCCESS,
    message: 'OTP verified. Session complete.',
    token,
  });
});

export { verifyOTP };
