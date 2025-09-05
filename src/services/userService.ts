import prisma from '../db';
import { Role, SessionStatus } from '@prisma/client';
import supabase from './supabaseClient';
import { SessionRequest } from '../classes/services/SessionRequest';
import { ymdDateString } from '../utils/availability/helpers';
import { Time } from '../classes/services/Time';

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const { ACCEPTED } = SessionStatus;

const getUserService = async(options: {
  searchBy: {
    email?: string,
    id?: string,
    resetToken?: string,
  },
  includeAuth?: boolean,
  includeUserLinks?: boolean,
  includePassword?: boolean,
  includeBan?: boolean,
}) => {
  const {
    searchBy,
    includeAuth,
    includeUserLinks,
    includePassword,
    includeBan,
  } = options;

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
      bannedUsers: includeBan,
      services: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          type: true,
          description: true,
          sessionTime: true,
        },
      },
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
  {
    name: string,
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

const checkExistingUserReport = async(reporterId: string, reportedUserId: string) => {
  return await prisma.userReports.findFirst({
    where: {
      userId: reporterId,
      reportedUserId: reportedUserId,
      resolvedBy: null,
    },
  });
};

const createUserReport = async(data: {
  userId: string;
  reportedUserId: string;
  violation: string;
  additionalDetails?: string;
}) => {
  return await prisma.userReports.create({
    data: {
      userId: data.userId,
      reportedUserId: data.reportedUserId,
      violation: data.violation,
      additionalDetails: data.additionalDetails,
      reportedAt: new Date(),
    },
  });
};
const update2FAService = async(userId: string, enable2FA: boolean) => {
  return prisma.authCredentials.update({
    where: { userId },
    data: { twoFactorEnabled: enable2FA },
  });
};

const getUserFullInformationService = async(id: string, timezone: string) => {

  const result = await prisma.users.findFirst({
    where: {
      id,
    },
    omit: {
      password: true,
    },
    include: {
      bannedUsers: true,
      links: true,
      authCredentials: {
        select: {
          emailVerified: true,
        },
      },
      participations: {
        include: {
          community: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      sessionRequests: {
        select: {
          id: true,
          date: true,
          startTime: true,
          duration: true,
          agenda: true,
          serviceId: true,
          mentorId: true,
          status: true,
          rejectionReason: true,
          communityId: true,
          createdAt: true,
        },
      },
      services: {
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              requests: {
                where: {
                  status: ACCEPTED,
                },
              },
            },
          },
        },
      },
      community: {
        include: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
  });


  if (!result){
    return null;
  }

  const links = result.links.map((link) => {
    return {
      name: link.linkName,
      url: link.linkUrl,
    }
  });

  const community = {
    id: result.community?.id,
    name: result.community?.name,
    description: result.community?.description,
    imageUrl: result.community ? (
      result.community.imageUrl ?
        supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(result.community?.imageUrl).data.publicUrl : null
    ) : undefined,
    verified: result.community?.verified,
    createdAt: result.community?.createdAt,
    membersCount: result.community?._count.participants,
  }

  const communities = result.participations.map((participation) => {
    return {
      communityId: participation.communityId,
      name: participation.community.name,
      imageUrl: participation.community.imageUrl ?
        supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(participation.community.imageUrl).data.publicUrl : null,
    }
  });

  const sessionRequests: Record<string, any[]> = {};

  for (const request of result.sessionRequests){

    const sessionRequest = new SessionRequest(
      Time.fromString(request.startTime.toISOString().slice(11, 16)), // HH:MM
      request.duration,
      new Date(ymdDateString(request.date)),
    );

    const sessionStatus = request.status;

    sessionRequest.shiftToTimezone('Etc/UTC', timezone);

    if (!sessionRequests[sessionStatus]){
      sessionRequests[sessionStatus] = [];
    }

    sessionRequests[sessionStatus].push({
      date: sessionRequest.date,
      startTime: sessionRequest.startTime.toString(),
      duration: sessionRequest.duration,
      agenda: request.agenda,
      serviceId: request.serviceId,
      mentorId: request.mentorId,
      rejectionReason: request.rejectionReason,
      communityId: request.communityId,
      createdAt: request.createdAt,
      id: request.id,
    });

  }

  const services = result.services.map((service) => {
    return {
      id: service.id,
      type: service.type,
      sessionTime: service.sessionTime,
      dsecription: service.description,
      createdAt: service.createdAt,
      acceptedRequestsCount: service._count.requests,
    }
  });

  const user = {
    basicDetails: {
      id: result.id,
      name: result.name,
      headline: result.headline,
      bio: result.bio,
      dateJoined: result.dateJoined,
      email: result.email,
      imageUrl: result.imageUrl ?
        supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(result.imageUrl).data.publicUrl : null,
      timezone: result.timezone,
      skills: result.skills,
      role: result.role,
      country: result.country,
      verified: result.authCredentials?.emailVerified,
      isBanned: result.bannedUsers !== null,
    },
    links,
    communities: communities.length === 0 ? undefined : communities,
    sessionRequests,
    services: services.length === 0 ? undefined : services,
    community,
  }

  return user;
};

export {
  getUserService,
  createUserService,
  createAuthRecordService,
  updateUserAuthCredentialsService,
  updateUserService,
  checkExistingUserReport,
  createUserReport,
  update2FAService,
  getUserFullInformationService,
};
