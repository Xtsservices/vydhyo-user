const Joi = require('joi');

// Validation schema for each medicine entry
const medInventoryValidationSchema = Joi.object({
  medName: Joi.string().trim().required().messages({
    'string.empty': 'Medicine name is required',
    'any.required': 'Medicine name is required'
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});


module.exports = medInventoryValidationSchema;
