const fs = require('fs');
const Users = require('../models/usersModel');
const userSchema = require('../schemas/userSchema');
const { convertImageToBase64 } = require('../utils/imageService');
const specializationSchema = require('../schemas/specializationSchema');
const consultationFeeSchema = require('../schemas/consultationFeeSchema');
const bankDetailsSchema = require('../schemas/bankDetailsSchema');
const { encrypt, decrypt } = require('../utils/encryptData');
const { userAggregation } = require('../queryBuilder/userAggregate');

exports.getAllUsers = async (req, res) => {
  try {
    let obj={}
    obj.status='inActive'

    if (!req.query?.type) {
      return res.status(400).json({ error: "'type' query parameter is required." });
    }
    if(req.query.status){
      obj.status=req.query?.status
    }
    obj.role=req.query?.type
    const users = await Users.find(obj, { refreshToken: 0 });
    if(users.length<1){
      return res.status(404).json({
        status: 'fail',
        message: "no data found",
      });
    }
   return res.status(200).json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.getUserById = async (req, res) => {
  const userId = req.query.userId || req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required in query or headers',
    });
  }

  try {
    const user = await Users.aggregate([userAggregation(userId, req.query.userId)]);
    if (!user || user.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: user[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.updateUser = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }
    const { email } = req.body;

    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    // Check if the email is already in use by another user
    const emailExists = await Users.findOne({ email });
    if (emailExists && emailExists.userId !== userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already in use by another user',
      });
    }
    // Update the user
    if (req.file) {
      const filePath = req.file.path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.profilepic) {
        req.body.profilepic = {};
      }
      req.body.profilepic.data = base64;
      req.body.profilepic.mimeType = mimeType;
      // Clean up the temporary file
      fs.unlinkSync(filePath);
    }
    req.body.updatedBy = req.headers.userid;
    req.body.updatedAt = new Date();
    const user = await Users.findOneAndUpdate({ "userId": userId }, req.body, { new: true });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: user,
    });
  }
  catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }
    const user = await Users.findOneAndUpdate({ "userId": userId }, { isDeleted: true }, { new: true });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.updateSpecialization = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = specializationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    if (!req.files.drgreeCertificate || req.files.drgreeCertificate.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'drgreeCertificate file is required' });
    }
    if (!req.files.specializationCertificate || req.files.specializationCertificate.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'specializationCertificate file is required' });
    }
    // Optional: Handle file uploads if you're sending certificates as files instead of base64
    if (req.files.drgreeCertificate && req.files.drgreeCertificate.length > 0) {
      const filePath = req.files.drgreeCertificate[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.drgreeCertificate) {
        req.body.drgreeCertificate = {};
      }
      req.body.drgreeCertificate.data = base64;
      req.body.drgreeCertificate.mimeType = mimeType;
      // Clean up the temporary file
      fs.unlinkSync(filePath);
    }
    if (req.files.specializationCertificate && req.files.specializationCertificate.length > 0) {
      const filePath = req.files.specializationCertificate[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.specializationCertificate) {
        req.body.specializationCertificate = {};
      }
      req.body.specializationCertificate.data = base64;
      req.body.specializationCertificate.mimeType = mimeType;
      // Clean up the temporary file
      fs.unlinkSync(filePath);
    }

    const updateFields = {
      specialization: req.body,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.updateConsultationModes = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = consultationFeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    const updateFields = {
      consultationModeFee: req.body.consultationModeFee,
      updatedAt: new Date(),
      updatedBy: userId
    };

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Consultation mode fee updated successfully',
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.updateBankDetails = async (req, res) => { 
  try {
    const userId = req.query.userId || req.headers.userid;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = bankDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    const bankDetails = {};
    bankDetails.accountNumber = encrypt(req.body.bankDetails.accountNumber);
    bankDetails.accountHolderName = encrypt(req.body.bankDetails.accountHolderName);
    bankDetails.ifscCode = req.body.bankDetails.ifscCode;
    bankDetails.bankName = req.body.bankDetails.bankName;

    const updateFields = {
      bankDetails,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Bank details updated successfully',
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};