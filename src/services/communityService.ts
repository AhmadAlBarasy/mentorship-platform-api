import APIError from '../classes/APIError';
import prisma from '../db';
import supabase from './supabaseClient';

const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const getCommunityByFieldService = async(options: {
  searchBy: {
    id?: string,
    managerId?: string,
  },
}) => {
  const { searchBy } = options;
  const filters = [];

  if (searchBy.id){
    filters.push({ id: searchBy.id });
  }

  if (searchBy.managerId){
    filters.push({ managerId: searchBy.managerId });
  }

  const community = await prisma.communities.findFirst({
    where: {
      OR: filters,
    },
    include: {
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });

  if (!community){
    return null;
  }

  if (community.imageUrl){
    const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(community.imageUrl);
    community.imageUrl = data.publicUrl;
  }

  const { _count, ...rest } = community;

  const restructuredCommunity = {
    ...rest,
    memberCount: _count.participants,
  };

  return restructuredCommunity;
};

const getCommunityMembersService = async(communityId: string) => {
  return prisma.participations.findMany({
    where: { communityId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

const leaveCommunityService = async(userId: string, communityId: string) => {
  const participation = await prisma.participations.findFirst({
    where: {
      userId,
      communityId,
    },
  });

  if (!participation) {
    throw new APIError(404, 'You are not a member of this community');
  }

  await prisma.participations.deleteMany({
    where: {
      userId,
      communityId,
    },
  });

  return { message: 'Successfully left the community' };
};


export { getCommunityByFieldService, getCommunityMembersService,leaveCommunityService };
