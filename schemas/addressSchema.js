const Joi = require('joi');

const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

const addressJoiSchema = Joi.object({
    status: Joi.string().valid('Active', 'InActive').default('Active'),
    userId: Joi.string().required(),
    type: Joi.string().required(),
    clinicName: Joi.string().required(),
    mobile: Joi.string().allow(null),
    address: Joi.string().allow(null),
    city: Joi.string().allow(null),
    state: Joi.string().allow(null),
    country: Joi.string().allow(null),
    pincode: Joi.string().allow(null),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),

    location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0])
    }).default(),

    startTime: Joi.when('type', {
        is: Joi.valid('Clinic', 'Hospital'),
        then: Joi.string().pattern(timeRegex).required().messages({
            'string.pattern.base': 'startTime must be in HH:mm format',
            'any.required': 'startTime is required for Clinic or Hospital'
        }),
        otherwise: Joi.string().pattern(timeRegex).allow(null)
    }),

    endTime: Joi.when('type', {
        is: Joi.valid('Clinic', 'Hospital'),
        then: Joi.string().pattern(timeRegex).required().messages({
            'string.pattern.base': 'endTime must be in HH:mm format',
            'any.required': 'endTime is required for Clinic or Hospital'
        }),
        otherwise: Joi.string().pattern(timeRegex).allow(null)
    }),

}).custom((value, helpers) => {
    // Time validation
    if (['Clinic', 'Hospital'].includes(value.type)) {
        const toMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        if (toMinutes(value.startTime) >= toMinutes(value.endTime)) {
            return helpers.message('startTime must be before endTime');
        }
    }

    return value;
}, 'Custom time validation');

module.exports = addressJoiSchema;
