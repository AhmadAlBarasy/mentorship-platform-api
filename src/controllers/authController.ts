import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from '../utils/asyncErrorHandler';
import {
  getUserService,
  createAuthRecordService,
  createUserService,
  updateUserAuthCredentialsService,
  updateUserService,
  cleanOTP,
} from '../services/userService';
import APIError from '../classes/APIError';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { emailVerficationLinkTemplate, resetPasswordTemplate } from '../utils/mail/mailTemplates';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/mail/mailSender';
import { createAndSendOTP } from '../services/otpService';
// import { getGoogleTokens, getGoogleUserData } from '../utils/google/googleAuth';

export const login = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const { id, email, password } = req.body;
  const user = await getUserService({ searchBy: { id, email }, includeAuth: true, includePassword: true });
  if (!user) {
    return next(new APIError(401, 'Invalid id/email or password'));
  }
  if (await bcrypt.compare(password, user.password) === false) {
    return next(new APIError(401, 'Invalid id/email or password'));
  }
  if (user.authCredentials?.twoFactorEnabled) {
    await createAndSendOTP(user.id, user.email);
    res.status(200).json({
      message: 'OTP sent to your email',
      partialAuth: true,
      userId: user.id,
    });
  }

  const emailVerified = user.authCredentials?.emailVerified;

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      iss: process.env.JWT_ISS,
      partial: emailVerified ? undefined : true,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: emailVerified ? '1d' : '1h',
    },
  );

  const cookieExpiry = 60 * 60 * 1000;
  res.cookie('token', token, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: emailVerified ? cookieExpiry * 24 : cookieExpiry,
  });

  res.status(200).json({
    status: SUCCESS,
    message: 'Successfully logged in.',
    token,
  });
});

export const logout = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const user = req.user;
  if (!user || !user.id) {
    return next(new Error('User not authenticated'));
  }
  res.clearCookie('token', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  await cleanOTP(user.id);
  res.status(200).json({
    status: SUCCESS,
    message: 'Logged out successfully',
  });

});

export const signup = errorHandler(async(req: Request, res: Response, next: NextFunction) => {

  const { name, id, headline, email, password, country, role } = req.body;
  if (await getUserService({ searchBy: { id } })) {
    return next(new APIError(400, `${id} has already been taken`));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  let roleENUM;
  switch (role){
  case 'mentee':
    roleENUM = Role.MENTEE;
    break;
  case 'mentor':
    roleENUM = Role.MENTOR;
    break;
  case 'community_manager':
    roleENUM = Role.COMMUNITY_MANAGER;
    break;
  default: // just a default value
    roleENUM = Role.MENTEE;
    break;
  }

  // this statement will mislead the user that are trying to figure out if an email is already taken
  if (await getUserService({ searchBy: { email } })){
    res.json({
      status: SUCCESS,
      message: `Registered successfully, a verfication link has been sent to ${email}`,
    });
    return;
  }

  const confirmationCode = crypto.randomBytes(8).toString('hex');
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

  await sendEmail(emailVerficationLinkTemplate(name, email, confirmationCode));

  const token = jwt.sign(
    {
      sub: id,
      role: roleENUM,
      iss: process.env.JWT_ISS,
      partial: true, // generate a partial session for the user to verify their email
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '1h',
    },
  );

  res.cookie('token', token, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production', // restrict sending the cookie only thorugh HTTPS in prod
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000, // 1h

  });

  res.status(201).json({
    status: SUCCESS,
    message: `Registered successfully, a verfication link has been sent to ${email}`,
  });
});

export const confirmEmail = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { code } = req.body;
  const { email } = req.user;
  const user = await getUserService({ searchBy: { email }, includeAuth: true });
  if (!user) {
    return next(new APIError(400, 'Invalid confirmation code'));
  }
  if (user.authCredentials?.emailVerified === true){
    return next(new APIError(400, 'Invalid confirmation code')); // misleading response
  }
  if (user.authCredentials?.emailVerificationCode !== code){
    return next(new APIError(400, 'Invalid confirmation code'));
  }
  await updateUserAuthCredentialsService(user.id, { emailVerified: true, emailVerificationCode: null });

  // upgrade the user's session to a full one
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
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production', // restrict sending the cookie only thorugh HTTPS in prod
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1d

  });

  res.status(200).json({
    status: SUCCESS,
    message: `Email ${user.email} has been verified successfully`,
  });
});

export const forgotPassword = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const user = await getUserService({ searchBy: { email }, includeAuth: true });
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
  const user = await getUserService({ searchBy: { resetToken: token }, includeAuth: true });
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

export const updatePassword = errorHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { id } = req.user;
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await updateUserService(id, { password: hashedPassword });
  res.status(200).json({
    status: SUCCESS,
    message: 'Password has been updated successfully',
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
