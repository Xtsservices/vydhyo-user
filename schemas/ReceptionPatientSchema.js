const Joi = require('joi');

const patientSchema = Joi.object({
  firstname: Joi.string().min(2).max(50).required(),
  lastname: Joi.string().max(50).allow(''),
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


const patientSchemaFromPatientApp = Joi.object({
  firstname: Joi.string().min(2).max(50).required(),
  lastname: Joi.string().min(1).max(50).required(),
  gender: Joi.string().required(),
  doctorId: Joi.string(),
  age: Joi.string(),
  DOB: Joi.string()
   .allow('')
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in DD-MM-YYYY format'),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message('Phone number must be between 10 to 15 digits')
    .required(),
    familyProvider: Joi.string().allow(null).optional(),
     relationship: Joi.string()
    .valid('parent', 'child', 'self', 'other')
    .default('self')
    .optional(),
});
// Joi schema for patient update (all fields optional)
const patientUpdateSchema = Joi.object({
  firstname: Joi.string().min(2).max(50),
  lastname: Joi.string().min(1).max(50),
  gender: Joi.string(),
  age: Joi.string(),
  DOB: Joi.string()
    .allow('')
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in DD-MM-YYYY format'),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message('Phone number must be between 10 to 15 digits'),
  familyProvider: Joi.string(),
  relationship: Joi.string().valid('parent', 'child', 'self', 'other'),
 
});

module.exports = {
  patientSchema,
  patientSchemaFromPatientApp,
  patientUpdateSchema
};