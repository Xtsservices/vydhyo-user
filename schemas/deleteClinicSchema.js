const Joi = require('joi');

// Validation schema for deleteClinicAddress
const deleteAddressValidationSchema = Joi.object({
  addressId: Joi.string().required().messages({
    'string.empty': 'Address ID is required',
    'any.required': 'Address ID is required'
  }),
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required in headers',
    'any.required': 'User ID is required in headers'
  })
});

module.exports = deleteAddressValidationSchema;
