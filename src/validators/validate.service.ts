import Joi from 'joi';
import { validateDateKeys, validateSessionTime, validDays } from './validator.custom';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema = Joi.object({
  startTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      'string.pattern.base': 'start_time must be in HH:mm format (24-hour)',
    }),
  duration: Joi.number()
    .min(10)
    .max(360)
    .required()
    .messages({
      'any.required': 'duration is required',
      'number.min': 'duration must be at least 10 minutes',
      'number.max': 'duration must be at most 360',
    }),
});

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
    .required()
    .min(10)
    .max(360)
    .custom(validateSessionTime)
    .messages({
      'any.required': 'sessionTime is required',
      'number.invalidSessionTime': 'sessionTime must be a multiple of 5',
      'number.max': 'sessionTime must be at most 360',
    }),

  days: daysAvailabilitiesSchema,
  exceptions: exceptionsAvailabilitySchema,
});

export {
  createServiceSchema,
  daysAvailabilitiesSchema,
};
