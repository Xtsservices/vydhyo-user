const User = require('../models/usersModel');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');
const dotenv = require('dotenv');
const axios = require('axios');
const medInventoryModel = require('../models/medInventoryModel');
const medicineModel = require('../models/medicineModel');
dotenv.config();


exports.addMedInventory = async (req, res) => {
  try {
    const { medName, price, quantity, doctorId } = req.body;

    // Create new medicine inventory entry
    const medInventory = new medInventoryModel({
      medName,
      price,
      quantity,
      doctorId
    });

    // Save to database
    await medInventory.save();
    
    res.status(201).json({
      success: true,
      data: medInventory,
      message: 'Medicine added to inventory successfully'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}


exports.addPrescription = async (req, res) => {
  try {
    const { patientId, doctorId, medicines, tests } = req.body;

    // Save medicines
    const medicinePromises = medicines.map(medicine => {
      const { medInventoryId, medName, quantity } = medicine;
      return new medicineModel({
        medInventoryId: medInventoryId || null,
        medName,
        quantity,
        patientId,
        doctorId
      }).save();
    });

    // Save tests
    // const testPromises = tests.map(test => {
    //   const { testName } = test;
    //   return new Lab({
    //     testName,
    //     patientId,
    //     doctorId
    //   }).save();
    // });

    await Promise.all([...medicinePromises, ...testPromises]);

    res.status(201).json({
      success: true,
      message: 'Prescription added successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
