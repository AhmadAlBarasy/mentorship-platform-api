import Joi from 'joi';

const resolveUserReportSchema = Joi.object({
  action: Joi.string()
    .valid('ban', 'discard')
    .required()
    .messages({
      'any.only': 'action must be either "ban" or "discard"',
      'any.required': 'action is required',
    }),
  banReason: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'banReason can be at most 100 characters',
    }),
});

const banUserSchema = Joi.object({
  banReason: Joi.string()
    .max(100)
    .required()
    .messages({
      'string.max': 'banReason can be at most 100 characters',
    }),
});

export {
  resolveUserReportSchema,
  banUserSchema,
}
