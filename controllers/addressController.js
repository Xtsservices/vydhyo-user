const User = require('../models/usersModel');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');

exports.addAddress = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;
    const { error } = addressValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    req.body.createdBy = req.headers.userid;
    req.body.updatedBy = req.headers.userid;
    req.body.userId = userId;
    req.body.addressId = uuidv4().replace(/-/g, '');
    req.body.status = 'Active';
    req.body.createdAt = new Date();
    req.body.updatedAt = new Date();
    const userAddress = await UserAddress.create(req.body);
    return res.status(201).json({
      status: 'success',
      data: userAddress
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.getAddress = async (req, res) => {
  try {
    let addressQuery = {};
    if (req.query.addressId) {
      addressQuery = { addressId: req.query.addressId };
    } else {
      addressQuery = { userId: req.headers.userid };
    }

    const userAddress = await UserAddress.find(addressQuery);
    if (!userAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'User address not found',
      });
    }
    return res.status(200).json({
      status: 'success',
      data: userAddress.length > 1 ? userAddress : userAddress[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.updateAddress = async (req, res) => {
  try {
    const { error } = updateAddressValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    req.body.updatedBy = req.headers.userid;
    req.body.updatedAt = new Date();
    const userAddress = await UserAddress.findOneAndUpdate({ "addressId": req.body.addressId }, req.body, { new: true });
    if (!userAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'User address not found',
      });
    }
    return res.status(200).json({
      status: 'success',
      data: userAddress
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}