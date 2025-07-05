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

const { ADMIN, MENTEE, MENTOR } = Role;

const userRouter = Router();

userRouter.route('/:id/skills')
  .get(
    authenticate,
    authorizedRoles('*'),
    getUserSkills,
  )
  .put(
    authenticate,
    authorizedRoles('*'),
    requestValidator({ bodySchema: updateUserSkillsSchema }),
    updateUserSkills,
  )
  .all(notAllowedMethod);

userRouter.route('/:id')
  .get(
    authenticate,
    authorizedRoles('*'),
    getUser,
  )
  .patch(
    authenticate,
    authorizedRoles('*'),
    requestValidator({ bodySchema: updateUserSchema }),
    updateUser,
  )
  .all(notAllowedMethod);



export default userRouter;
