import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import {
  getUser,
  updateAuthenticatedUser,
  getUserSkills,
  updateUserSkills,
} from '../../controllers/userController';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { Role } from '@prisma/client';
import requestValidator from '../../middlewares/requestValidator';
import { updateUserSchema, updateUserSkillsSchema } from '../../validators/validate.user';

const userRouter = Router();

userRouter.route('/me')
  .patch(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: updateUserSchema }),
    updateAuthenticatedUser,
  )
  .all(notAllowedMethod);

userRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    getUser,
  )
  .all(notAllowedMethod);

userRouter.route('/:id/skills')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    getUserSkills,
  )
  .put(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    requestValidator({ bodySchema: updateUserSkillsSchema }),
    updateUserSkills,
  )
  .all(notAllowedMethod);


export default userRouter;
