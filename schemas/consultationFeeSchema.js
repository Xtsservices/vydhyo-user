const Joi = require('joi');

const consultationFeeSchema = Joi.object({
  consultationModeFee: Joi.array().items(
    Joi.object({
      type: Joi.string().required(),
      fee: Joi.number().min(0).default(0),
      currency: Joi.string().default('INR')
    })
  ).min(1).required()
});

module.exports =  consultationFeeSchema;
