const User = require('../models/usersModel');
const Joi = require('joi');

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');
const dotenv = require('dotenv');
const axios = require('axios');
const medInventoryModel = require('../models/medInventoryModel');
const medicineModel = require('../models/medicineModel');
const patientTestModel = require('../models/patientTestModel');
const { prescriptionValidationSchema } = require('../schemas/prescriptionValidation');
const { createPayment } = require('../services/paymentServices');
dotenv.config();


exports.addMedInventory = async (req, res) => {
  try {
    const { medName, price, quantity, doctorId } = req.body;

    // Validate required fields
    if (!medName || !price || !quantity || !doctorId) {
      return res.status(400).json({
        status: 'fail',
        message: 'All fields (medName, price, quantity, doctorId) are required'
      });
    }

    // Check for existing medicine with same medName and doctorId
    const existingMedicine = await medInventoryModel.findOne({
      medName: { $regex: `^${medName}$`, $options: 'i' }, // Case-insensitive match
      doctorId
    });

    if (existingMedicine) {
      return res.status(409).json({
        status: 'fail',
        message: 'Medicine already exists for this doctor'
      });
    }


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
    // Validate input using Joi
    const { error, value } = prescriptionValidationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    const { patientId, doctorId, medicines, tests } = value;

    // Save medicines if provided
    if (medicines && medicines.length > 0) {
      for (const medicine of medicines) {
        const { medInventoryId, medName, quantity } = medicine;
        await new medicineModel({
          medInventoryId: medInventoryId ? medInventoryId : null,
          medName,
          quantity,
          patientId,
          doctorId,
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        }).save();
      }
    }

    // Save tests if provided
    if (tests && tests.length > 0) {
      for (const test of tests) {
        const { testInventoryId, testName } = test;
        await new patientTestModel({
          testInventoryId: testInventoryId ? testInventoryId: null,
          testName,
          patientId,
          doctorId,
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        }).save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Prescription added successfully'
    });
  } catch (error) {
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Duplicate prescription entry detected'
      });
    }

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




exports.getAllPharmacyPatientsByDoctorID = async (req, res) => {
  try {
    const doctorId = req.query.userid || req.headers.userid;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Doctor ID is required'
      });
    }

    // Aggregate medicines by patientId for the given doctorId with price from MedInventory
    const patients = await medicineModel.aggregate([
      {
        $match: { doctorId, isDeleted: false } // Filter by doctorId and non-deleted records
      },
      {
        $lookup: {
          from: 'medinventories', // Collection name for MedInventory model
          localField: 'medInventoryId',
          foreignField: '_id',
          as: 'inventoryData'
        }
      },
      {
        $unwind: {
          path: '$inventoryData',
          preserveNullAndEmptyArrays: true // Keep medicines even if no matching inventory
        }
      },
      {
        $lookup: {
          from: 'users', // Collection name for Users model
          localField: 'patientId',
          foreignField: 'userId', // Assuming 'userId' is the field in the users collection
          as: 'userData'
        }
      },
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true // Keep medicines even if no matching user
        }
      },
      {
        $group: {
          _id: '$patientId', // Group by patientId
          patientName: {
            $first: {
              $concat: [
                { $ifNull: ['$userData.firstname', ''] },
                ' ',
                { $ifNull: ['$userData.lastname', ''] }
              ]
            }
          },
          doctorId: { $first: '$doctorId' }, // Include doctorId
          medicines: {
            $push: {
              _id: '$_id',
              medName: '$medName',
              price: { $ifNull: ['$inventoryData.price', null] },
              quantity: '$quantity',
              status: '$status',
              createdAt: '$createdAt'
            }
          }
        }
      },
      {
        $project: {
          patientId: '$_id',
          patientName: 1,
          doctorId: 1,
          medicines: 1, // Rename to match the desired key in the response
          _id: 0
        }
      },
      {
        $sort: { patientId: 1 } // Sort by patientId for consistent output
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: patients || []
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

exports.pharmacyPayment = async(req, res) => {

  try {
    const { patientId } = req.params;
    const {  doctorId, amount, discount = 0, discountType, paymentStatus } = req.body;

    // Validate required fields
    if (!patientId || !doctorId || !amount  || !paymentStatus) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields: patientId, userId, doctorId, amount, finalAmount, paymentStatus'
      });
    }

    let paymentResponse;

    // Process payment if paymentStatus is 'paid'
    if (paymentStatus === 'paid') {
      paymentResponse = await createPayment(req.headers.authorization, {
        userId:patientId,
        doctorId,
        actualAmount: amount,
        discount,
        discountType,
        paymentStatus: 'paid',
        paymentFrom: 'pharmacy',
      });

      if (!paymentResponse || paymentResponse.status !== 'success') {
        return res.status(500).json({
          status: 'fail',
          message: 'Payment failed.'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: paymentResponse || null,
      message: 'Pharmacy payment processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

exports.updatePatientMedicinePrice = async (req, res) => {
  try {
    // Validate request body
    const { error } = Joi.object({
      medicineId: Joi.string().required(),
      patientId: Joi.string().required(),
      price: Joi.number().min(0).required(),
      doctorId: Joi.string().required(),
    }).validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message),
      });
    }

    const { medicineId, patientId, price, doctorId } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Patient not found',
      });
    }

    // Check if medicine exists in Medicine model
    let medicine = await medicineModel.findOne({
      _id: medicineId,
      patientId,
      doctorId,
      isDeleted: false,
      status: { $ne: 'cancelled' }
    });

    if (!medicine) {
      return res.status(404).json({
        status: 'fail',
        message: 'Patient medicine record not found',
      });
    }

    // Check if medicine exists in MedInventory
    let medInventory = await medInventoryModel.findOne({
      medName: medicine.medName,
      doctorId
    });

    if (!medInventory) {
      // Create new inventory entry if it doesn't exist
      medInventory = await medInventoryModel.create({
        medName: medicine.medName,
        price,
        quantity: medicine.quantity,
        doctorId
      });

      // Update medicine with new medInventoryId
      await medicineModel.findByIdAndUpdate(
        medicineId,
        { $set: { medInventoryId: medInventory._id } },
        { new: true }
      );
    } else {
      // Update existing inventory price
      medInventory = await medInventoryModel.findByIdAndUpdate(
        medInventory._id,
        { $set: { price } },
        { new: true }
      );
    }

    // Update price in medicine record
    const updatedMedicine = await medicineModel.findByIdAndUpdate(
      medicineId,
      { 
        $set: { 
          price,
          updatedBy: req.user?._id,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Price updated successfully',
      data: {
        medicine: updatedMedicine,
        inventory: medInventory
      },
    });
  } catch (error) {
    console.error('Error updating medicine price:', error);
    
    // Handle specific errors
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'Duplicate medicine entry detected'
      });
    }

    return res.status(500).json({
      status: 'fail',
      message: 'Internal server error'
    });
  }
};