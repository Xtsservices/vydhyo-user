const { receptionistSchema } = require("../schemas/doctor_receptionistSchema");
const doctorReceptionist = require("../models/doctor_receptionistModel");
const { convertImageToBase64 } = require("../utils/imageService");
const fs = require("fs");
const Joi = require('joi');
const mongoose = require("mongoose");
const User = require("../models/usersModel");
const PatientTest = require("../models/patientTestModel");
const TestInventory = require("../models/testModel");
const Medicine = require("../models/medicineModel");
const MedInventory = require("../models/medInventoryModel");
const Users = require("../models/usersModel")
const patientTestModel = require("../models/patientTestModel");
const { createPayment } = require("../services/paymentServices");


exports.updateReceptionist = async (req, res) => {
  try {
    const { error } = receptionistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const receptionistData = await doctorReceptionist.findOneAndUpdate(
      { receptionistId: req.body.receptionistId },
      req.body,
      { new: true }
    );

    if (!receptionistData) {
      return res.status(404).json({
        status: "fail",
        message: "Receptionist not found",
      });
    }

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

    return res.status(200).json({
      status: "success",
      message: "Receptionist updated successfully",
      data: receptionistData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.fetchMyDoctors = async (req, res) => {
  try {
    const receptionistId = req.headers.userid;
    const doctors = await doctorReceptionist.aggregate([
      {
        $match: {
          receptionistId: receptionistId,
          status: "active",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorId",
          foreignField: "userId",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          receptionistId: 1,
          doctorId: 1,
          doctor: 1,
          doctor: {
            firstname: "$doctor.firstname",
            lastname: "$doctor.lastname",
            profilepic: "$doctor.profilepic",
          },
        },
      },
    ]);

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No active doctors found for this receptionist",
      });
    }

    return res.status(200).json({
      status: "success",
      data: doctors,
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.fetchMyDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    console.log("doctorId", doctorId);
    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({ error: "Invalid Doctor ID" });
    }

    // Find unique patientIds associated with the doctor from PatientTest and Medicine collections
    const testPatientIds = await PatientTest.find({
      doctorId: doctorId,
      isDeleted: false,
    }).distinct('patientId');

    const medicinePatientIds = await Medicine.find({
      doctorId: doctorId,
      isDeleted: false,
    }).distinct('patientId');

    // Combine and deduplicate patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds])];

    // If no patients found
    if (!patientIds || patientIds.length === 0) {
      return res.status(404).json({ message: "No patients found for this doctor" });
    }

    // Find all patients with the identified patientIds
    const patients = await User.find({
      role: "patient",
      userId: { $in: patientIds },
      isDeleted: false,
    }).select("firstname lastname email userId DOB gender bloodgroup mobile");

    // If no patients found in User collection
    if (!patients || patients.length === 0) {
      return res.status(404).json({ message: "No patients found for this doctor" });
    }

    // Fetch tests and medicines for each patient
    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        // Fetch tests for the patient
        const tests = await PatientTest.find({
          patientId: patient.userId,
          doctorId: doctorId,
          isDeleted: false,
        })
          .populate([
            {
              path: "testInventoryId",
              model: TestInventory,
              select: "testName testPrice",
            }
          ])
          .select("testName status createdAt testInventoryId labTestID _id");

        // Fetch medicines for the patient
        const medicines = await Medicine.find({
          patientId: patient.userId,
          doctorId: doctorId,
          isDeleted: false,
        })
          .populate({
            path: "medInventoryId",
            model: MedInventory,
            select: "medName price",
          })
          .select("medName quantity status createdAt medInventoryId pharmacyMedID _id");

        // Format patient data
        return {
          patientId: patient.userId,
          firstname: patient.firstname,
          lastname: patient.lastname,
          mobile:patient.mobile,
          email: patient.email,
          DOB: patient.DOB,
          gender: patient.gender,
          bloodgroup: patient.bloodgroup,
          tests: tests.map((test) => ({
            testId: test._id, // Include MongoDB _id
            labTestID: test.labTestID,
            testName: test.testName,
            status: test.status,
            price: test.testInventoryId ? test.testInventoryId.testPrice : null,
            createdAt: test.createdAt,
          })),
          medicines: medicines.map((medicine) => ({
            medicineId: medicine._id, // Include MongoDB _id
            pharmacyMedID: medicine.pharmacyMedID,
            medName: medicine.medName,
            quantity: medicine.quantity,
            status: medicine.status,
            price: medicine.medInventoryId ? medicine.medInventoryId.price : null,
            createdAt: medicine.createdAt,
          })),
        };
      })
    );

    // Return the response
    return res.status(200).json({
      success: true,
      data: patientDetails,
    });
  } catch (error) {
    console.error("Error fetching doctor patients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};


exports.totalBillPayFromReception = async (req, res) => {
  try {
    // Step 1: Validate input
    const { error } = Joi.object({
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      tests: Joi.array().items(
        Joi.object({
          testId: Joi.string().required(),
          price: Joi.number().min(0).allow(null),
          labTestID: Joi.string().allow(null),
          status:Joi.string().allow(null),
        })
      ).optional(),
      medicines: Joi.array().items(
        Joi.object({
          medicineId: Joi.string().required(),
          price: Joi.number().min(0).allow(null),
          quantity: Joi.number().min(0).allow(null),
          pharmacyMedID: Joi.string().allow(null),
          status:Joi.string().allow(null),
        })
      ).optional(),
    }).validate(req.body, { presence: 'optional' });

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }

    const { patientId, doctorId, tests = [], medicines = [], paymentStatus = 'paid', discount, discountType } = req.body;

    // Validate that at least one of tests or medicines is provided
    if (tests.length === 0 && medicines.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "At least one test or medicine must be provided",
      });
    }

    // Step 2: Verify patient exists
    const patientExists = await Users.findOne({ userId: patientId });
    if (!patientExists) {
      return res.status(404).json({
        status: "error",
        message: "Patient not found",
      });
    }

    // Step 3: Process tests
    const updatedTests = [];
    for (const test of tests) {
      const { testId, price, labTestID } = test;
      
      const updateData = {
        updatedAt: new Date(),
        status: price || price === 0 ? "completed" : "cancelled",
      };

      if (typeof price === "number" && price >= 0) {
        updateData.price = price;
      }

      const updated = await patientTestModel.findOneAndUpdate(
        { _id: testId, patientId, doctorId },
        { $set: updateData },
        { new: true }
      );

      if (updated) {
        updatedTests.push(updated);
        // Process payment for each test
        if (paymentStatus === 'paid' && updateData.status === 'completed' && labTestID) {
          const paymentResponse = await createPayment(req.headers.authorization, {
            userId: patientId,
            doctorId,
            labTestID,
            actualAmount: price,
            discount: discount || 0,
            discountType: discountType || 'percentage',
            paymentStatus: 'paid',
            paymentFrom: 'lab',
          });

          if (!paymentResponse || paymentResponse.status !== 'success') {
            return res.status(500).json({
              status: 'fail',
              message: `Payment failed for test ${testId}`,
            });
          }
        }
      }
    }

    // Step 4: Process medicines
    const updatedMedicines = [];
    for (const medicine of medicines) {
      const { medicineId, price, pharmacyMedID, quantity } = medicine;
      
      const updateData = {
        updatedAt: new Date(),
        status: price || price === 0 ? "completed" : "cancelled",
      };

      if (typeof price === "number" && price >= 0) {
        updateData.price = price;
      }

      const updated = await Medicine.findOneAndUpdate(
        { _id: medicineId, patientId, doctorId },
        { $set: updateData },
        { new: true }
      );

      if (updated) {
        updatedMedicines.push(updated);
        // Process payment for each medicine
        if (paymentStatus === 'paid' && updateData.status === 'completed' && pharmacyMedID) {
          const paymentResponse = await createPayment(req.headers.authorization, {
            userId: patientId,
            doctorId,
            pharmacyMedID,
            actualAmount: (price && quantity) ? price * quantity : 0,
            discount: discount || 0,
            discountType: discountType || 'percentage',
            paymentStatus: 'paid',
            paymentFrom: 'pharmacy',
          });

          if (!paymentResponse || paymentResponse.status !== 'success') {
            return res.status(500).json({
              status: 'fail',
              message: `Payment failed for medicine ${medicineId}`,
            });
          }
        }
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Payment processed and statuses updated",
      data: {
        patientId,
        doctorId,
        updatedTests,
        updatedMedicines,
      },
    });
  } catch (err) {
    console.error("Error in totalBillPayFromReception:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

