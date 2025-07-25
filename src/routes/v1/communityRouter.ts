import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { Role } from '@prisma/client';
import { createCommunitySchema } from '../../validators/validate.community';
import { createCommunity, getCommunity } from '../../controllers/communityController';
import authenticatedUserCommunityRouter from './authenticatedUserCommunityRouter';
import { requestToJoinCommunity, withdrawCommunityJoinRequest } from '../../controllers/communityJoinRequestsController';

const { COMMUNITY_MANAGER, MENTEE, MENTOR } = Role;

const communityRouter = Router();

communityRouter.use('/my', authenticatedUserCommunityRouter);

communityRouter.route('/:id/join-requests')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE, MENTOR]),
    requestToJoinCommunity,
  )
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE, MENTOR]),
    withdrawCommunityJoinRequest,
  )
  .all(notAllowedMethod);

communityRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    getCommunity,
  )
  .all(notAllowedMethod);



communityRouter.route('/')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    requestValidator({ bodySchema: createCommunitySchema }),
    createCommunity,
  )
  .all(notAllowedMethod);

export default communityRouter;
