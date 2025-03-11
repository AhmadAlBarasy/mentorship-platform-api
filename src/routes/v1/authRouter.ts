import { Router } from 'express';
import { notAllowedMethod, notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import {
  login,
  signup,
  confirmEmail,
  forgotPassword,
  resetPassword,
  // googleAuth
} from '../../controllers/authController';
import requestValidator from '../../middlewares/requestValidator';
import {
  confirmEmailSchema,
  forgotPasswordSchema,
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  // googleAuthSchema,
  } from '../../validators/validate.auth';
import { rateLimiter } from '../../utils/rateLimiter';

const authRouter = Router();

authRouter.route('/login')
  .post(
    requestValidator({ bodySchema: loginSchema }),
    login
  )
  .all(notAllowedMethod);

authRouter.route("/signup")
  .post(
    requestValidator({ bodySchema: signupSchema }),
    signup
  )
  .all(notAllowedMethod);

authRouter.route("/confirm-email")
  .post(
    requestValidator({ bodySchema: confirmEmailSchema }),
    confirmEmail
  )
  .all(notAllowedMethod);

authRouter.route("/forgot-password")
  .post(
    rateLimiter(60, 5, "Too many requests, please try again later"),
    requestValidator({ bodySchema: forgotPasswordSchema }),
    forgotPassword,
  )
  .all(notAllowedMethod);

  authRouter.route("/reset-password")
  .post(
    requestValidator({ bodySchema: resetPasswordSchema }),
    resetPassword,
  )
  .all(notAllowedMethod);

// authRouter.route("/google-auth")
//   .post(
//     // requestValidator({ bodySchema: googleAuthSchema }),
//     googleAuth,
//   )
//   .all(notAllowedMethod);

authRouter.route('*').all(notFoundEndpoint);

export default authRouter;