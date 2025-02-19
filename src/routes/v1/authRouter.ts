// example router

import { Router } from 'express';
import { notAllowedMethod, notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import { login } from '../../controllers/authController';

const authRouter = Router();

authRouter.route('/login')
  .post(login)
  .all(notAllowedMethod);

authRouter.route('*').all(notFoundEndpoint);

export default authRouter;