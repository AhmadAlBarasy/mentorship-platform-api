import { Router } from 'express';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import {
  deleteAuthenticatedUserImage,
  getAuthenticatedUser,
  updateAuthenticatedUser,
  updateAuthenticatedUserImage,
} from '../../controllers/userController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { updateUserSchema } from '../../validators/validate.user';
import {
  getAuthenticatedUserLinks,
  addAuthenticatedUserLinks,
  updateAuthenticatedUserLink,
  deleteAuthenticatedUserLink,
} from '../../controllers/userLinksController';
import { addUserLinkSchema, updateUserLinkSchema } from '../../validators/validate.userLinks';
import upload from '../../utils/fileUpload';
import { Role } from '@prisma/client';
import { getAuthenticatedUserJoinRequests } from '../../controllers/communityJoinRequestsController';
import {
  getMenteeSessionRequests,
  withDrawSessionRequest,

} from '../../controllers/sessionRequestController';

const authenticatedUserRouter = Router();

const { MENTEE, MENTOR } = Role;

authenticatedUserRouter.route('/links/:id')
  .patch(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: updateUserLinkSchema }),
    updateAuthenticatedUserLink,
  )
  .delete(
    authenticate({ access: 'full' }),
    deleteAuthenticatedUserLink,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/links')
  .get(
    authenticate({ access: 'full' }),
    getAuthenticatedUserLinks,
  )
  .post(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: addUserLinkSchema }),
    addAuthenticatedUserLinks,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/profile-picture')
  .put(
    authenticate({ access: 'full' }),
    upload.single('image'),
    updateAuthenticatedUserImage,
  )
  .delete(
    authenticate({ access: 'full' }),
    deleteAuthenticatedUserImage,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/join-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE, MENTOR]),
    getAuthenticatedUserJoinRequests,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/session-requests/:id')
  .delete(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    withDrawSessionRequest,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/session-requests')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles([MENTEE]),
    getMenteeSessionRequests,
  )
  .all(notAllowedMethod);

authenticatedUserRouter.route('/')
  .get(
    authenticate({ access: '*' }),
    getAuthenticatedUser,
  )
  .patch(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: updateUserSchema }),
    updateAuthenticatedUser,
  )
  .all(notAllowedMethod);


export default authenticatedUserRouter;
