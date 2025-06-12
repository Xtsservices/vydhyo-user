const Joi = require('joi');

const profilePicSchema = Joi.object({
  mimeType: Joi.string()
    .pattern(/^image\/(png|jpeg|jpg|gif)$/)
    .required()
    .messages({
      'string.pattern.base': 'mimeType must be a valid image MIME type like image/png or image/jpeg'
    }),
  data: Joi.string()
    .base64({ paddingRequired: true })
    .required()
    .messages({
      'string.base64': 'data must be a valid base64-encoded string'
    })
});
const userSchema = Joi.object({
  firstname: Joi.string().min(2).max(50).optional(),
  lastname: Joi.string().min(1).max(50).optional(),
  email: Joi.string().email().lowercase().trim().max(100).optional(),
  specialization: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required()
    })
  ).optional(),
  experience: Joi.number().optional(),
  language: Joi.string().valid('en', 'hi', 'tel').default('en'),
  relationship: Joi.string().valid('parent', 'child', 'self', 'other').default('self'),
  profilepic: profilePicSchema.optional(),
  gender: Joi.string().allow(null, '').optional(),
  DOB: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in YYYY-MM-DD format').required(),
  bloodgroup: Joi.string()
    .valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    .allow(null, '')
    .optional(),
  maritalStatus: Joi.string()
    .valid('single', 'married', 'divorced', 'widowed')
    .allow(null, '')
    .optional()
});



module.exports = userSchema;
