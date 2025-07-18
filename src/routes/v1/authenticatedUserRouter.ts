import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { getAuthenticatedUser, updateAuthenticatedUser } from '../../controllers/userController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { updateUserSchema } from '../../validators/validate.user';
import {
  getAuthenticatedUserLinks,
  addAuthenticatedUserLinks,
  updateAuthenticatedUserLink,
  deleteAuthenticatedUserLink,
} from '../../controllers/userLinksController';
import { addUserLinkSchema, updateUserLinkSchema } from '../../validators/validate.userLinks';

const authenticatedUserRouter = Router();

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
