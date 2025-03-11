import { ObjectSchema } from 'joi';

export default interface RequestValidationSchemas {
  bodySchema?: ObjectSchema,
  paramsSchema?: ObjectSchema,
};
