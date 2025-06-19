import Joi from 'joi';
import iso from 'iso-3166-1';

const validateContryAlpha3Code = (code: string, helpers: Joi.CustomHelpers<string>) => {
  code = code.toUpperCase();
  if (!iso.whereAlpha3(code)) {
    return helpers.error('string.alpha3Code');
  }
  return code;
};

export { validateContryAlpha3Code };
