import prisma from '../db';
import { generateOTP } from '../utils/otp';
import { sendOTPEmail } from './brevoEmailService';

const OTP_EXPIRY_MINUTES = 15;

export const createAndSendOTP = async(userId: string, email: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.authCredentials.update({
    where: { userId },
    data: {
      twoFactorOTP: otp,
      otpExpiresAt: expiresAt,
    },
  });

  await sendOTPEmail(email, otp);
};

export const GetOtpService = async(userId: string) => {
  const record = await prisma.authCredentials.findUnique({ where: { userId } });

  return record;
};

export const clearOTPService = async(userId: string) => {
  return prisma.authCredentials.update({
    where: { userId },
    data: {
      twoFactorOTP: null,
      otpExpiresAt: null,
      twoFactorEnabled: true,
    },
  });
};
