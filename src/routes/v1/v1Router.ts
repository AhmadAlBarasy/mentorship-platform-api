import { Router } from 'express';
import authRouter from './authRouter';
import userRouter from './userRouter';
import { notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import communityRouter from './communityRouter';
import serviceRouter from './serviceRouter';
import adminRouter from './adminRouter';
import dashboardRouter from './dashboardRouter';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/communities', communityRouter);
v1Router.use('/services', serviceRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/dashboard', dashboardRouter);

v1Router.route('*').all(notFoundEndpoint);

export default v1Router;
