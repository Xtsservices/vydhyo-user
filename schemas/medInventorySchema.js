const Joi = require('joi');

// Validation schema for each medicine entry
const medInventoryValidationSchema = Joi.object({
  medName: Joi.string().trim().required().messages({
    'string.empty': 'Medicine name is required',
    'any.required': 'Medicine name is required'
  }),
   dosage: Joi.string().trim().required().messages({
    'string.empty': 'Dosage is required',
    'any.required': 'Dosage is required'
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
  }),
   gst: Joi.number().min(0).max(100).default(6).messages({
    'number.base': 'GST must be a number',
    'number.min': 'GST cannot be negative',
    'number.max': 'GST cannot exceed 100',
  }),
  cgst: Joi.number().min(0).max(100).default(6).messages({
    'number.base': 'CGST must be a number',
    'number.min': 'CGST cannot be negative',
    'number.max': 'CGST cannot exceed 100',
  }),
});


module.exports = medInventoryValidationSchema;
