const Joi = require('joi');

const approvalSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': '"userId" is required',
    'string.base': '"userId" must be a string',
  }),
  status: Joi.string().required().messages({
    'any.required': '"status" is required',
  }),
  rejectionReason: Joi.string().when('status', {
    is: 'rejected',
    then: Joi.required().messages({
      'any.required': '"rejectionReason" is required when status is rejected',
    }),
    otherwise: Joi.forbidden(),
  }),
});
module.exports =  approvalSchema;
