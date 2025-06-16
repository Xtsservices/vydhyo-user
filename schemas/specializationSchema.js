const Joi = require('joi');

const specializationSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  experience: Joi.number().required(),
  drgreeCertificate: Joi.object({
    mimeType: Joi.string().optional(),
    data: Joi.string().optional(),
  }).optional(),
  specializationCertificate: Joi.object({
    mimeType: Joi.string().optional(),
    data: Joi.string().optional(),
  }).optional(),
});

module.exports = specializationSchema;
