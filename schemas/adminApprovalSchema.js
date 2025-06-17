const Joi = require('joi');

const approvalSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': '"userId" is required',
    'string.base': '"userId" must be a string',
  }),
  status: Joi.string().required().messages({
    'any.required': '"status" is required',
  }),
});
module.exports =  approvalSchema;
