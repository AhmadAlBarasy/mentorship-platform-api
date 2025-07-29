import APIError from '../classes/APIError';
import prisma from '../db';

export const enable2FAService = async(userId: string) => {
  const record = await prisma.authCredentials.findUnique({ where: { userId } });

  if (record?.twoFactorEnabled) {
    throw new APIError(400, '2FA is already enabled.');
  }

  return prisma.authCredentials.update({
    where: { userId },
    data: { twoFactorEnabled: true },
  });
};
