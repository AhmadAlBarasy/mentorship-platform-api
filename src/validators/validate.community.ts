import Joi from 'joi';


const createCommunitySchema = Joi.object({
  id: Joi.string()
    .max(32)
    .required()
    .messages({
      'string.base': 'ID must be a string',
      'string.max': 'ID must be at most 32 characters long',
      'any.required': 'ID is required',
    }),

  name: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.max': 'Name must be at most 50 characters long',
      'any.required': 'Name is required',
    }),

  description: Joi.string()
    .max(1000)
    .required()
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description must be at most 1000 characters long',
      'any.required': 'Description is required',
    }),
});

const updateCommunitySchema = Joi.object({

  name: Joi.string()
    .max(50)
    .messages({
      'string.base': 'Name must be a string',
      'string.max': 'Name must be at most 50 characters long',
      'any.required': 'Name is required',
    }),

  description: Joi.string()
    .max(1000)
    .messages({
      'string.base': 'Description must be a string',
      'string.max': 'Description must be at most 1000 characters long',
      'any.required': 'Description is required',
    }),
}).min(1).message('At least 1 attribute should be provided to update');

const resolveJoinRequestSchema = Joi.object({

  id: Joi.string()
    .required()
    .length(36)
    .messages({
      'string.base': 'id must be a string',
      'string.length': 'id must be 36 characters long',
      'any.required': 'id is required',
    }),

  action: Joi.string()
    .required()
    .valid('accept', 'reject')
    .messages({
      'string.base': 'action must be a string',
      'any.required': 'action is required',
    }),

});

const communityIdSchema = Joi.object({
  id: Joi.string()
    .max(32)
    .required()
    .messages({
      'string.base': 'ID must be a string',
      'string.max': 'ID must be at most 32 characters long',
      'any.required': 'ID is required',
    }),
});

export {
  createCommunitySchema,
  updateCommunitySchema,
  resolveJoinRequestSchema,
  communityIdSchema,
};
