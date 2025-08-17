import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import APIError from '../classes/APIError';
import prisma from '../db';
import path from 'path';
import mime from 'mime-types';
import { getCommunityByFieldService,
  getCommunityMembersService,
  getAuthenticatedUserCommunitiesService,
  removeParticipantService,
  structureMembers,
  getUserCommunityMembershipStatusService,
} from '../services/communityService';
import { getSupabasePathFromURL } from '../utils/supabaseUtils';
import supabase from '../services/supabaseClient';


const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'growthly-storage';

const createCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, body } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (community){
    return next(new APIError(409, 'You already have a community'));
  }

  const communityWithSameId = await getCommunityByFieldService({ searchBy: { id: body.id } });

  if (communityWithSameId){
    return next(new APIError(400, `${body.id} has already been taken`));
  }

  body.managerId = user.id;

  const newCommunity = await prisma.communities.create({
    data: body,
  });

  res.status(201).json({
    status: SUCCESS,
    message: 'Community created successfully',
    community: newCommunity,
  });

});

const updateCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, body } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const updatedCommunity = await prisma.communities.update({
    where: {
      id: community.id,
    },
    data: body,
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Community updated successfully',
    community: updatedCommunity,
  });

});

const updateAuthenticatedUserCommunityImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  if (!req.file) {
    return next(new APIError(400, 'No image provided'));
  }

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { imageUrl, id } = community;

  const UPLOAD_TESTER = process.env.UPLOAD_TESTER;

  // Create the path for Supabase
  const TESTER = UPLOAD_TESTER ? `${UPLOAD_TESTER}/` : ''; // if UPLOAD_TESTER exists, add its value as a base path
  const fileBuffer = req.file.buffer;
  const fileExt = path.extname(req.file.originalname);
  const fileName = `${id}${fileExt}`;
  const supabasePath = `${TESTER}communities/${fileName}`;
  const contentType = mime.lookup(fileExt) || 'application/octet-stream';

  // Delete previous image if it exists
  if (imageUrl){
    const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);
    await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);
  }
  // Upload new image
  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).upload(
    supabasePath,
    fileBuffer,
    {
      upsert: true,
      contentType,
    },
  );

  if (error) {
    return next(new APIError(500, 'Image uploading failed'));
  }

  await prisma.communities.update({
    where: {
      managerId: user.id,
    },
    data: {
      imageUrl: supabasePath,
    },
  });

  const { data } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(supabasePath);

  res.status(200).json({
    status: SUCCESS,
    message: 'Community image uploaded successfully',
    url: data.publicUrl,
  });

});

const deleteAuthenticatedUserCommunityImage = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { imageUrl } = community;

  if (!imageUrl){
    return next(new APIError(404, 'Resource to be deleted not found'));
  }

  const deletionPath = getSupabasePathFromURL(imageUrl, SUPABASE_BUCKET_NAME);

  const { error } = await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([deletionPath]);

  if (error){
    return next(new APIError(500, 'Failed to delete image'));
  }

  await prisma.communities.update({
    where: {
      managerId: user.id,
    },
    data: {
      imageUrl: null,
    },
  });

  res.status(204).json({});

});


const getCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { id } });

  if (!community) {
    return next(new APIError(404, 'Community not found'));
  }

  const membershipStatus = await getUserCommunityMembershipStatusService(user, community);

  res.status(200).json({
    status: SUCCESS,
    community,
    membershipStatus,
  });
});

const getAuthenticatedUserCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  res.status(200).json({
    status: SUCCESS,
    community,
  });

});

const getAuthenticatedManagerCommunityJoinRequests = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const joinRequests = await prisma.communityJoinRequests.findMany({
    where: {
      communityId: community.id,
    },
    include: {
      user: {
        select: {
          name: true,
          headline: true,
        },
      },
    },
  });

  res.status(200).json({
    status: SUCCESS,
    joinRequests,
  });

});

const resolveCommunityJoinRequest = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user, body } = req;

  const community = await getCommunityByFieldService({ searchBy: { managerId: user.id } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const joinRequest = await prisma.communityJoinRequests.findFirst({
    where: {
      id: body.id,
      communityId: community.id,
    },
  });

  if (!joinRequest){
    return next(new APIError(404, 'Join request not found'));
  }

  if (body.action === 'accept'){

    await prisma.participations.create({
      data: {
        userId: joinRequest.userId,
        communityId: community.id,
      },
    });

    await prisma.communityJoinRequests.delete({
      where: {
        id: joinRequest.id,
      },
    });

  } else {

    await prisma.communityJoinRequests.delete({
      where: {
        id: joinRequest.id,
      },
    });

  }

  res.status(200).json({
    status: SUCCESS,
    message: 'Join request has been resolved successfully',
  });

});

const getCommunityMembers = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const communityId = req.params.id;

  const members = await getCommunityMembersService(communityId);

  const sturcturedMembers = structureMembers(members);

  res.status(200).json({
    status: SUCCESS,
    members: sturcturedMembers,
  });
});

const getAuthenticatedManagerCommunityMembers = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: managerId } = req.user;

  const community = await getCommunityByFieldService({ searchBy: { managerId } });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { id: communityId } = community;

  const members = await getCommunityMembersService(communityId);
  const sturcturedMembers = structureMembers(members);

  res.status(200).json({
    status: SUCCESS,
    members: sturcturedMembers,
  });

});


const getAuthenticatedUserCommunities = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { user } = req;
  const participations = await getAuthenticatedUserCommunitiesService(user.id);

  const structuredMemberships = participations.length === 0 ? [] :
    participations.map((participation) => ({
      id: participation.community.id,
      name: participation.community.name,
      description: participation.community.description,
      imageUrl: participation.community.imageUrl ?
        supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(participation.community.imageUrl).data.publicUrl
        : null,
      joinedAt: participation.joinedAt,
    }))

  res.status(200).json({
    status: SUCCESS,
    memberships: structuredMemberships,
  });
});

const leaveCommunity = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: communityId } = req.body;
  const { id: userId } = req.user;

  const community = await getCommunityByFieldService({ searchBy: { id: communityId } });

  if (!community){
    return next(new APIError(404, 'Community not found'));
  }

  const participation = await prisma.participations.findFirst({
    where: {
      userId,
      communityId,
    },
  });

  if (!participation){
    return next(new APIError(400, 'You are not a member of this community'));
  }

  await removeParticipantService(userId, communityId);

  res.status(204).json({});

});

const removeCommunityMember = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id: managerId } = req.user;
  const { id: userId } = req.body;

  const community = await prisma.communities.findFirst({
    where: {
      managerId,
    },
  });

  if (!community){
    return next(new APIError(404, 'You don\'t have a community'));
  }

  const { id: communityId } = community;

  const participation = await prisma.participations.findFirst({
    where: {
      userId,
      communityId,
    },
  });

  if (!participation){
    return next(new APIError(404, 'This user is not a member of your community'));
  }

  await removeParticipantService(userId, communityId);

  res.status(204).json({});

});


export {
  createCommunity,
  updateCommunity,
  updateAuthenticatedUserCommunityImage,
  deleteAuthenticatedUserCommunityImage,
  getCommunity,
  getAuthenticatedUserCommunity,
  getAuthenticatedManagerCommunityJoinRequests,
  resolveCommunityJoinRequest,
  getCommunityMembers,
  getAuthenticatedUserCommunities,
  leaveCommunity,
  removeCommunityMember,
  getAuthenticatedManagerCommunityMembers,
};
