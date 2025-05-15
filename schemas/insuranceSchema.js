const Joi = require('joi');

const insuranceValidationSchema = Joi.object({
    userId: Joi.string().required(),
    provider: Joi.string().min(2).max(50).required(),
    policyNumber: Joi.string().min(2).max(50).required(),
    type: Joi.string()
        .valid('health', 'life')
        .required(),

    coverageAmount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': '"coverageAmount" must be a number',
            'number.positive': '"coverageAmount" must be a positive number',
            'any.required': '"coverageAmount" is required'
        }),

    premiumAmount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': '"premiumAmount" must be a number',
            'number.positive': '"premiumAmount" must be a positive number',
            'any.required': '"premiumAmount" is required'
        }),

    endDate: Joi.date().required()
        .messages({
            'date.base': '"endDate" must be a valid date',
            'any.required': '"endDate" is required'
        }),

    startDate: Joi.date()
        .less(Joi.ref('endDate'))
        .required()
        .messages({
            'date.base': '"startDate" must be a valid date',
            'date.less': '"startDate" must be before "endDate"',
            'any.required': '"startDate" is required'
        }),


    status: Joi.string()
        .required()
        .default('active'),
});

module.exports = insuranceValidationSchema;