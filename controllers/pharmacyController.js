const User = require('../models/usersModel');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');
const dotenv = require('dotenv');
const axios = require('axios');
const medInventoryModel = require('../models/medInventoryModel');
const medicineModel = require('../models/medicineModel');
const patientTestModel = require('../models/patientTestModel');
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

    // Validate input
    if (!patientId || !doctorId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Patient ID and Doctor ID are required'
      });
    }

    // Save medicines if provided
    const medicinePromises = medicines && medicines.length > 0
      ? medicines.map(medicine => {
          const { medInventoryId, medName, quantity } = medicine;
          return new medicineModel({
            medInventoryId: medInventoryId || null,
            medName,
            quantity,
            patientId,
            doctorId
          }).save();
        })
      : [];

    // Save tests if provided
    const testPromises = tests && tests.length > 0
      ? tests.map(test => {
          const { testName } = test;
          return new patientTestModel({
            testName,
            patientId,
            doctorId
          }).save();
        })
      : [];

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

exports.getAllMedicinesByDoctorID = async (req, res) => {
    try {
        const doctorId = req.headers.userid || req.query.userid;
    // const { doctorId } = req.query;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }
    const inventory = await medInventoryModel.find({ doctorId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

