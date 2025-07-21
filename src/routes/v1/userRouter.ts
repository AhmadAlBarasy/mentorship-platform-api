import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';
import {
  getUser,
  reportUser,
} from '../../controllers/userController';
import { authenticate, authorizedRoles } from '../../middlewares/authMiddlewares';
import requestValidator from '../../middlewares/requestValidator';
import authenticatedUserRouter from './authenticatedUserRouter';
import { reportUserSchema } from '../../validators/validate.user';

const userRouter = Router();

userRouter.use('/me', authenticatedUserRouter);

userRouter.route('/:id/report')
  .post(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    requestValidator({ bodySchema: reportUserSchema }),
    reportUser,
  )
  .all(notAllowedMethod);

userRouter.route('/:id')
  .get(
    authenticate({ access: 'full' }),
    authorizedRoles('*'),
    getUser,
  )
  .all(notAllowedMethod);


export default userRouter;
