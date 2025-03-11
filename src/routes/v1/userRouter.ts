import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import { getUser } from '../../controllers/userController';
import { authenticateUser, authorizeUser } from '../../middlewares/authMiddlewares';
import { Role } from '@prisma/client';

const userRouter = Router();

userRouter.route('/:id')
  .get(
    authenticateUser,
    authorizeUser([
      Role.ADMIN,
      Role.MENTEE,
      Role.MENTOR,
    ]),
    getUser,
  )
  .all(notAllowedMethod);



export default userRouter;
