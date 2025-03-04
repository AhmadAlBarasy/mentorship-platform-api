import Joi from 'joi';

const signupSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  id: Joi.string().alphanum().min(3).max(32).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
  .min(8)
  .required()
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/\d/, 'number')
  .pattern(/[\W_]/, 'special character')
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.name': 'Password must contain at least one {#name}',
    'any.required': 'Password is required',
  }),
  country: Joi.string().min(2).max(56).required(),
  role: Joi.string().valid('mentee', 'mentor').required(),
});

const confirmEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required(),
});

export {
  signupSchema,
  confirmEmailSchema,
}