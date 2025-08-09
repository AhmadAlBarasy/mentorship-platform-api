import prisma from '../db';

interface GetSessionRequestByFieldOptions {
  searchBy: {
    serviceId?: string;
    menteeId?: string;
    mentorId?: string;
    communityId?: string;
  };
  includeService?: boolean;
  includeMentee?: boolean;
}

export const getSessionRequestByFieldService = async ({
  searchBy,
  includeService = false,
  includeMentee = false,
}: GetSessionRequestByFieldOptions) => {
  const whereClause: any = {};

  if (searchBy.serviceId) whereClause.serviceId = searchBy.serviceId;
  if (searchBy.menteeId) whereClause.menteeId = searchBy.menteeId;
  if (searchBy.mentorId) whereClause.mentorId = searchBy.mentorId;
  if (searchBy.communityId) whereClause.communityId = searchBy.communityId;

  return prisma.sessionRequests.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      service: includeService
        ? {
            select: {
              id: true,
              type: true,
              description: true,
              sessionTime: true,
              mentorId: true,
              createdAt: true,
            },
          }
        : false,
      mentee: includeMentee
        ? {
            select: {
              id: true,
              email: true,
              name: true,
              headline: true,
              country: true,
              imageUrl: true,
              dateJoined: true,
              skills: true,
              timezone: true,
              role: true,
            },
          }
        : false,
    },
  });
};
