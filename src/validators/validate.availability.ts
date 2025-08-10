import Joi from 'joi';
import { duration, timeHHMM } from './validate.common';
import { validateDateKeys, validDays } from './validator.custom';

const updateAvailabilitySchema = Joi.object({
  startTime: timeHHMM
    .optional()
    .messages({
      'string.pattern.base': 'startTime must be in HH:mm format (24-hour)',
    }),
  duration: duration
    .optional()
    .messages({
      'number.min': 'duration must be at least 10 minutes',
      'number.max': 'duration must be at most 360',
    }),
}).min(1).message('At least 1 attribute is required to update');

const availabilitySchema = Joi.object({
  startTime: timeHHMM
    .required()
    .messages({
      'any.required': 'startTime is required',
      'string.pattern.base': 'startTime must be in HH:mm format (24-hour)',
    }),
  duration: duration
    .required()
    .messages({
      'any.required': 'duration is required',
      'number.min': 'duration must be at least 10 minutes',
      'number.max': 'duration must be at most 360',
    }),
});

const addDayAvailabilitySchema = Joi.object({
  dayOfWeek: Joi.string()
    .required()
    .valid(...validDays)
    .messages({
      'any.required': 'dayOfWeek is required',
      'any.only': `dayOfWeek must be one of ${validDays}`,
    }),

  duration: duration
    .required()
    .messages({
      'any.required': 'duration is required',
      'number.min': 'duration must be at least 10 minutes',
      'number.max': 'duration must be at most 360',
    }),
  startTime: timeHHMM
    .required()
    .messages({
      'any.required': 'startTime is required',
      'string.pattern.base': 'startTime must be in HH:mm format (24-hour)',
    }),
});

const addAvailabilityExceptionSchema = Joi.object({
  date: Joi.string()
    .required()
    .custom(validateDateKeys)
    .messages({
      'any.required': 'date is required',
      'string.pattern.base': '{{#value}} is not a valid date. Use YYYY-MM-DD format.',
    }),
  duration: duration
    .required()
    .messages({
      'any.required': 'duration is required',
      'number.min': 'duration must be at least 10 minutes',
      'number.max': 'duration must be at most 360',
    }),
  startTime: timeHHMM
    .required()
    .messages({
      'any.required': 'startTime is required',
      'string.pattern.base': 'startTime must be in HH:mm format (24-hour)',
    }),
});

export {
  updateAvailabilitySchema,
  availabilitySchema,
  addDayAvailabilitySchema,
  addAvailabilityExceptionSchema,
}
