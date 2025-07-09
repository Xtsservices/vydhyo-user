const Joi = require('joi');

const updateAddressValidationSchema = Joi.object({
    addressId: Joi.string().required(),
    type: Joi.string().optional(),
  clinicName: Joi.string().min(2).max(250).optional(),
  mobile: Joi.string().allow(null).optional(),
    countrycode: Joi.string().default('+91').optional(),
    status: Joi.string().valid('Active', 'InActive').optional(),
    address: Joi.string().min(2).max(250).optional(),
    city: Joi.string().min(2).max(50).optional(),
    state: Joi.string().min(2).max(50).optional(),
    country: Joi.string().min(2).max(50).optional(),
    pincode: Joi.string().length(6).optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0])
  }).optional(),
  status: Joi.string().valid('Active', 'InActive').optional(),
});


module.exports = updateAddressValidationSchema;