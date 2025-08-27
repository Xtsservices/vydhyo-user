const { receptionistSchema, editReceptionistSchema } = require("../schemas/doctor_receptionistSchema");
const schedule = require("../models/scheduleModel");
const { patientSchema, patientUpdateSchema, patientSchemaFromPatientApp } = require("../schemas/ReceptionPatientSchema");
const Users = require("../models/usersModel");
const doctorReceptionist = require("../models/doctor_receptionistModel");
const { convertImageToBase64 } = require('../utils/imageService');
const Sequence = require("../sequence/sequenceSchema");
const sequenceConstant = require('../utils/constants')
const fs = require('fs');
const leave = require("../models/leaveModel");
const usersModel = require("../models/usersModel");
const addressModel =require("../models/addressModel");
const UserAddress = require('../models/addressModel');





// Get unique specializations of doctors from users table
exports.getDoctorSpecializations = async (req, res) => {
  try {
    // Use aggregation to get unique, trimmed, case-insensitive specializations
    const agg = await Users.aggregate([
      {
        $match: {
          role: 'doctor',
          status: 'approved',
          'specialization.name': { $nin: [null, ''] }
        }
      },
      {
        $project: {
          specialization: '$specialization.name'
        }
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$specialization' } } },
          specialization: { $first: '$specialization' }
        }
      },
      {
        $project: {
          _id: 0,
          specialization: 1
        }
      }
    ]);

    const specializations = agg.map(s => s.specialization);
    return res.status(200).json({
      status: 'success',
      data: specializations
    });
  } catch (error) {
    console.error('Error in getDoctorSpecializations:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};


// Get list of doctors filtered by specialization and city
exports.getDoctorsBySpecializationAndCity = async (req, res) => {
  try {
    const { specialization, city } = req.query;
    if (!specialization || !city) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both specialization and city are required as query parameters.'
      });
    }

    // Find all approved doctors with matching specialization (case-insensitive, trimmed, and only if string)
    const doctors = await Users.aggregate([
      {
        $match: {
          role: 'doctor',
          status: 'approved'
        }
      },
      {
        $addFields: {
          specializationType: { $type: '$specialization.name' }
        }
      },
      {
        $addFields: {
          specializationTrimmed: {
            $cond: [
              { $eq: ['$specializationType', 'string'] },
              { $trim: { input: '$specialization.name' } },
              '$specialization.name'
            ]
          },
          specializationLower: {
            $cond: [
              { $eq: ['$specializationType', 'string'] },
              { $toLower: { $trim: { input: '$specialization.name' } } },
              '$specialization.name'
            ]
          }
        }
      },
      {
        $match: {
          specializationLower: specialization.trim().toLowerCase()
        }
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'userId',
          foreignField: 'userId',
          as: 'addresses',
          pipeline: [
            {
              $match: {
                type: 'Clinic',
                status: 'Active'
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          cityType: { $type: '$addresses.city' }
        }
      },
      {
        $addFields: {
          cityTrimmed: {
            $cond: [
              { $eq: ['$cityType', 'string'] },
              { $trim: { input: '$addresses.city' } },
              '$addresses.city'
            ]
          },
          cityLower: {
            $cond: [
              { $eq: ['$cityType', 'string'] },
              { $toLower: { $trim: { input: '$addresses.city' } } },
              '$addresses.city'
            ]
          }
        }
      },
      {
        $match: {
          cityLower: city.trim().toLowerCase()
        }
      },
      // Group by userId to remove duplicates
      {
        $group: {
          _id: '$userId',
          doc: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$doc' }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          name: 1,
          specialization: '$specializationTrimmed',
          city: '$cityTrimmed',
          email: 1,
          mobile: 1,
          firstName: 1,
          lastName: 1,
          experience: 1,
          degree: 1,
          services: 1,
          bio: 1
        }
      }
    ]);

    if (doctors.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No doctors found matching the criteria.'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: doctors
    });
  } catch (error) {
    console.error('Error in getDoctorsBySpecializationAndCity:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};

exports.getDoctorClinicsByUserIdAndCity = async (req, res) => {
  try {
    const { userId, city } = req.query;
    if (!userId || !city) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both userId and city are required as query parameters.'
      });
    }
    // Find clinics for the doctor in the specified city (case-insensitive, trimmed)
    const clinics = await addressModel.aggregate([
      {
      $match: {
        userId: userId,
        type: 'Clinic',
        status: 'Active',
        city: { $exists: true, $ne: null, $ne: '' }
      }
      },
      {
      $addFields: {
        cityType: { $type: '$city' }
      }
      },
      {
      $addFields: {
        cityTrimmed: {
        $cond: [
          { $eq: ['$cityType', 'string'] },
          { $trim: { input: '$city' } },
          '$city'
        ]
        },
        cityLower: {
        $cond: [
          { $eq: ['$cityType', 'string'] },
          { $toLower: { $trim: { input: '$city' } } },
          '$city'
        ]
        }
      }
      },
      {
      $match: {
        cityLower: city.trim().toLowerCase()
      }
      },
      {
      $project: {
        userId: 1,
        addressId: 1,
        status: 1,
        type: 1,
        clinicName: 1
      }
      }
    ]);
    if (clinics.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No clinics found for this doctor in the specified city.'
      });
    }
    return res.status(200).json({
      status: 'success',
      data: clinics
    });
  } catch (error) {
    console.error('Error in getDoctorClinicsByUserIdAndCity:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};

// Get list of unique cities from addresses
exports.getCities = async (req, res) => {
  try {

    const citiesAgg = await UserAddress.aggregate([
      {
        $match: {
          type: 'Clinic',
          status: 'Active',
          city: { $ne: null, $ne: '', $exists: true }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.role': 'doctor',
          'user.status': 'approved'
        }
      },
      {
        $addFields: {
          cityTrimmed: { $trim: { input: '$city' } },
          cityLower: { $toLower: { $trim: { input: '$city' } } }
        }
      },
      {
        $group: {
          _id: '$cityLower',
          city: { $first: '$cityTrimmed' }
        }
      },
      { $sort: { city: 1 } }
    ]);

    const cities = citiesAgg.map(c => c.city);
    res.status(200).json({
      status: 'success',
      data: cities
    });
  } catch (err) {
    console.error('Error in getCities:', err);
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
};