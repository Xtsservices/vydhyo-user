const Joi = require('joi');

const kycDetailsSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'string.base': 'User ID must be a string.',
      'any.required': 'User ID is required.',
    }),

  panNumber: Joi.string()
    .length(10)
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .required()
    .messages({
      'string.base': 'PAN number must be a string.',
      'string.length': 'PAN number must be exactly 10 characters long.',
      'string.pattern.base': 'PAN number must follow the format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F).',
      'any.required': 'PAN number is required.',
    }),


  aadharNumber: Joi.string()
    .length(12)
    .pattern(/^[0-9]{12}$/)
    .required()
    .messages({
      'string.base': 'Aadhar number must be a string.',
      'string.length': 'Aadhar number must be exactly 12 digits.',
      'string.pattern.base': 'Aadhar number must contain only digits.',
      'any.required': 'Aadhar number is required.',
    })
});

module.exports = kycDetailsSchema;
