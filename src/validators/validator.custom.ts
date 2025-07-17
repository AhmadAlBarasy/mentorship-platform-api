import Joi from 'joi';
import iso from 'iso-3166-1';

const validateContryAlpha3Code = (code: string, helpers: Joi.CustomHelpers<string>) => {
  code = code.toUpperCase();
  if (!iso.whereAlpha3(code)) {
    return helpers.error('string.alpha3Code');
  }
  return code;
};

const validateIANADatabaseTimeZone = (timeZone: string, helpers: Joi.CustomHelpers<string>) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return timeZone;
  } catch (e: any){
    return helpers.error('string.IANADataBaseTimeZone');
  }
}

export {
  validateContryAlpha3Code,
  validateIANADatabaseTimeZone,

};
