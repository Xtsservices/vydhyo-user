const User = require('../models/usersModel');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();


exports.addAddress = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;
    console.log('req.body', req.body);
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
      status: 200,
      message:"success",
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

exports.getClinicAddress = async (req, res) => {
  try { 
    const userId = req.headers.userid;
    const userAddress = await UserAddress.find({userId});
    if (!userAddress || userAddress.length === 0) { 
      return res.status(404).json({
        status: 'fail',
        message: 'No clinic or hospital address found for this user',
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

exports.googleAddressSuggession = async (req, res) => {
  const { input } = req.query;

  if (!input) {
    return res.status(400).json({ message: 'Input is required' });
  }

  try {

    const _config = { googleApiKey: process.env.googleAPI };
    const autocompleteResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
      params: {
        input,
        key: _config.googleApiKey,
        components: 'country:IN'
      }
    });

    const placeId = autocompleteResponse.data.predictions[0].place_id;
    const detailsResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
      params: {
        place_id: placeId,
        key: _config.googleApiKey
      }
    });

    const result = detailsResponse.data.result;
    const location = result.geometry.location;
    const addressComponents = result.address_components;

    let street = '';
    let area = '';
    let city = '';
    let state = '';
    let pincode = '';
    let landmark = '';
    let phoneNumber = result.formatted_phone_number ? result.formatted_phone_number.replace(/\s+/g, '') : ''; // Remove spaces

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes('street_number')) {
        street = component.long_name;
      }
      if (types.includes('route')) {
        street += ` ${component.long_name}`;
      }
      if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        area = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
      if (types.includes('point_of_interest') || types.includes('establishment')) {
        landmark = component.long_name;
      }
    });

    const response = {
      lat: location.lat,
      lng: location.lng,
      street,
      area,
      city,
      state,
      pincode,
      landmark,
      phoneNumber
    };
    let responseObj = {
      prediction: autocompleteResponse.data.predictions,
      location: response

    }
    return await res.status(200).json({
      status: 'success',
      data: responseObj,
    });

    // return response;
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
