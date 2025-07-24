import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { Role } from '@prisma/client';
import { createCommunitySchema } from '../../validators/validate.community';
import { createCommunity, getCommunity } from '../../controllers/communityController';
import authenticatedUserCommunityRouter from './authenticatedUserCommunityRouter';

const { COMMUNITY_MANAGER } = Role;

const communityRouter = Router();

communityRouter.use('/my', authenticatedUserCommunityRouter);

communityRouter.route('/')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    requestValidator({ bodySchema: createCommunitySchema }),
    createCommunity,
  )
  .all(notAllowedMethod);

communityRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    getCommunity,
  )
  .all(notAllowedMethod);

export default communityRouter;
