const Joi = require("joi");

// Joi schema for medication
const medicationSchema = Joi.object({
  medName: Joi.string().trim().required().messages({
    'string.empty': 'Medicine name is required',
    'any.required': 'Medicine name is required',
  }),
  medicineType: Joi.string()
    .valid('Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Other')
    .required()
    .messages({
      'string.empty': 'Medicine type is required',
      'any.required': 'Medicine type is required',
      'any.only': 'Medicine type must be one of: Tablet, Capsule, Syrup, Injection, Ointment, Other',
    }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
  dosage: Joi.string().trim().required().messages({
    'string.empty': 'Dosage is required',
    'any.required': 'Dosage is required',
  }),
  duration: Joi.number().integer().min(1).required().messages({
    'number.base': 'Duration must be a number',
    'number.min': 'Duration must be at least 1',
    'any.required': 'Duration is required',
  }),
  frequency: Joi.string()
    .valid('1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1', 'SOS', 'Other')
    .required()
    .messages({
      'string.empty': 'Frequency is required',
      'any.required': 'Frequency is required',
      'any.only': 'Frequency must be one of: 1-0-0, 0-1-0, 0-0-1, 1-1-0, 1-0-1, 0-1-1, 1-1-1, SOS, Other',
    }),
  timings: Joi.array()
    .items(
      Joi.string().valid(
        'Before Breakfast',
        'After Breakfast',
        'Before Lunch',
        'After Lunch',
        'Before Dinner',
        'After Dinner',
        'Bedtime'
      )
    )
    .min(1)
    .max(4)
    .required()
    .messages({
      'array.base': 'Timings must be an array',
      'array.min': 'At least one timing is required',
      'array.max': 'Timings cannot exceed 4 items',
      'any.required': 'Timings are required',
      'any.only': 'Timings must be one of: Before Breakfast, After Breakfast, Before Lunch, After Lunch, Before Dinner, After Dinner, Bedtime',
    }),
  notes: Joi.string().trim().allow('').optional().messages({
    'string.base': 'Notes must be a string',
  }),
  medInventoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'medInventoryId must be a valid MongoDB ObjectId',
    }),
  status: Joi.string().valid('active', 'inactive').default('active').messages({
    'any.only': 'Status must be either active or inactive',
  }),
});

// Joi schema for template
const templateSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Template name is required',
    'any.required': 'Template name is required',
  }),
  userId: Joi.string().required().messages({
    'string.empty': 'userId is required',
    'any.required': 'userId is required',
  }),
  createdBy: Joi.string().required().messages({
    'string.empty': 'createdBy is required',
    'any.required': 'createdBy is required',
  }),
  medications: Joi.array()
    .items(medicationSchema)
    .min(1)
    .required()
    .messages({
      'array.base': 'Medications must be an array',
      'array.min': 'At least one medication is required',
      'any.required': 'Medications are required',
    }),
  status: Joi.string().valid('active', 'inactive').default('active').messages({
    'any.only': 'Status must be either active or inactive',
  }),
});

module.exports = {
  templateSchema,
 
};