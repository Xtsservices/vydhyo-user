const Joi = require('joi');

// Joi validation schema for medicines
const medicineValidationSchema = Joi.object({
  medInventoryId: Joi.string()
    .allow(null)
    .pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId')
    .messages({
      'string.pattern.name': 'medInventoryId must be a valid ObjectId or null'
    }),
  medName: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.empty': 'Medicine name is required',
      'string.min': 'Medicine name must be at least 1 character long',
      'string.max': 'Medicine name cannot exceed 100 characters'
    }),
  quantity: Joi.number()
    .required()
    .integer()
    .min(1)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 1'
    })
});

// Joi validation schema for tests
const testValidationSchema = Joi.object({
  testInventoryId: Joi.string()
    .allow(null)
    .pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId')
    .messages({
      'string.pattern.name': 'testInventoryId must be a valid ObjectId or null'
    }),
  testName: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'Test name is required',
      'string.min': 'Test name must be at least 2 characters long',
      'string.max': 'Test name cannot exceed 100 characters'
    })
});

// Joi validation schema for the entire prescription request
const prescriptionValidationSchema = Joi.object({
  patientId: Joi.string()
    .required()
    .trim()
    .messages({
      'string.empty': 'Patient ID is required'
    }),
  doctorId: Joi.string()
    .required()
    .trim()
    .messages({
      'string.empty': 'Doctor ID is required'
    }),
  medicines: Joi.array()
    .items(medicineValidationSchema)
    .optional()
    .min(0),
  tests: Joi.array()
    .items(testValidationSchema)
    .optional()
    .min(0)
});

module.exports = {
  medicineValidationSchema,
  testValidationSchema,
  prescriptionValidationSchema
};