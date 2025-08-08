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
const axios = require('axios'); 
const ePrescriptionModel = require("../models/ePrescriptionModel");

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

exports.fetchMyDoctorPatients2 = async (req, res) => {
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

    console.log("am------1")
    console.log("am------3",process.env.APPOINTMENTS_SERVICE_URL)
  let appointments = [];
    // Fetch appointment patientIds from appointments service
    const appointmentResponse = await axios.get(
      `${process.env.APPOINTMENTS_SERVICE_URL}/appointment/getAppointmentsByDoctor/${doctorId}`,
      {
        headers: {
          Authorization: req.headers.authorization, // Pass the JWT token
        },
      }
    );
     appointments = appointmentResponse.data.data || [];
    console.log("appointmentResponse------1",appointments[0])

    const appointmentPatientIds = appointmentResponse.data.data.map(
      (appointment) => appointment.userId
    );

    // console.log("appointmentPatientIds------1",appointmentPatientIds)

    // Combine and deduplicate patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds, ...appointmentPatientIds])];
    // console.log("patientIds------1",patientIds)

    // Combine and deduplicate patientIds
    // const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds])];

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

          // Fetch payments for the patient
        let payments = [];
        try {
          const paymentResponse = await axios.get(
            `${process.env.FINANCE_SERVICE_URL}/finance/getPaymentsByDoctorAndUser/${doctorId}`,
            {
              headers: {
                Authorization: req.headers.authorization,
              },
            }
          );
          payments = paymentResponse.data.data || [];
// console.log("paymentResponse====",payments)

        } catch (error) {
          console.error(`Error fetching payments for patient ${patient.userId}:`, error.response?.status, error.message);
          payments = [];
        }
        // console.log("appointments----",appointments)
        // Map appointments with payment details
        // const appointmentDetails = appointments.map((appointment) => {
        //   const payment = payments.find((p) => p.appointmentId === appointment.appointmentId);
        //   return {
        //     appointmentId: appointment._id,
        //     appointmentRefId: appointment.appointmentId,
        //     appointmentType: appointment.appointmentType,
        //     appointmentDate: appointment.appointmentDate,
        //     appointmentTime: appointment.appointmentTime,
        //     appointmentStatus: appointment.appointmentStatus,
        //     createdAt: appointment.createdAt,
        //     feeDetails: payment
        //       ? {
        //           actualAmount: payment.actualAmount,
        //           discount: payment.discount,
        //           discountType: payment.discountType,
        //           finalAmount: payment.finalAmount,
        //           paymentStatus: payment.paymentStatus,
        //           paidAt: payment.paidAt,
        //         }
        //       : null,
        //   };
        // });

        const patientAppointments = appointments.filter(
  (appt) => appt.userId === patient.userId
);

const appointmentDetails = patientAppointments.map((appointment) => {
  const payment = payments.find((p) => p.appointmentId === appointment.appointmentId);
  return {
    appointmentId: appointment._id,
    appointmentRefId: appointment.appointmentId,
    appointmentType: appointment.appointmentType,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    appointmentStatus: appointment.appointmentStatus,
    createdAt: appointment.createdAt,
    feeDetails: payment
      ? {
          actualAmount: payment.actualAmount,
          discount: payment.discount,
          discountType: payment.discountType,
          finalAmount: payment.finalAmount,
          paymentStatus: payment.paymentStatus,
          paidAt: payment.paidAt,
        }
      : null,
  };
});


// console.log("appointmentDetails====",appointmentDetails)
          
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
           appointments: appointmentDetails,
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
    console.log("Error fetching doctor patients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

exports.fetchMyDoctorPatients2 = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    console.log("doctorId", doctorId);

    if (!doctorId) {
      return res.status(400).json({ error: "Invalid Doctor ID" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Collect patientIds from test and medicine data
    const testPatientIds = await PatientTest.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    const medicinePatientIds = await Medicine.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    // Appointments
    let appointments = [];
    try {
      const appointmentResponse = await axios.get(
        `${process.env.APPOINTMENTS_SERVICE_URL}/appointment/getAppointmentsByDoctor/${doctorId}`,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      appointments = appointmentResponse.data.data || [];
    } catch (err) {
      console.error("Error fetching appointments:", err.message);
    }

    const appointmentPatientIds = appointments.map((appt) => appt.userId);

    // Merge and deduplicate all patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds, ...appointmentPatientIds])];

    console.log("Total unique patientIds:", patientIds.length, patientIds);

    if (!patientIds.length) {
      return res.status(200).json({
      success: true,
      data: [],
       pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0
        }
    });
      return res.status(404).json({ message: "No patients found for this doctor" });
    }

    


    // Fetch patient details
    const patients = await User.find({
      role: "patient",
      userId: { $in: patientIds },
      isDeleted: false,
    }).select("firstname lastname email userId DOB gender bloodgroup mobile age"); 

       console.log("Patients fetched from database:", patients.length)
    if (!patients.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients:0
        }
      });
          }

    // Build patient data
    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientId = patient.userId;

        // Fetch tests
        const tests = await PatientTest.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "testInventoryId",
            model: TestInventory,
            select: "testName testPrice",
          })
          .select("testName status createdAt testInventoryId labTestID _id");

        // Fetch medicines
        const medicines = await Medicine.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "medInventoryId",
            model: MedInventory,
            select: "medName price gst cgst",
          })
          .select("medName quantity status createdAt medInventoryId pharmacyMedID _id");

        // Skip patient if no tests and no medicines
        if (tests.length === 0 && medicines.length === 0) {
          console.log(`Skipping patient ${patientId}: No tests or medicines`);
          return null;
        }

        // Filter appointments for this patient
        const patientAppointments = appointments.filter(
          (appt) => appt.userId === patientId
        );

        // Fetch payments
        let payments = [];
        try {
          const paymentResponse = await axios.get(
            `${process.env.FINANCE_SERVICE_URL}/finance/getPaymentsByDoctorAndUser/${doctorId}`,
            {
              headers: {
                Authorization: req.headers.authorization,
              },
            }
          );
          payments = paymentResponse.data.data || [];
        } catch (error) {
          console.error(`Error fetching payments for patient ${patientId}:`, error.message);
        }

        // Build appointment details
        const appointmentDetails = patientAppointments.map((appointment) => {
          const payment = payments.find(
            (p) => p.appointmentId === appointment.appointmentId
          );
          return {
            appointmentId: appointment._id,
            appointmentRefId: appointment.appointmentId,
            appointmentType: appointment.appointmentType,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            appointmentStatus: appointment.appointmentStatus,
            createdAt: appointment.createdAt,
            addressId: appointment.addressId,
            feeDetails: payment
              ? {
                  actualAmount: payment.actualAmount,
                  discount: payment.discount,
                  discountType: payment.discountType,
                  finalAmount: payment.finalAmount,
                  paymentStatus: payment.paymentStatus,
                  paidAt: payment.paidAt,
                }
              : null,
          };
        });

        // Build base patient object
        const patientData = {
          patientId: patient.userId,
          firstname: patient.firstname,
          lastname: patient.lastname,
          mobile: patient.mobile,
          email: patient.email,
          DOB: patient.DOB,
          age: patient.age,
          gender: patient.gender,
          bloodgroup: patient.bloodgroup,
          appointments: appointmentDetails,
        };

        // Add tests if present
        if (tests.length > 0) {
          patientData.tests = tests.map((test) => ({
            testId: test._id,
            labTestID: test.labTestID,
            testName: test.testName,
            status: test.status,
            price: test.testInventoryId?.testPrice ?? null,
            createdAt: test.createdAt,
          }));
        }

        // Add medicines if present
        if (medicines.length > 0) {
          patientData.medicines = medicines.map((med) => ({
            medicineId: med._id,
            pharmacyMedID: med.pharmacyMedID,
            medName: med.medName,
            quantity: med.quantity,
            gst : med?.medInventoryId?.gst || 6,
            cgst : med?.medInventoryId?.cgst || 6,
            status: med.status,
            price: med.medInventoryId?.price ?? null,
            createdAt: med.createdAt,
          }));
        }

        return patientData;
      })
    );

    // Filter out patients with no data
    const filteredPatientDetails = patientDetails.filter(Boolean);
    const paginatedPatients = filteredPatientDetails.slice(skip, skip + limit);
    console.log("Patients after filtering:", filteredPatientDetails.length);


    return res.status(200).json({
      success: true,
      data: paginatedPatients,
       pagination: {
        page,
        limit,
        totalPages: Math.ceil(filteredPatientDetails.length / limit),
        totalPatients: filteredPatientDetails.length
      }
    });
  } catch (error) {
    console.error("Error fetching doctor patients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

exports.fetchMyDoctorPatients3 = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    console.log("doctorId", doctorId);

    if (!doctorId) {
      return res.status(400).json({ error: "Invalid Doctor ID" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Collect patientIds from test and medicine data
    const testPatientIds = await PatientTest.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    const medicinePatientIds = await Medicine.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    // Appointments
    let appointments = [];
    try {
      const appointmentResponse = await axios.get(
        `${process.env.APPOINTMENTS_SERVICE_URL}/appointment/getAppointmentsByDoctor/${doctorId}`,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      appointments = appointmentResponse.data.data || [];
    } catch (err) {
      console.error("Error fetching appointments:", err.message);
    }

    const appointmentPatientIds = appointments.map((appt) => appt.userId);

    // Merge and deduplicate all patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds, ...appointmentPatientIds])];

    console.log("Total unique patientIds:", patientIds.length, patientIds);

    if (!patientIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch patient details
    const patients = await User.find({
      role: "patient",
      userId: { $in: patientIds },
      isDeleted: false,
    }).select("firstname lastname email userId DOB gender bloodgroup mobile age");

    console.log("Patients fetched from database:", patients.length);
    if (!patients.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch prescriptions to map prescriptionId to appointmentId
    const prescriptions = await ePrescriptionModel.find({
      doctorId,
      userId: { $in: patientIds },
    }).select("prescriptionId appointmentId");

    // Create a map of prescriptionId to appointmentId
    const prescriptionToAppointmentMap = {};
    prescriptions.forEach((prescription) => {
      prescriptionToAppointmentMap[prescription.prescriptionId] = prescription.appointmentId;
    });

    // Build patient data
    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientId = patient.userId;

        // Fetch tests and group by prescriptionId
        const tests = await PatientTest.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "testInventoryId",
            model: TestInventory,
            select: "testName testPrice",
          })
          .select("testName status createdAt testInventoryId labTestID _id prescriptionId");

        // Fetch medicines and group by prescriptionId
        const medicines = await Medicine.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "medInventoryId",
            model: MedInventory,
            select: "medName price gst cgst",
          })
          .select("medName quantity status createdAt medInventoryId pharmacyMedID _id prescriptionId");

        // Skip patient if no tests and no medicines
        if (tests.length === 0 && medicines.length === 0) {
          console.log(`Skipping patient ${patientId}: No tests or medicines`);
          return null;
        }

        // Filter appointments for this patient
        const patientAppointments = appointments.filter((appt) => appt.userId === patientId);

        // Fetch payments
        let payments = [];
        try {
          const paymentResponse = await axios.get(
            `${process.env.FINANCE_SERVICE_URL}/finance/getPaymentsByDoctorAndUser/${doctorId}`,
            {
              headers: {
                Authorization: req.headers.authorization,
              },
            }
          );
          payments = paymentResponse.data.data || [];
        } catch (error) {
          console.error(`Error fetching payments for patient ${patientId}:`, error.message);
        }

        // Group tests and medicines by appointment
        const appointmentDetails = patientAppointments.map((appointment) => {
          const appointmentId = appointment.appointmentId;

          // Find tests for this appointment via prescriptionId
          const appointmentTests = tests.filter((test) => {
            const testPrescriptionId = test.prescriptionId;
            return prescriptionToAppointmentMap[testPrescriptionId] === appointmentId;
          }).map((test) => ({
            testId: test._id,
            labTestID: test.labTestID,
            testName: test.testName,
            status: test.status,
            price: test.testInventoryId?.testPrice ?? null,
            createdAt: test.createdAt,
          }));

          // Find medicines for this appointment via prescriptionId
          const appointmentMedicines = medicines.filter((medicine) => {
            const medicinePrescriptionId = medicine.prescriptionId;
            return prescriptionToAppointmentMap[medicinePrescriptionId] === appointmentId;
          }).map((medicine) => ({
            medicineId: medicine._id,
            pharmacyMedID: medicine.pharmacyMedID,
            medName: medicine.medName,
            quantity: medicine.quantity,
            gst: medicine?.medInventoryId?.gst || 6,
            cgst: medicine?.medInventoryId?.cgst || 6,
            status: medicine.status,
            price: medicine.medInventoryId?.price ?? null,
            createdAt: medicine.createdAt,
          }));

          // Find payment for this appointment
          const payment = payments.find((p) => p.appointmentId === appointmentId);

          return {
            appointmentId: appointment._id,
            appointmentRefId: appointment.appointmentId,
            appointmentType: appointment.appointmentType,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            appointmentStatus: appointment.appointmentStatus,
            createdAt: appointment.createdAt,
            addressId: appointment.addressId,
            tests: appointmentTests,
            medicines: appointmentMedicines,
            feeDetails: payment
              ? {
                  actualAmount: payment.actualAmount,
                  discount: payment.discount,
                  discountType: payment.discountType,
                  finalAmount: payment.finalAmount,
                  paymentStatus: payment.paymentStatus,
                  paidAt: payment.paidAt,
                }
              : null,
          };
        });

        // Filter out appointments with no tests and no medicines
        const filteredAppointmentDetails = appointmentDetails.filter(
          (appt) => appt.tests.length > 0 || appt.medicines.length > 0
        );

        // Skip patient if no relevant appointments
        if (filteredAppointmentDetails.length === 0) {
          console.log(`Skipping patient ${patientId}: No appointments with tests or medicines`);
          return null;
        }

        // Build base patient object
        const patientData = {
          patientId: patient.userId,
          firstname: patient.firstname,
          lastname: patient.lastname,
          mobile: patient.mobile,
          email: patient.email,
          DOB: patient.DOB,
          age: patient.age,
          gender: patient.gender,
          bloodgroup: patient.bloodgroup,
          appointments: filteredAppointmentDetails,
        };

        return patientData;
      })
    );

    // Filter out patients with no data
    const filteredPatientDetails = patientDetails.filter(Boolean);
    const paginatedPatients = filteredPatientDetails.slice(skip, skip + limit);
    console.log("Patients after filtering:", filteredPatientDetails.length);

    return res.status(200).json({
      success: true,
      data: paginatedPatients,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(filteredPatientDetails.length / limit),
        totalPatients: filteredPatientDetails.length,
      },
    });
  } catch (error) {
    console.error("Error fetching doctor patients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
exports.fetchMyDoctorPatients4 = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    console.log("doctorId", doctorId);

    if (!doctorId) {
      return res.status(400).json({ error: "Invalid Doctor ID" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Collect patientIds from test and medicine data
    const testPatientIds = await PatientTest.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    const medicinePatientIds = await Medicine.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    // Appointments
    let appointments = [];
    try {
      const appointmentResponse = await axios.get(
        `${process.env.APPOINTMENTS_SERVICE_URL}/appointment/getAppointmentsByDoctor/${doctorId}`,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      appointments = appointmentResponse.data.data || [];
    } catch (err) {
      console.error("Error fetching appointments:", err.message);
    }

    const appointmentPatientIds = appointments.map((appt) => appt.userId);

    // Merge and deduplicate all patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds, ...appointmentPatientIds])];

    console.log("Total unique patientIds:", patientIds.length, patientIds);

    if (!patientIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch patient details
    const patients = await User.find({
      role: "patient",
      userId: { $in: patientIds },
      isDeleted: false,
    }).select("firstname lastname email userId DOB gender bloodgroup mobile age");

    console.log("Patients fetched from database:", patients.length);
    if (!patients.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch prescriptions to map prescriptionId to appointmentId
    const prescriptions = await ePrescriptionModel.find({
      doctorId,
      userId: { $in: patientIds },
    }).select("prescriptionId appointmentId createdAt");

    // Create a map of prescriptionId to appointmentId
    const prescriptionToAppointmentMap = {};
    prescriptions.forEach((prescription) => {
      prescriptionToAppointmentMap[prescription.prescriptionId] = prescription.appointmentId;
    });

    // Build patient data
    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientId = patient.userId;

        // Fetch tests and group by prescriptionId
        const tests = await PatientTest.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "testInventoryId",
            model: TestInventory,
            select: "testName testPrice",
          })
          .select("testName status createdAt testInventoryId labTestID _id prescriptionId");

        // Fetch medicines and group by prescriptionId
        const medicines = await Medicine.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "medInventoryId",
            model: MedInventory,
            select: "medName price gst cgst",
          })
          .select("medName quantity status createdAt medInventoryId pharmacyMedID _id prescriptionId");

        // Filter appointments for this patient
        const patientAppointments = appointments.filter((appt) => appt.userId === patientId);

        // Fetch payments
        let payments = [];
        try {
          const paymentResponse = await axios.get(
            `${process.env.FINANCE_SERVICE_URL}/finance/getPaymentsByDoctorAndUser/${doctorId}`,
            {
              headers: {
                Authorization: req.headers.authorization,
              },
            }
          );
          payments = paymentResponse.data.data || [];
        } catch (error) {
          console.error(`Error fetching payments for patient ${patientId}:`, error.message);
        }

        // Create a patient entry for each appointment
        const appointmentPatientEntries = patientAppointments.map((appointment) => {
          const appointmentId = appointment.appointmentId;

          // Find tests for this appointment via prescriptionId
          const appointmentTests = tests.filter((test) => {
            const testPrescriptionId = test.prescriptionId;
            return prescriptionToAppointmentMap[testPrescriptionId] === appointmentId;
          }).map((test) => ({
            testId: test._id,
            labTestID: test.labTestID,
            testName: test.testName,
            status: test.status,
            price: test.testInventoryId?.testPrice ?? null,
            createdAt: test.createdAt,
          }));

          // Find medicines for this appointment via prescriptionId
          const appointmentMedicines = medicines.filter((medicine) => {
            const medicinePrescriptionId = medicine.prescriptionId;
            return prescriptionToAppointmentMap[medicinePrescriptionId] === appointmentId;
          }).map((medicine) => ({
            medicineId: medicine._id,
            pharmacyMedID: medicine.pharmacyMedID,
            medName: medicine.medName,
            quantity: medicine.quantity,
            gst: medicine?.medInventoryId?.gst || 6,
            cgst: medicine?.medInventoryId?.cgst || 6,
            status: medicine.status,
            price: medicine.medInventoryId?.price ?? null,
            createdAt: medicine.createdAt,
          }));

          // Find payment for this appointment
          const payment = payments.find((p) => p.appointmentId === appointmentId);

          // Get prescription createdAt for sorting
          const prescriptionCreatedAt = appointmentToPrescriptionCreatedAtMap[appointmentId] || appointment.createdAt;
          // Create patient entry for this appointment
          return {
            patientId: patient.userId,
            firstname: patient.firstname,
            lastname: patient.lastname,
            mobile: patient.mobile,
            email: patient.email,
            DOB: patient.DOB,
            age: patient.age,
            gender: patient.gender,
            bloodgroup: patient.bloodgroup,
            appointments: [
              {
                appointmentId: appointment._id,
                appointmentRefId: appointment.appointmentId,
                appointmentType: appointment.appointmentType,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                appointmentStatus: appointment.appointmentStatus,
                createdAt: appointment.createdAt,
                addressId: appointment.addressId,
                tests: appointmentTests,
                medicines: appointmentMedicines,
                feeDetails: payment
                  ? {
                      actualAmount: payment.actualAmount,
                      discount: payment.discount,
                      discountType: payment.discountType,
                      finalAmount: payment.finalAmount,
                      paymentStatus: payment.paymentStatus,
                      paidAt: payment.paidAt,
                    }
                  : null,
              },
            ],
            tests: appointmentTests, // For compatibility with frontend
            medicines: appointmentMedicines, // For compatibility with frontend
          };
        });

        return appointmentPatientEntries;
      })
    );

    // Flatten the array of patient entries
    const flattenedPatientDetails = patientDetails.flat();

    // Option 1: Exclude appointments with no tests or medicines (current behavior)
    const filteredPatientDetails = flattenedPatientDetails.filter(
      (patient) => patient.tests.length > 0 || patient.medicines.length > 0
    );

    // Option 2: Include all appointments (uncomment to enable)
    // const filteredPatientDetails = flattenedPatientDetails;

    const paginatedPatients = filteredPatientDetails.slice(skip, skip + limit);
    console.log("Patients after filtering:", filteredPatientDetails.length);

    return res.status(200).json({
      success: true,
      data: paginatedPatients,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(filteredPatientDetails.length / limit),
        totalPatients: filteredPatientDetails.length,
      },
    });
  } catch (error) {
    console.error("Error fetching doctor patients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

exports.fetchMyDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    console.log("doctorId", doctorId);

    if (!doctorId) {
      return res.status(400).json({ error: "Invalid Doctor ID" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Collect patientIds from test and medicine data
    const testPatientIds = await PatientTest.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    const medicinePatientIds = await Medicine.find({
      doctorId,
      isDeleted: false,
    }).distinct("patientId");

    // Appointments
    let appointments = [];
    try {
      const appointmentResponse = await axios.get(
        `${process.env.APPOINTMENTS_SERVICE_URL}/appointment/getAppointmentsByDoctor/${doctorId}`,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      appointments = appointmentResponse.data.data || [];
    } catch (err) {
      console.error("Error fetching appointments:", err.message);
    }

    const appointmentPatientIds = appointments.map((appt) => appt.userId);

    // Merge and deduplicate all patientIds
    const patientIds = [...new Set([...testPatientIds, ...medicinePatientIds, ...appointmentPatientIds])];

    console.log("Total unique patientIds:", patientIds.length, patientIds);

    if (!patientIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch patient details
    const patients = await User.find({
      role: "patient",
      userId: { $in: patientIds },
      isDeleted: false,
    }).select("firstname lastname email userId DOB gender bloodgroup mobile age");

    console.log("Patients fetched from database:", patients.length);
    if (!patients.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalPatients: 0,
        },
      });
    }

    // Fetch prescriptions to map prescriptionId to appointmentId and get createdAt
    const prescriptions = await ePrescriptionModel.find({
      doctorId,
      userId: { $in: patientIds },
    }).select("prescriptionId appointmentId createdAt");

    // Create a map of appointmentId to latest prescription createdAt
    const appointmentToPrescriptionCreatedAtMap = {};
    prescriptions.forEach((prescription) => {
      const existing = appointmentToPrescriptionCreatedAtMap[prescription.appointmentId];
      if (!existing || new Date(prescription.createdAt) > new Date(existing)) {
        appointmentToPrescriptionCreatedAtMap[prescription.appointmentId] = prescription.createdAt;
      }
    });

    // Create a map of prescriptionId to appointmentId
    const prescriptionToAppointmentMap = {};
    prescriptions.forEach((prescription) => {
      prescriptionToAppointmentMap[prescription.prescriptionId] = prescription.appointmentId;
    });

    // Build patient data
    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientId = patient.userId;

        // Fetch tests and group by prescriptionId
        const tests = await PatientTest.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "testInventoryId",
            model: TestInventory,
            select: "testName testPrice",
          })
          .select("testName status createdAt testInventoryId labTestID _id prescriptionId");

        // Fetch medicines and group by prescriptionId
        const medicines = await Medicine.find({
          patientId,
          doctorId,
          isDeleted: false,
        })
          .populate({
            path: "medInventoryId",
            model: MedInventory,
            select: "medName price gst cgst",
          })
          .select("medName quantity status createdAt medInventoryId pharmacyMedID _id prescriptionId");

        // Filter appointments for this patient
        const patientAppointments = appointments.filter((appt) => appt.userId === patientId);

        // Fetch payments
        let payments = [];
        try {
          const paymentResponse = await axios.get(
            `${process.env.FINANCE_SERVICE_URL}/finance/getPaymentsByDoctorAndUser/${doctorId}`,
            {
              headers: {
                Authorization: req.headers.authorization,
              },
            }
          );
          payments = paymentResponse.data.data || [];
        } catch (error) {
          console.error(`Error fetching payments for patient ${patientId}:`, error.message);
        }

        // Create a patient entry for each appointment
        const appointmentPatientEntries = patientAppointments.map((appointment) => {
          const appointmentId = appointment.appointmentId;

          // Find tests for this appointment via prescriptionId
          const appointmentTests = tests.filter((test) => {
            const testPrescriptionId = test.prescriptionId;
            return prescriptionToAppointmentMap[testPrescriptionId] === appointmentId;
          }).map((test) => ({
            testId: test._id,
            labTestID: test.labTestID,
            testName: test.testName,
            status: test.status,
            price: test.testInventoryId?.testPrice ?? null,
            createdAt: test.createdAt,
          }));

          // Find medicines for this appointment via prescriptionId
          const appointmentMedicines = medicines.filter((medicine) => {
            const medicinePrescriptionId = medicine.prescriptionId;
            return prescriptionToAppointmentMap[medicinePrescriptionId] === appointmentId;
          }).map((medicine) => ({
            medicineId: medicine._id,
            pharmacyMedID: medicine.pharmacyMedID,
            medName: medicine.medName,
            quantity: medicine.quantity,
            gst: medicine?.medInventoryId?.gst || 6,
            cgst: medicine?.medInventoryId?.cgst || 6,
            status: medicine.status,
            price: medicine.medInventoryId?.price ?? null,
            createdAt: medicine.createdAt,
          }));

          // Find payment for this appointment
          const payment = payments.find((p) => p.appointmentId === appointmentId);

          // Get prescription createdAt for sorting
          const prescriptionCreatedAt = appointmentToPrescriptionCreatedAtMap[appointmentId] || appointment.createdAt;

          // Create patient entry for this appointment
          return {
            patientId: patient.userId,
            firstname: patient.firstname,
            lastname: patient.lastname,
            mobile: patient.mobile,
            email: patient.email,
            DOB: patient.DOB,
            age: patient.age,
            gender: patient.gender,
            bloodgroup: patient.bloodgroup,
            prescriptionCreatedAt: prescriptionCreatedAt, // For sorting
            appointments: [
              {
                appointmentId: appointment._id,
                appointmentRefId: appointment.appointmentId,
                appointmentType: appointment.appointmentType,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                appointmentStatus: appointment.appointmentStatus,
                createdAt: appointment.createdAt,
                addressId: appointment.addressId,
                tests: appointmentTests,
                medicines: appointmentMedicines,
                feeDetails: payment
                  ? {
                      actualAmount: payment.actualAmount,
                      discount: payment.discount,
                      discountType: payment.discountType,
                      finalAmount: payment.finalAmount,
                      paymentStatus: payment.paymentStatus,
                      paidAt: payment.paidAt,
                    }
                  : null,
              },
            ],
            tests: appointmentTests, // For compatibility with frontend
            medicines: appointmentMedicines, // For compatibility with frontend
          };
        });

        return appointmentPatientEntries;
      })
    );

    // Flatten the array of patient entries
    const flattenedPatientDetails = patientDetails.flat();

    // Sort by prescription createdAt in descending order (newest first)
    flattenedPatientDetails.sort((a, b) => {
      const dateA = new Date(a.prescriptionCreatedAt);
      const dateB = new Date(b.prescriptionCreatedAt);
      return dateB - dateA; // Descending order
    });

    // Option 1: Exclude appointments with no tests or medicines (current behavior)
    const filteredPatientDetails = flattenedPatientDetails.filter(
      (patient) => patient.tests.length > 0 || patient.medicines.length > 0
    );

    // Option 2: Include all appointments (uncomment to enable)
    // const filteredPatientDetails = flattenedPatientDetails;

    const paginatedPatients = filteredPatientDetails.slice(skip, skip + limit);
    console.log("Patients after filtering:", filteredPatientDetails.length);

    return res.status(200).json({
      success: true,
      data: paginatedPatients,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(filteredPatientDetails.length / limit),
        totalPatients: filteredPatientDetails.length,
      },
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

