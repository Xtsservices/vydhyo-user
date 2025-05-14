const { v4: uuidv4 } = require('uuid');
const Insurance = require('../models/insuranceModel');
const insuranceValidationSchema = require('../schemas/insuranceSchema');
const updateInsuranceValidationSchema = require('../schemas/updateInsuranceSchema');

// Create a new insurance
exports.addInsurance = async (req, res) => {
    try {
        const userId = req.body.userId || req.headers.userid;
        req.body.userId = userId;
        const { error } = insuranceValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                status: 'fail',
                message: error.details[0].message,
            });
        }
        req.body.createdBy = req.headers.userid;
        req.body.updatedBy = req.headers.userid;
        req.body.userId = userId;
        req.body.insuranceId = uuidv4().replace(/-/g, '');
        req.body.status = 'Active';
        req.body.createdAt = new Date();
        req.body.updatedAt = new Date();
        const userInsurance = await Insurance.create(req.body);
        return res.status(201).json({
            status: 'success',
            data: userInsurance
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// Get insurance by ID
exports.getInsuranceById = async (req, res) => {
    try {
        let insurenceQuery = {};
        if (req.query.insuranceId) {
            insurenceQuery = { insuranceId: req.query.insuranceId };
        } else {
            insurenceQuery = { userId: req.headers.userid };
        }

        const insurance = await Insurance.find(insurenceQuery);
        if (!insurance) {
            return res.status(404).json({
                status: 'fail',
                message: 'User insurance details not found',
            });
        }
        return res.status(200).json({
            status: 'success',
            data: insurance.length > 1 ? insurance : insurance[0],
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update insurance by ID
exports.updateInsurance = async (req, res) => {
    try {
        const { error } = updateInsuranceValidationSchema.validate(req.body);
        if (error) {
          return res.status(400).json({
            status: 'fail',
            message: error.details[0].message,
          });
        }
        req.body.updatedBy = req.headers.userid;
        req.body.updatedAt = new Date();
        const insuranceIdUpdate = await Insurance.findOneAndUpdate({ "insuranceId": req.body.insuranceId }, req.body, { new: true });
        if (!insuranceIdUpdate) {
          return res.status(404).json({
            status: 'fail',
            message: 'User insurance not found',
          });
        }
        return res.status(200).json({
          status: 'success',
          data: insuranceIdUpdate
        });
      } catch (error) {
        return res.status(500).json({
          status: 'fail',
          message: error.message,
        });
      }
};
