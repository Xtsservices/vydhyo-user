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

    aadhaarNumber: Joi.string()
        .length(12)
        .pattern(/^[0-9]{12}$/)
        .required()
        .messages({
            'string.base': 'Aadhaar number must be a string.',
            'string.length': 'Aadhaar number must be exactly 12 digits.',
            'string.pattern.base': 'Aadhaar number must contain only digits.',
            'any.required': 'Aadhaar number is required.',
        }),

    kycVerified: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'KYC Verified must be true or false.',
        }),

    createdAt: Joi.date()
        .default(() => new Date())
        .messages({
            'date.base': 'CreatedAt must be a valid date.',
        }),

    updatedAt: Joi.date()
        .default(() => new Date())
        .messages({
            'date.base': 'UpdatedAt must be a valid date.',
        }),
});

module.exports = { kycDetailsSchema };
