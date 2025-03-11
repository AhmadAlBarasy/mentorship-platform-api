import { Router } from 'express';
import authRouter from './authRouter';
import userRouter from './userRouter';
import { notFoundEndpoint } from '../../middlewares/notAllowedHandler';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);

v1Router.route('*').all(notFoundEndpoint);

export default v1Router;
