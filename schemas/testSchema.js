const Joi = require('joi');

const addTestSchema = Joi.object({
  testName: Joi.string()
    .required()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.base': 'Test name must be a string',
      'string.empty': 'Test name is required',
      'string.min': 'Test name must be at least 2 characters long',
      'string.max': 'Test name cannot exceed 100 characters',
    }),
  testPrice: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.base': 'Test price must be a number',
      'number.empty': 'Test price is required',
      'number.min': 'Test price cannot be negative',
    }),
  doctorId: Joi.string()
    .required()
    .trim()
    .messages({
      'string.base': 'Doctor ID must be a string',
      'string.empty': 'Doctor ID is required',
    }),
  createdAt: Joi.date()
    .optional()
    .messages({
      'date.base': 'Created at must be a valid date',
    }),
});

const getTestsSchema = Joi.string()
  .required()
  .trim()
  .messages({
    'string.base': 'Doctor ID must be a string',
    'string.empty': 'Doctor ID is required',
  });

module.exports = { addTestSchema, getTestsSchema };