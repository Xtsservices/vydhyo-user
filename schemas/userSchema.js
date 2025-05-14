const Joi = require('joi');

const userSchema = Joi.object({
  firstname: Joi.string().min(2).max(50).optional(),
  lastname: Joi.string().min(1).max(50).optional(),
  email: Joi.string().email().lowercase().trim().max(100).optional(),

  language: Joi.string().valid('en', 'hi', 'tel').default('en'),
  relationship: Joi.string().valid('parent', 'child', 'self', 'other').default('self'),
  profilepic: Joi.string().allow(null, '').default(''),
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
