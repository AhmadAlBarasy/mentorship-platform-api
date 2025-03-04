import prisma from "../db";
import { Role } from "@prisma/client";

const getUser = async (options: {
  searchBy: {
    email?: string,
    id?: string,
  },
  authCredentials?: boolean,
  }) => {
    const { searchBy, authCredentials } = options;
    const user = await prisma.user.findFirst({
      where: {
      OR: [
        { email: searchBy.email },
        { id: searchBy.id },
      ],
      },
      include: { authCredentials },
    });
    return user;
};

const updateUserAuthCredentials = async (id: string, data: {
  emailVerificationCode?: string | null,
  emailVerified?: boolean,
  passwordResetCode?: string,
  passwordResetExpiry?: Date,
  }) => {
    await prisma.authCredentials.update({
      where: {
        userId: id,
      },
      data,
    });
};

const createUser = async (data: 
  { name: string, 
    id: string, 
    email: string, 
    password: string, 
    country: string, 
    role: Role, 
  }
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
      }
    });
};

const createAuthRecord = async (data:
  {
    userId: string,
    confirmationCode: string,
  }) => {
  await prisma.authCredentials.create({
    data: {
      userId: data.userId,
      emailVerificationCode: data.confirmationCode,
    }
  });
};

export {
  getUser,
  createUser,
  createAuthRecord,
  updateUserAuthCredentials,
};