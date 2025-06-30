import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import {
  getUserService,
  createAuthRecordService,
  createUserService,
  updateUserAuthCredentialsService,
  updateUserService,
} from '../services/userService';
import APIError from '../classes/APIError';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { confirmationCodeTemplate, resetPasswordTemplate } from '../utils/mail/mailTemplates';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/mail/mailSender';
// import { getGoogleTokens, getGoogleUserData } from '../utils/google/googleAuth';

export const login = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const { id, email, password } = req.body;
  const user = await getUserService({ searchBy: { id, email }, IncludeAuth: false });
  if (!user) {
    return next(new APIError(401, 'Invalid id/email or password'));
  }
  if (await bcrypt.compare(password, user.password) === false) {
    return next(new APIError(401, 'Invalid id/email or password'));
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      iss: process.env.JWT_ISS,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '1d',
    },
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'prodcution' ? true : false, // restrict sending the cookie only thorugh HTTPS in prod
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1d

  });
  res.status(200).json({
    status: SUCCESS,
    message: 'Successfully logged in.',
    token,
  });
});

export const signup = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const {  name, id, headline, email, password, country, role } = req.body;
  if (await getUserService({ searchBy: { id } })) {
    return next(new APIError(400, `${id} has already been taken`));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const roleENUM = role === 'mentee' ? Role.MENTEE : Role.MENTOR;

  // this statement will mislead the user that are trying to figure out if an email is already taken
  if (await getUserService({ searchBy: { email } })){
    res.json({
      status: SUCCESS,
      message: `Registered successfully, a confirmation code has been sent to ${email}`,
    });
    return;
  }

  // create a 6 digit confirmation code (starting from 000000 to 999999)
  const confirmationCode = `${Math.ceil((Math.random() * 999999))}`.padStart(6, '0');
  await createUserService({
    name,
    id,
    email,
    headline,
    password: hashedPassword,
    country: country.toUpperCase(),
    role: roleENUM,
  });
  await createAuthRecordService({
    userId: id,
    confirmationCode,
  });
  await sendEmail(confirmationCodeTemplate(name, email, confirmationCode));
  res.status(201).json({
    status: SUCCESS,
    message: `Registered successfully, a confirmation code has been sent to ${email}`,
  });
});

export const confirmEmail = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { email, code } = req.body;
  const user = await getUserService({ searchBy: { email }, IncludeAuth: true });
  if (!user) {
    return next(new APIError(400, 'Invalid email or confirmation code'));
  }
  if (user.authCredentials?.emailVerified === true){
    return next(new APIError(400, 'Invalid email or confirmation code')); // misleading response
  }
  if (user.authCredentials?.emailVerificationCode !== code){
    return next(new APIError(400, 'Invalid email or confirmation code'));
  }
  await updateUserAuthCredentialsService(user.id, { emailVerified: true, emailVerificationCode: null });
  res.status(200).json({
    status: SUCCESS,
    message: `Email ${user.email} has been verified successfully`,
  });
});

export const forgotPassword = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const user = await getUserService({ searchBy: { email }, IncludeAuth: true });
  if (!user){
    res.status(200).json({ // sent to deceive a malicious user trying to figure out if an email address is used
      status: SUCCESS,
      message: `An email with the reset link has been sent to ${email}`,
    });
    return;
  }
  const resetCode = crypto.randomBytes(16).toString('hex');
  await updateUserAuthCredentialsService(user.id, {
    resetToken: resetCode,
    resetExpiry: new Date(Date.now() + 600000),
  });

  await sendEmail(resetPasswordTemplate(user.name, user.email, resetCode));

  res.status(200).json({
    status: SUCCESS,
    message: `An email with the reset link has been sent to ${email}`,
  })
});

export const resetPassword = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { password, token } = req.body;
  const user = await getUserService({ searchBy: { resetToken: token }, IncludeAuth: true });
  if (!user){
    return next(new APIError(400, 'Invalid reset token'));
  }
  if (user.authCredentials?.resetToken !== token){
    return next(new APIError(400, 'Invalid reset token'));
  }
  if (user.authCredentials?.resetExpiry && user.authCredentials.resetExpiry < new Date()){
    await updateUserAuthCredentialsService(user.id, { resetToken: null, resetExpiry: null });
    return next(new APIError(400, 'Reset token has expired'));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await updateUserService(user.id, { password: hashedPassword });
  await updateUserAuthCredentialsService(user.id, { resetToken: null, resetExpiry: null });
  res.status(200).json({
    status: SUCCESS,
    message: 'Password has been reset successfully',
  });
});

// export const googleAuth = errorHandler(async (req: Request, res: Response, next: NextFunction)=> {
//   const { token } = req.body;
//   // get user's id_token and access_token
//   const tokens = await getGoogleTokens(token);
//   // get user's data using the id_token
//   const userData = await getGoogleUserData(tokens.id_token);
//   if (!userData){
//     return next(new APIError(500, "Something went wrong, please try again later"));
//   }
//   const user = await getUser({ searchBy: {email: userData.email} });
//   if (!user){
//     await createUser({
//       name: userData.name,

//     });
//   }
//   res.status(200).json({
//     status: SUCCESS,
//     message: 'User data retrieved successfully',
//     data: userData,
//   });
// });
