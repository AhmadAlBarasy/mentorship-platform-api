import Joi from 'joi';
import { validateDateKeys, validateSessionTime, validDays } from './validator.custom';
import { availabilitySchema } from './validate.availability';

const daysAvailabilitiesSchema = Joi.object()
  .pattern(
    Joi.string()
      .valid(...validDays),
    Joi.array()
      .items(availabilitySchema)
      .min(1),
  );

const exceptionsAvailabilitySchema = Joi.object()
  .pattern(
    // Key must match YYYY-MM-DD and be a valid date
    Joi.string()
      .custom(validateDateKeys),
    Joi.array()
      .items(availabilitySchema)
      .min(1),
  )
  .messages({
    'string.pattern.base': '{{#value}} is not a valid date. Use YYYY-MM-DD format.',
  });

const createServiceSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(32)
    .required(),

  type: Joi.string()
    .required()
    .max(50)
    .messages({
      'any.required': 'type is required',
      'string.max': 'type must be at most 50 characters',
    }),

  description: Joi.string()
    .required()
    .max(300)
    .messages({
      'any.required': 'description is required',
      'string.max': 'description must be at most 300 characters',
    }),

  sessionTime: Joi.number()
    .integer()
    .min(10)
    .max(360)
    .custom(validateSessionTime)
    .required()
    .messages({
      'any.required': 'sessionTime is required',
      'number.invalidSessionTime': 'sessionTime must be a multiple of 5',
      'number.max': 'sessionTime must be at most 360',
    }),

  days: daysAvailabilitiesSchema,
  exceptions: exceptionsAvailabilitySchema,
});

const updateServiceSchema = Joi.object({
  type: Joi.string()
    .max(50)
    .optional()
    .messages({
      'any.required': 'type is required',
      'string.max': 'type must be at most 50 characters',
    }),

  description: Joi.string()
    .max(300)
    .optional()
    .messages({
      'any.required': 'description is required',
      'string.max': 'description must be at most 300 characters',
    }),

  sessionTime: Joi.number()
    .integer()
    .min(10)
    .max(360)
    .custom(validateSessionTime)
    .optional()
    .messages({
      'number.invalidSessionTime': 'sessionTime must be a multiple of 5',
      'number.max': 'sessionTime must be at most 360',
    }),

}).min(1).message('Stop wasting our resources, these don\'t grow on trees :)');

const updateSessionRequestSchema = Joi.object({
  status: Joi.string()
    .valid('accepted', 'rejected', 'cancelled')
    .optional(),

  agenda: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'agenda can be at most 1000 characters',
    }),

  rejectionReason: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'rejectionReason can be at most 100 characters',
    }),

}).min(1).message('At least 1 attribute is required to update');

export {
  createServiceSchema,
  updateServiceSchema,
  updateSessionRequestSchema,
};
