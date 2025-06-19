import Joi from 'joi';

import { validateContryAlpha3Code } from './validator.custom';

const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(32),
  headline: Joi.string()
    .min(3)
    .max(50),
  bio: Joi.string()
    .max(1000),
  country: Joi.string() // stored in ISO 3166-1 country codes
    .length(3)
    .custom(validateContryAlpha3Code)
    .messages({
      'string.alpha3Code': 'Country name must be a valid ISO 3166-1 alpha-3 code',
    }),
  imageUrl: Joi.string()
    .uri({ scheme: 'https' }),
  linkedInUrl: Joi.string()
    .uri({ scheme: 'https' })
    .regex(/^https:\/\/(www\.)?linkedin\.com\/(in)\/[a-zA-Z0-9-_%]+\/?$/)
    .message('Invalid LinkedIn profile URL. It should be in the format: https://www.linkedin.com/in/username'),
  gitHubUrl: Joi.string()
    .uri({ scheme: 'https' })
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9-]+$/)
    .message('Invalid GitHub profile URL. It should be in the format: https://github.com/username'),

}).min(1).message('At least 1 attribute should be provided to update');

const skillUpdateSchema = Joi.object({
  name: Joi.string()
    .required()
    .max(100),
  add: Joi.boolean()
    .required(),

});

const updateUserSkillsSchema = Joi.object({
  skills: Joi.array()
    .items(skillUpdateSchema)
    .required()
    .min(1),
});

export { updateUserSchema, updateUserSkillsSchema };
