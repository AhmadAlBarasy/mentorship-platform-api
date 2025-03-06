import { Request, Response, NextFunction } from 'express';
import { SUCCESS } from '../constants/responseConstants';
import errorHandler from "../utils/asyncErrorHandler";
import {
  getUser,
  createAuthRecord,
  createUser,
  updateUserAuthCredentials 
  } from '../services/userService';
import APIError from '../types/classes/APIError';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import transporter from '../utils/mail/mailSender';
import { confirmationCodeTemplate } from '../utils/mail/mailTemplates';
import jwt from 'jsonwebtoken';

export const login = errorHandler(async (req: Request, res: Response, next: NextFunction) => {

  const { email, password } = req.body;
  const user = await getUser({ searchBy: { email }, authCredentials: false });
  if (!user) {
    return next(new APIError(401, 'Invalid email or password'));
  }
  if (await bcrypt.compare(password, user.password) === false) {
    return next(new APIError(401, 'Invalid email or password'));
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

  res.status(200).json({
    status: SUCCESS,
    message: 'Successfully logged in.',
    token,
  });
});

export const signup = errorHandler(async (req: Request, res: Response, next: NextFunction) => {

  const {  name, id, email, password, country, role } = req.body;
  if (await getUser({ searchBy: { id } })) {
    return next(new APIError(400, `${id} has already been taken`));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const roleENUM = role === 'mentee' ? Role.MENTEE : Role.MENTOR;

  // this statement will mislead the user that are trying to figure out if an email is already taken
  if (await getUser({ searchBy: { email } })){
    res.json({
      status: SUCCESS,
      message: `Registered successfully, a confirmation code has been sent to ${email}`
    });
    return;
  }

  // create a 6 digit confirmation code (starting from 000000 to 999999)
  const confirmationCode = `${Math.ceil((Math.random() * 999999))}`.padStart(6, '0');
  console.log(confirmationCode);
  await createUser({
    name,
    id,
    email,
    password: hashedPassword,
    country,
    role: roleENUM,
  });
  await createAuthRecord({
    userId: id,
    confirmationCode,
  });
  await transporter.sendMail(confirmationCodeTemplate(name, email, confirmationCode));
    res.status(201).json({
    status: SUCCESS,
    message: `Registered successfully, a confirmation code has been sent to ${email}`
  });
});

export const confirmEmail = errorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, code } = req.body;
  const user = await getUser({ searchBy: { email }, authCredentials: true });
  if (!user) {
    return next(new APIError(400, 'Invalid email or confirmation code'));
  }
  if (user.authCredentials?.emailVerified === true){
    return next(new APIError(400, 'Email has already been verified'));
  }
  if (user.authCredentials?.emailVerificationCode !== code){
    return next(new APIError(400, 'Invalid confirmation code'));
  }
  await updateUserAuthCredentials(user.id, { emailVerified: true, emailVerificationCode: null });
  res.status(200).json({
    status: SUCCESS,
    message: `Email ${user.email} has been verified successfully`,
  });
});