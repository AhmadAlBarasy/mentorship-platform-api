import { ObjectSchema } from 'joi';
import APIError from '../classes/APIError';
import { NextFunction, Request, Response } from 'express';
import RequestValidationSchemas from '../interfaces/RequestValidationSchemas';
import { RequestProperties } from '../interfaces/RequestProperties';

export default function requestValidator(options: RequestValidationSchemas) {

  const { bodySchema, paramsSchema } = options;

  return (req: Request, res: Response, next: NextFunction) => {

    // function to validate using Joi
    const validate = (toBeValidated: RequestProperties, schema: ObjectSchema) => {
      const { error } = schema.validate(toBeValidated, { abortEarly: true });
      if (error) {
        const errors: string = error.details.map((err) => err.message).join(', ');
        return next(new APIError(400, errors));
      }
    }

    if (bodySchema && req.body){
      validate(req.body, bodySchema);
    }
    if (paramsSchema && req.params){
      validate(req.params, paramsSchema);
    }
    next();
  }
};
