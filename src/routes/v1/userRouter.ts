import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import {
  getUser,
  updateUser,
  getUserSkills,
  updateUserSkills,
} from '../../controllers/userController';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import { Role } from '@prisma/client';
import requestValidator from '../../middlewares/requestValidator';
import { updateUserSchema, updateUserSkillsSchema } from '../../validators/validate.user'

const { ADMIN, MENTEE, MENTOR, COMMUNITY_MANAGER } = Role;

const userRouter = Router();

userRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    getUser,
  )
  .patch(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    requestValidator({ bodySchema: updateUserSchema }),
    updateUser,
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
