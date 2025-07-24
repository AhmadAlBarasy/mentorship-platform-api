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
  });

  if (community && community.imageUrl){
    const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(community.imageUrl);
    community.imageUrl = data.publicUrl;
  }

  return community;
};
const getCommunityMembersService = async (communityId: string) => {
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


export { getCommunityByFieldService, getCommunityMembersService};
