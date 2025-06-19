import prisma from '../db';
import { Role } from '@prisma/client';

const getUserService = async(options: {
  searchBy: {
    email?: string,
    id?: string,
    resetToken?: string,
  },
  IncludeAuth?: boolean,
  }) => {
  const { searchBy, IncludeAuth } = options;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: searchBy.email },
        { id: searchBy.id },
        { authCredentials: { resetToken: searchBy.resetToken } },
      ],
    },
    include: { authCredentials: IncludeAuth },
  });
  return user;
};

const updateUserService = async(id: string, data: {
  name?: string,
  headline?: string,
  bio?: string,
  password?: string,
  country?: string,
}) => {
  await prisma.user.update({
    where: {
      id,
    },
    data,
  });
};

const updateUserAuthCredentialsService = async(id: string, data: {
  emailVerificationCode?: string | null,
  emailVerified?: boolean,
  resetToken?: string | null,
  resetExpiry?: Date| null,
  }) => {
  await prisma.authCredentials.update({
    where: {
      userId: id,
    },
    data,
  });
};

const createUserService = async(data:
  { name: string,
    id: string,
    email: string,
    password: string,
    country: string,
    role: Role,
  },
) => {
  const { name, id, email, password, country, role } = data;
  await prisma.user.create({
    data: {
      name,
      id,
      email,
      password,
      country,
      role,
    },
  });
};

const createAuthRecordService = async(data:
  {
    userId: string,
    confirmationCode: string,
  }) => {
  await prisma.authCredentials.create({
    data: {
      userId: data.userId,
      emailVerificationCode: data.confirmationCode,
    },
  });
};



export {
  getUserService,
  createUserService,
  createAuthRecordService,
  updateUserAuthCredentialsService,
  updateUserService,
};
