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

const receptionistSchema = Joi.object({
  firstname: Joi.string().min(2).max(50).required(),
  lastname: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().lowercase().trim().max(100).optional(),
  experience: Joi.number().optional(),
  profilepic: profilePicSchema.optional(),
  gender: Joi.string().required(),
  DOB: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in DD-MM-YYYY format')
    .required(),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message('Phone number must be between 10 to 15 digits')
    .required(),
    role: Joi.string().required(),
     access: Joi.array()
    .default([])
});

// Joi schema for editing receptionist (all fields optional except userId)
const editReceptionistSchema = Joi.object({
  userId: Joi.string().required(), // Required to identify the receptionist
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  email: Joi.string().email().lowercase().trim().max(100).optional(),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message('Phone number must be between 10 to 15 digits')
    .optional(),
  gender: Joi.string().optional(),
  DOB: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .message('DOB must be in DD-MM-YYYY format')
    .optional(),
  profilepic: Joi.object({
    mimeType: Joi.string().optional(),
    data: Joi.string().optional()
  }).optional(),
  access: Joi.array()
    .optional()
});

module.exports = {
  receptionistSchema,
  editReceptionistSchema
};