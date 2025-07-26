import Joi from 'joi';

export const verifyOTPSchema = Joi.object({
  userId: Joi.string().required(),
  otp: Joi.string().length(6).required(),
});
