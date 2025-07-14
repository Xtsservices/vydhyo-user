const Joi = require('joi');

const patientSchema = Joi.object({
  firstname: Joi.string().min(2).max(50).required(),
  lastname: Joi.string().min(1).max(50).required(),
  gender: Joi.string().required(),
  age: Joi.string(),
  DOB: Joi.string()
   .allow('')
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in DD-MM-YYYY format'),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message('Phone number must be between 10 to 15 digits')
    .required(),
});

module.exports = {
  patientSchema
};