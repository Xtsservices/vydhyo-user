const Joi = require('joi');

const updateInsuranceValidationSchema = Joi.object({
    insuranceId: Joi.string().required(),
    provider: Joi.string().min(2).max(50).optional(),
    policyNumber: Joi.string().min(2).max(50).optional(),
    type: Joi.string()
        .valid('health', 'life')
        .optional(),

    coverageAmount: Joi.number()
        .positive()
        .optional()
        .messages({
            'number.base': '"coverageAmount" must be a number',
            'number.positive': '"coverageAmount" must be a positive number',
            'any.required': '"coverageAmount" is required'
        }),

    premiumAmount: Joi.number()
        .positive()
        .optional()
        .messages({
            'number.base': '"premiumAmount" must be a number',
            'number.positive': '"premiumAmount" must be a positive number',
            'any.required': '"premiumAmount" is required'
        }),

    endDate: Joi.date().optional()
        .messages({
            'date.base': '"endDate" must be a valid date',
            'any.required': '"endDate" is required'
        }),

    startDate: Joi.date()
        .less(Joi.ref('endDate'))
        .optional()
        .messages({
            'date.base': '"startDate" must be a valid date',
            'date.less': '"startDate" must be before "endDate"',
            'any.required': '"startDate" is required'
        }),


    status: Joi.string()
        .optional()
        .default('active'),
});

module.exports = updateInsuranceValidationSchema;