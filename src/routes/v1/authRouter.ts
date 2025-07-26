import { Router } from 'express';
import { notAllowedMethod, notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import {
  login,
  signup,
  confirmEmail,
  forgotPassword,
  resetPassword,
  logout,
  updatePassword,
  // googleAuth
} from '../../controllers/authController';
import requestValidator from '../../middlewares/requestValidator';
import {
  confirmEmailSchema,
  forgotPasswordSchema,
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  // googleAuthSchema,
} from '../../validators/validate.auth';
import { rateLimiter } from '../../utils/rateLimiter';
import { authenticate } from '../../middlewares/authMiddlewares';
import { verifyOTPSchema } from '../../validators/validateOtp';
import { verifyOTP } from '../../controllers/otpController';

const authRouter = Router();

authRouter.route('/login')
  .post(
    requestValidator({ bodySchema: loginSchema }),
    login,
  )
  .all(notAllowedMethod);

authRouter.route('/logout')
  .post(
    authenticate({ access: '*' }),
    logout,
  )

authRouter.route('/signup')
  .post(
    requestValidator({ bodySchema: signupSchema }),
    signup,
  )
  .all(notAllowedMethod);

authRouter.route('/confirm-email')
  .post(
    rateLimiter(10, 5, 'Too many requests, please try again later'),
    authenticate({ access: 'partial' }),
    requestValidator({ bodySchema: confirmEmailSchema }),
    confirmEmail,
  )
  .all(notAllowedMethod);

authRouter.route('/forgot-password')
  .post(
    rateLimiter(60, 5, 'Too many requests, please try again later'),
    requestValidator({ bodySchema: forgotPasswordSchema }),
    forgotPassword,
  )
  .all(notAllowedMethod);

authRouter.route('/reset-password')
  .post(
    requestValidator({ bodySchema: resetPasswordSchema }),
    resetPassword,
  )
  .all(notAllowedMethod);

authRouter.route('/update-password')
  .post(
    authenticate({ access: 'full' }),
    requestValidator({ bodySchema: updatePasswordSchema }),
    updatePassword,
  )
  .all(notAllowedMethod);

authRouter.route('/verify-otp')
  .post(
    requestValidator({ bodySchema: verifyOTPSchema }),
    verifyOTP,
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
