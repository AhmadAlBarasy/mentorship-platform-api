import { Router } from 'express';
import authRouter from './authRouter';
import userRouter from './userRouter';
import { notFoundEndpoint } from '../../middlewares/notAllowedHandler';
import communityRouter from './communityRouter';
import { createAndSendOTP } from '../../services/otpService';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/communities', communityRouter);

// Temporary test route (do not keep in prod)
v1Router.post('/test/send-otp', async(req, res) => {
  const { userId, email } = req.body;

  try {
    await createAndSendOTP(userId, email);
    res.status(200).json({ status: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});
v1Router.route('*').all(notFoundEndpoint);

export default v1Router;
