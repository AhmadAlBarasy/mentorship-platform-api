import Joi from 'joi';


// service-related validators
const uuid = Joi.string().guid({ version: ['uuidv4'] });

const timeHHMM = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/);

const ymdDate = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .messages({ 'string.pattern.base': 'date must be YYYY-MM-DD' });

const duration = Joi.number().integer().min(10).max(360);

export {
  uuid,
  ymdDate,
  timeHHMM,
  duration,

}
