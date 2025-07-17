import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import {
  getUser,
} from '../../controllers/userController';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import authenticatedUserRouter from './authenticatedUserRouter';

const userRouter = Router();

userRouter.use('/me', authenticatedUserRouter);

userRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    getUser,
  )
  .all(notAllowedMethod);


export default userRouter;
