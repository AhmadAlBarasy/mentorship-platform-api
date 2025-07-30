import { Role } from '@prisma/client';
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
          headline: true,
          imageUrl: true,
        },
      },
    },
  });
};

const getAuthenticatedUserCommunitiesService = async(userId: string) => {
  return prisma.participations.findMany({
    where: { userId },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
      },
    },
  });
};

const removeParticipantService = async(userId: string, communityId: string) => {

  await prisma.participations.deleteMany({
    where: {
      userId,
      communityId,
    },
  });
};

const structureMembers = (members: {
      user: {
        id: string;
        name: string;
        email: string;
        role: Role;
        headline: string;
        imageUrl: string | null;
      };
      joinedAt: Date;
    }[]) => {

  return members.length === 0 ? [] :
    members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.user.role,
      joinedAt: member.joinedAt,
      headline: member.user.headline,
      imageUrl: member.user.imageUrl ? supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(member.user.imageUrl).data.publicUrl : null,
    }))
};

const getUserJoinRequestsService = async(userId: string) => {

  const joinRequests = await prisma.communityJoinRequests.findMany({
    where: {
      userId,
    },
    include: {
      community: true,
    },
  });

  return joinRequests.length === 0 ? [] : joinRequests.map((joinRequest:
    {
    id: string;
    userId: string;
    communityId: string;
    createdAt: Date;
    community: {
      id: string;
      name: string;
      description: string;
      imageUrl: string | null;
      managerId: string | null;
      createdAt: Date;
    }
  },
  ) => {
    return {
      id: joinRequest.id,
      communityId: joinRequest.communityId,
      name: joinRequest.community.name,
      imageUrl: joinRequest.community.imageUrl ?
        supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(joinRequest.community.imageUrl).data.publicUrl
        : null,
      createdAt: joinRequest.createdAt,
    }
  });
}

export {
  getCommunityByFieldService,
  getCommunityMembersService,
  getAuthenticatedUserCommunitiesService,
  removeParticipantService,
  structureMembers,
  getUserJoinRequestsService,
};
