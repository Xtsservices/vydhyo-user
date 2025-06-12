const fs = require('fs');
const KycDetailsModel = require('../models/KycDetailsModel');
const kycDetailsSchema = require('../schemas/kycDetailsSchema');
const { encrypt, decrypt } = require('../utils/encryptData');
const { convertImageToBase64 } = require('../utils/imageService');

// Create KYC Details
exports.addKYCDetails = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;
    const { error } = kycDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail....',
        message: error.details[0].message,
      });
    }
    if (!req.files.panFile || req.files.panFile.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'PAN file is required' });
    }
    if (!req.files.aadharFile || req.files.aadharFile.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Aadhar file is required' });
    }
    if (req.files.panFile && req.files.panFile.length > 0) {
      const filePath = req.files.panFile[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.panAttachmentUrl) {
        req.body.panAttachmentUrl = {};
      }
      req.body.panAttachmentUrl.data = base64;
      req.body.panAttachmentUrl.mimeType = mimeType;
      // Clean up the temporary file
      fs.unlinkSync(filePath);
    }
    if (req.files.aadharFile && req.files.aadharFile.length > 0) {
      const filePath = req.files.aadharFile[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.aadharAttachmentUrl) {
        req.body.aadharAttachmentUrl = {};
      }
      req.body.aadharAttachmentUrl.data = base64;
      req.body.aadharAttachmentUrl.mimeType = mimeType;
      // Clean up the temporary file
      fs.unlinkSync(filePath);
    }

    const encryptedPanNumber = encrypt(req.body.panNumber);
    const encryptedAadharNumber = encrypt(req.body.aadharNumber);
    const kycDetails = {
      userId: req.body.userId,
      pan: {
        number: encryptedPanNumber,
        attachmentUrl: {
          data: req.body.panAttachmentUrl ? req.body.panAttachmentUrl.data : null,
          mimeType: req.body.panAttachmentUrl ? req.body.panAttachmentUrl.mimeType : null
        },
        status: 'pending',
      },
      aadhar: {
        number: encryptedAadharNumber,
        attachmentUrl: {
          data: req.body.aadharAttachmentUrl ? req.body.aadharAttachmentUrl.data : null,
          mimeType: req.body.aadharAttachmentUrl ? req.body.aadharAttachmentUrl.mimeType : null
        },
        status: 'pending',
      },
      kycVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // const saveKYCDetails = new KycDetailsModel(kycDetails);
    // const savedDetails = await saveKYCDetails.save();
    const savedDetails = await KycDetailsModel.findOneAndUpdate(
      { userId: req.body.userId },
      { $set: kycDetails },
      { new: true, upsert: true }
    );
    if (!savedDetails) {
      return res.status(400).json({ status: 'fail', error: 'Failed to save KYC details' });
    }
    return res.status(201).json({
      status: 'success',
      data: savedDetails
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', error: 'Failed to create KYC details' });
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
    kycDetails.pan.number = decrypt(kycDetails.pan.number);
    kycDetails.aadhar.number = decrypt(kycDetails.aadhar.number);
    return res.status(200).json({
      status: 'success',
      data: kycDetails,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC details' });
  }
};
