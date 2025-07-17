import Joi from 'joi';

import { validateContryAlpha3Code, validateIANADatabaseTimeZone } from './validator.custom';

const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50),
  headline: Joi.string()
    .max(50),
  bio: Joi.string()
    .max(1000),
  country: Joi.string() // stored in ISO 3166-1 country codes
    .length(3)
    .custom(validateContryAlpha3Code)
    .messages({
      'string.alpha3Code': 'Country name must be a valid ISO 3166-1 alpha-3 code',
    }),
  timezone: Joi.string()
    .custom(validateIANADatabaseTimeZone)
    .messages({
      'string.IANADataBaseTimeZone': 'timezone must be a valid IANA time zone',
    }),
  skills: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(300)
    .messages({
      'array.max': 'You can provide up to 300 skills only',
      'array.includes': 'Each skill must be a string',
      'string.max': 'Each skill must be at most 50 characters long',
    }),


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
