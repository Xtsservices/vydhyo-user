const express = require('express');
const KycDetailsModel = require('../models/KycDetailsModel');
const { encrypt } = require('../utils/encryptData');

const router = express.Router();

// Create KYC Details
exports.addKYCDetails = async (req, res) => {
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
        const encryptedPanNumber = encrypt(req.body.panNumber);
        const encryptedAadhaarNumber = encrypt(req.body.aadhaarNumber);
        const kycDetails = {
            userId: req.body.userId,
            pan: {
                number: encryptedPanNumber,
                attachmentUrl: req.body.panAttachmentUrl || null,
                status: 'pending',
            },
            aadhaar: {
                number: encryptedAadhaarNumber,
                attachmentUrl: req.body.aadhaarAttachmentUrl || null,
                status: 'pending',
            },
            kycVerified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const saveKYCDetails = new KycDetailsModel(kycDetails);
        const savedDetails = await saveKYCDetails.save();
        if (!savedDetails) {
            return res.status(400).json({  status: 'fail', error: 'Failed to save KYC details' });
        }
        return res.status(201).json({
            status: 'success',
            data: savedDetails
        });
    } catch (error) {
        res.status(500).json({  status: 'fail', error: 'Failed to create KYC details' });
    }
};

// Read KYC Details by ID
exports.getKYCDetails = async (req, res) => {
    try {
        let kycQuery = {};
        if (req.query.userId) {
            kycQuery = { userId: req.query.userId };
        } else {
            kycQuery = { userId: req.headers.userid };
        }

        const kycDetails = await KycDetailsModel.findOne(kycQuery);
        if (!kycDetails) {
            return res.status(404).json({
                status: 'fail',
                message: 'KYC details not found',
            });
        }
        return res.status(200).json({
            status: 'success',
            data: kycDetails.length > 1 ? kycDetails : kycDetails[0],
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC details' });
    }
};

// Update KYC Details by ID
exports.updateKYCDetails = async (req, res) => {
    try {
        const encryptedData = encrypt(req.body);
        const updatedDetails = await KycDetailsModel.findByIdAndUpdate(
            req.params.id,
            encryptedData,
            { new: true }
        );
        if (!updatedDetails) {
            return res.status(404).json({ error: 'KYC details not found' });
        }
        res.status(200).json(updatedDetails);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update KYC details' });
    }
};

module.exports = router;