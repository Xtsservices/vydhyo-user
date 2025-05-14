const Joi = require('joi');

const addressValidationSchema = Joi.object({
    userId: Joi.string().required(),
    countrycode: Joi.string().default('+91'),
    status: Joi.string().valid('Active', 'InActive'),
    address: Joi.string().min(2).max(250).required(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().min(2).max(50).required(),
    country: Joi.string().min(2).max(50).required(),
    pincode: Joi.string().length(6).required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
});


module.exports = addressValidationSchema;
