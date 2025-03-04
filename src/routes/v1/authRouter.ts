import { Router } from 'express';
import { notAllowedMethod, notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import { login, signup, confirmEmail } from '../../controllers/authController';
import requestValidator from '../../middlewares/requestValidator';
import { confirmEmailSchema, signupSchema } from '../../validators/validate.auth';
import { rateLimiter } from '../../utils/rateLimiter';

const authRouter = Router();

authRouter.route('/login')
  .post(login)
  .all(notAllowedMethod);

authRouter.route("/signup")
  .post(
    requestValidator({ bodySchema: signupSchema }),
    signup
  )
  .all(notAllowedMethod);

authRouter.route("/confirm-email")
  .post(
    rateLimiter(60, 5, "Too many requests, please try again later"),
    requestValidator({ bodySchema: confirmEmailSchema }),
    confirmEmail
  )
authRouter.route('*').all(notFoundEndpoint);

export default authRouter;