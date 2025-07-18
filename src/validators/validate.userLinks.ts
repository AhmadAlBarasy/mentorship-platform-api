import Joi from 'joi';

const addUserLinkSchema = Joi.object({
  linkName: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'Link name must be at most 50 characters long',
    }),
  linkUrl: Joi.string()
    .uri({ scheme: 'https' })
    .max(2048)
    .required()
    .messages({
      'string.uri': 'Link URL must be a valid HTTPS URL',
      'string.max': 'Link URL must be at most 2048 characters long',
    }),
});

const updateUserLinkSchema = Joi.object({
  linkName: Joi.string()
    .max(50)
    .messages({
      'string.max': 'Link name must be at most 50 characters long',
    }),
  linkUrl: Joi.string()
    .uri({ scheme: 'https' })
    .max(2048)
    .messages({
      'string.uri': 'Link URL must be a valid HTTPS URL',
      'string.max': 'Link URL must be at most 2048 characters long',
    }),
}).min(1).message('At least 1 attribute should be provided to update');

export {
  addUserLinkSchema,
  updateUserLinkSchema,
}
