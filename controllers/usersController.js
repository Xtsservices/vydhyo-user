const fs = require('fs');
const Users = require('../models/usersModel');
const userSchema = require('../schemas/userSchema');
const { convertImageToBase64 } = require('../utils/imageService');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await Users.find({}, { refreshToken: 0 });
    res.status(200).json({
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
  // Define projection based on where the userId comes from
  const projection = req.query.userId ? { refreshToken: 0, __v: 0 } : { __v: 0 };
  try {
    const user = await Users.findOne({ "userId": userId }, projection);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: user
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
