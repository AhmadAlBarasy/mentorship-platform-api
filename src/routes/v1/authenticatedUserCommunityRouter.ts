import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { Role } from '@prisma/client';
import { updateCommunitySchema } from '../../validators/validate.community';
import { deleteAuthenticatedUserCommunityImage, updateAuthenticatedUserCommunityImage, updateCommunity } from '../../controllers/communityController';
import upload from '../../utils/fileUpload';

const { COMMUNITY_MANAGER } = Role;

const authenticatedUserCommunityRouter = Router();

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
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles([COMMUNITY_MANAGER]),
    requestValidator({ bodySchema: updateCommunitySchema }),
    updateCommunity,
  )
  .all(notAllowedMethod);

export default authenticatedUserCommunityRouter;
