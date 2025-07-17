import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import { getAuthenticatedUser, updateAuthenticatedUser } from '../../controllers/userController';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { updateUserSchema } from '../../validators/validate.user';
import { getAuthenticatedUserLinks } from '../../controllers/userLinksController';

const authenticatedUserRouter = Router();

authenticatedUserRouter.route('/links')
  .get(
    authenticate({ access: 'full' }),
    getAuthenticatedUserLinks,
  )
  .post()
  .patch()
  .delete()
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
