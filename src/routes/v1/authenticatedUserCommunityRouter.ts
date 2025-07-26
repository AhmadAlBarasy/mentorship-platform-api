import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { Role } from '@prisma/client';
import { resolveJoinRequestSchema, updateCommunitySchema } from '../../validators/validate.community';
import {
  deleteAuthenticatedUserCommunityImage,
  updateAuthenticatedUserCommunityImage,
  updateCommunity,
  getAuthenticatedUserCommunity,
  getAuthenticatedManagerCommunityJoinRequests,
  resolveCommunityJoinRequest,
  leaveCommunity,
} from '../../controllers/communityController';
import upload from '../../utils/fileUpload';

const { COMMUNITY_MANAGER ,MENTEE , MENTOR } = Role;

const authenticatedUserCommunityRouter = Router();

authenticatedUserCommunityRouter.route('/join-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    getAuthenticatedManagerCommunityJoinRequests,
  )
  .put(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    requestValidator({ bodySchema: resolveJoinRequestSchema }),
    resolveCommunityJoinRequest,
  )
  .all(notAllowedMethod);

authenticatedUserCommunityRouter.route('/picture')
  .put(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    upload.single('image'),
    updateAuthenticatedUserCommunityImage,
  )
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    deleteAuthenticatedUserCommunityImage,
  )
  .all(notAllowedMethod);

authenticatedUserCommunityRouter.route('/')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    getAuthenticatedUserCommunity,
  )
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    requestValidator({ bodySchema: updateCommunitySchema }),
    updateCommunity,
  )
  .all(notAllowedMethod);

authenticatedUserCommunityRouter.route('/:id/leave')
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE, MENTOR]),
    leaveCommunity,
  )
  .all(notAllowedMethod);


export default authenticatedUserCommunityRouter;
