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
 pharmacyName: Joi.string().allow(null),
labName: Joi.string().allow(null, '').optional(),
 
   pharmacyRegistrationNo: Joi.when('pharmacyName', {
      is: Joi.string().trim().min(1).required(),
      then: Joi.string().required().messages({
        'any.required': 'Pharmacy registration number is required when pharmacyName is provided'
      }),
      otherwise: Joi.string().allow(null, '').optional(),
    }),
  labRegistrationNo: Joi.when('labName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Lab registration number is required when labName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  pharmacyGst: Joi.when('pharmacyName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Pharmacy GST number is required when pharmacyName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  labGst: Joi.when('labName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Lab GST number is required when labName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  pharmacyPan: Joi.when('pharmacyName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Pharmacy PAN number is required when pharmacyName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  labPan: Joi.when('labName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Lab PAN number is required when labName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  pharmacyAddress: Joi.when('pharmacyName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Pharmacy address is required when pharmacyName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  labAddress: Joi.when('labName', {
    is: Joi.string().trim().min(1).required(),
    then: Joi.string().required().messages({
      'any.required': 'Lab address is required when labName is provided'
    }),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  headerImage: Joi.string().allow(null, '').optional(),
  digitalSignature: Joi.string().allow(null, '').optional(),
  pharmacyHeader: Joi.string().allow(null, '').optional(),
  labHeader: Joi.string().allow(null, '').optional(),
});


module.exports = updateAddressValidationSchema;