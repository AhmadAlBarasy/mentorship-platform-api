import { Router } from 'express';
import { notAllowedMethod } from '../../middlewares/notAllowedHandler';

const userRouter = Router();

userRouter.route('{id}')
  .get()
  .all(notAllowedMethod);



export default userRouter;
