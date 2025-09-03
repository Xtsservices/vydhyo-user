const Joi = require('joi');

const bankDetailsSchema = Joi.object({
  bankDetails: Joi.object({
    accountNumber: Joi.string().min(6).max(20).required(),
    ifscCode: Joi.string()
  .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  .required()
  .message('Invalid IFSC code format. Expected: 4 letters, 0, and 6 alphanumeric characters'),

    // ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required(),
    bankName: Joi.string().required(),
    accountHolderName: Joi.string().required()
  }).required()
});

module.exports = bankDetailsSchema;
