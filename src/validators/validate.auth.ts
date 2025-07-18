import Joi from 'joi';
import { validateContryAlpha3Code } from './validator.custom';

const signupSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .required(),
  id: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(32)
    .required(),
  email: Joi.string()
    .email()
    .required(),
  headline: Joi.string()
    .max(50)
    .required(),
  password: Joi.string()
    .min(8)
    .max(72)
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
  country: Joi.string() // stored in ISO 3166-1 country codes
    .length(3)
    .custom(validateContryAlpha3Code)
    .messages({
      'string.alpha3Code': 'Country name must be a valid ISO 3166-1 alpha-3 code',
    }),
  role: Joi.string()
    .valid('mentee', 'mentor', 'community_manager')
    .required(),
});

const confirmEmailSchema = Joi.object({
  code: Joi.string().length(16).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email(),
  id: Joi.string(),
  password: Joi.string().required(),
}).xor('id', 'email');

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().length(32).required(),
  password: Joi.string()
    .min(8)
    .required()
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/\d/, 'number')
    .pattern(/[\W_]/, 'special character')
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.name': 'Password must contain at least one {#name}',
      'any.required': 'Password is required',
    }),
});

const updatePasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .required()
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/\d/, 'number')
    .pattern(/[\W_]/, 'special character')
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.name': 'Password must contain at least one {#name}',
      'any.required': 'Password is required',
    }),
});

const googleAuthSchema = Joi.object({
  token: Joi.string()
    .required(),
});

export {
  signupSchema,
  confirmEmailSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  updatePasswordSchema,
}
