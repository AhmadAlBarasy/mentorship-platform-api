import Joi from 'joi';
import iso from 'iso-3166-1';

const validDays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

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

const validateSessionTime = (sessionTime: number, helpers: Joi.CustomHelpers<number>) => {
  if (sessionTime % 5 !== 0) {
    return helpers.error('number.invalidSessionTime');
  }
  return sessionTime;
}

const validateDateKeys = (date: string, helpers: Joi.CustomHelpers<string>) => {
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
  return isValidDate
    ? date
    : helpers.error('string.pattern.base', { date });
}

export {
  validateContryAlpha3Code,
  validateIANADatabaseTimeZone,
  validateSessionTime,
  validateDateKeys,
  validDays,
};
