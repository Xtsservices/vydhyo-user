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
    if (medicines && medicines.length > 0) {
      for (const medicine of medicines) {
        const { medInventoryId, medName, quantity } = medicine;
        await new medicineModel({
          medInventoryId: medInventoryId || null,
          medName,
          quantity,
          patientId,
          doctorId
        }).save();
      }
    }

    // Save tests if provided
    if (tests && tests.length > 0) {
      for (const test of tests) {
        const { testName , testInventortId} = test;
        await new patientTestModel({
          testInventortId: testInventortId || null,
          testName,
          patientId,
          doctorId
        }).save();
      }
    }

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
        $match: { doctorId } // Filter by doctorId
      },
      {
        $lookup: {
          from: 'medinventories', // Collection name in MongoDB (lowercase, pluralized by Mongoose)
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
        $group: {
          _id: "$patientId", // Group by patientId
          medicines: {
            $push: {
              _id: "$_id",
              medName: "$medName",
              quantity: "$quantity",
              medInventoryId: "$medInventoryId",
              price: { $ifNull: ["$inventoryData.price", null] }, // Include price or null if not found
              createdAt: "$createdAt"
            }
          }
        }
      },
      {
        $sort: { _id: 1 } // Sort by patientId for consistent output
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

// exports.getAllPharmacyPatientsByDoctorID = async (req, res) => {
//   try {
//     const doctorId =  req.query.userid || req.headers.userid 

//     // Validate doctorId
//     if (!doctorId) {
//       return res.status(400).json({
//         status: 'fail',
//         message: 'Doctor ID is required'
//       });
//     }

//     // Aggregate medicines by patientId for the given doctorId
//     const patients = await medicineModel.aggregate([
//       {
//         $match: { doctorId } // Filter by doctorId
//       },
//       {
//         $group: {
//           _id: "$patientId", // Group by patientId
//           medicines: {
//             $push: {
//               _id: "$_id",
//               medName: "$medName",
//               quantity: "$quantity",
//               medInventoryId: "$medInventoryId",
//               createdAt: "$createdAt"
//             }
//           }
//         }
//       },
//       {
//         $sort: { _id: 1 } // Sort by patientId for consistent output
//       }
//     ]);

    

//     res.status(200).json({
//       status: 'success',
//       data: patients || []
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'fail',
//       message: error.message
//     });
//   }
// };