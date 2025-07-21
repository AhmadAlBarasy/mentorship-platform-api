import prisma from '../db';
import { Role } from '@prisma/client';
import supabase from './supabaseClient';

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const getUserService = async(options: {
  searchBy: {
    email?: string,
    id?: string,
    resetToken?: string,
  },
  includeAuth?: boolean,
  includeUserLinks?: boolean,
  includePassword?: boolean,
}) => {
  const { searchBy, includeAuth, includeUserLinks, includePassword } = options;

  const filters = [];
  if (searchBy.email) {
    filters.push({ email: searchBy.email });
  }
  if (searchBy.id) {
    filters.push({ id: searchBy.id });
  }
  if (searchBy.resetToken) {
    filters.push({ authCredentials: { resetToken: searchBy.resetToken } });
  }

  const user = await prisma.users.findFirst({
    where: {
      OR: filters,
    },
    include: {
      authCredentials: includeAuth,
      links: includeUserLinks,
    },
    omit: {
      password: !includePassword, // don't omit the password if true
    },
  });

  if (user && user.imageUrl){
    const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(user.imageUrl);
    user.imageUrl = data.publicUrl;
  }

  return user;
};


const updateUserService = async(id: string, data: {
  name?: string,
  headline?: string,
  bio?: string,
  password?: string,
  country?: string,
}) => {
  await prisma.users.update({
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
  resetExpiry?: Date | null,
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
    headline: string,
    password: string,
    country: string,
    role: Role,
  },
) => {
  const { name, id, email, headline, password, country, role } = data;
  await prisma.users.create({
    data: {
      name,
      id,
      email,
      headline,
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
