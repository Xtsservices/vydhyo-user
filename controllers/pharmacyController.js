const User = require("../models/usersModel");
const Joi = require("joi");
// const Users = require("../models/usersModel");
const Users = require("../models/usersModel");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const UserAddress = require("../models/addressModel");
const addressValidationSchema = require("../schemas/addressSchema");
const updateAddressValidationSchema = require("../schemas/updateAddressSchema");
const dotenv = require("dotenv");
const axios = require("axios");
const medInventoryModel = require("../models/medInventoryModel");
const medicineModel = require("../models/medicineModel");
const patientTestModel = require("../models/patientTestModel");
const MedInventoryModel = require("../models/medInventoryModel");
const MedicineyModel = require("../models/medicineModel");
const {
  prescriptionValidationSchema,
} = require("../schemas/prescriptionValidation");
const { createPayment } = require("../services/paymentServices");
const PREFIX_SEQUENCE = require("../utils/constants");
const Counter = require("../sequence/sequenceSchema");
dotenv.config();
const multer = require("multer");
const xlsx = require("xlsx");
const medInventoryValidationSchema = require("../schemas/medInventorySchema");
const fs = require("fs");
const eprescriptionsModel = require("../models/ePrescriptionModel");
const {
  fetchPrescriptionFromDatabase,
  uploadAttachmentToS3,
} = require("../utils/attachmentService");

const { unlink } = require('fs').promises;
// import fs from 'fs';
// import path from 'path';
// import FormData from 'form-data';

// Configure Multer for file uploads
const upload2 = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (file && allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed."));
    }
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

exports.addMedInventory = async (req, res) => {
  try {
    const { medName, price, quantity, doctorId } = req.body;

    // Validate required fields
    if (!medName || !price || !quantity || !doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "All fields (medName, price, quantity, doctorId) are required",
      });
    }

    // Check for existing medicine with same medName and doctorId
    const existingMedicine = await medInventoryModel.findOne({
      medName: { $regex: `^${medName}$`, $options: "i" }, // Case-insensitive match
      doctorId,
    });

    if (existingMedicine) {
      return res.status(409).json({
        status: "fail",
        message: "Medicine already exists for this doctor",
      });
    }

    // Create new medicine inventory entry
    const medInventory = new medInventoryModel({
      medName,
      price,
      quantity,
      doctorId,
    });

    // Save to database
    await medInventory.save();

    res.status(201).json({
      success: true,
      data: medInventory,
      message: "Medicine added to inventory successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Helper function to check duplicates
const checkDuplicates = async (doctorId, medNames) => {
  const existing = await medInventoryModel
    .find({
      doctorId,
      medName: { $in: medNames.map((name) => new RegExp(`^${name}$`, "i")) },
    })
    .lean();
  return new Set(existing.map((med) => med.medName.toLowerCase()));
};

exports.addMedInventoryBulk = [
  // Middleware to handle file upload
  upload.single("file"),
  async (req, res) => {
    try {
      // Get doctorId from body or headers
      const doctorId = req.query.doctorId || req.headers.userid;
      if (!doctorId) {
        return res.status(400).json({
          status: "fail",
          message: "Doctor ID is required in body or headers",
        });
      }

      // Check if file is provided
      if (!req.file) {
        return res.status(400).json({
          status: "fail",
          message: "Excel file is required",
        });
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, {
        header: ["medName", "price", "quantity"],
      });

      if (data.length <= 1) {
        // First row is headers
        return res.status(400).json({
          status: "fail",
          message: "Excel file contains no data",
        });
      }

      // Validate headers
      const expectedHeaders = ["medName", "price", "quantity"];
      const firstRow = data[0];
      if (!expectedHeaders.every((header) => header in firstRow)) {
        return res.status(400).json({
          status: "fail",
          message: "Excel file must have headers: medName, price, quantity",
        });
      }

      // Remove header row
      data.shift();

      // Validate and process each row
      const errors = [];
      const medicinesToInsert = [];
      const existingMedicines = await checkDuplicates(
        doctorId,
        data.map((row) => row.medName)
      );

      const processedMedNames = new Set();

      for (const [index, row] of data.entries()) {
        // Override doctorId from body/headers
        const medicine = { ...row, doctorId };

        // Validate row
        const { error } = medInventoryValidationSchema.validate(row, {
          abortEarly: false,
        });

        if (error) {
          errors.push({
            row: index + 2, // Excel row number (1-based, plus header)
            message: error.details.map((detail) => detail.message).join("; "),
          });
          continue;
        }

        // Check for duplicates (database and within file)
        const medNameLower = medicine.medName.toLowerCase();

        if (
          existingMedicines.has(medNameLower) ||
          processedMedNames.has(medNameLower)
        ) {
          errors.push({
            row: index + 2,
            message: `Medicine '${medicine.medName}' already exists for doctor ${doctorId}`,
          });
          continue;
        }

        medicinesToInsert.push({
          medName: medicine.medName,
          price: medicine.price,
          quantity: medicine.quantity,
          doctorId: doctorId,
          createdAt: new Date(),
        });
        processedMedNames.add(medNameLower);
      }

      // Insert valid medicines
      let insertedMedicines = [];
      if (medicinesToInsert.length > 0) {
        insertedMedicines = await medInventoryModel.insertMany(
          medicinesToInsert,
          { ordered: false }
        );
      }

      // Build response
      const response = {
        status: "success",
        message:
          medicinesToInsert.length > 0
            ? "Medicines added successfully"
            : "No valid medicines to add",
        data: {
          insertedCount: insertedMedicines.length,
          insertedMedicines,
          errors: errors.length > 0 ? errors : undefined,
        },
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error("Error in addMedInventoryBulk:", error.stack);
      return res.status(500).json({
        status: "fail",
        message: "Error adding medicine inventory",
        error: error.message,
      });
    }
  },
];


exports.addattach = async (req, res) => {
  let fileDeleted = false; // Track if file was deleted

  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!req.file.mimetype.includes("pdf")) {
      await unlink(req.file.path).catch((err) => console.error("Cleanup error:", err));
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    const { prescriptionId } = req.body;
    if (!prescriptionId) {
      await unlink(req.file.path).catch((err) => console.error("Cleanup error:", err));
      return res.status(400).json({ error: "Prescription ID is missing" });
    }

  
    // Read file from disk
    const fileBuffer = await fs.promises.readFile(req.file.path);

    // Upload new attachment to S3
    const newAttachment = await uploadAttachmentToS3(
      fileBuffer,
      req.file.originalname,
      "prescriptions",
      518400,
      req.file.mimetype
    );
    if (!newAttachment?.fileURL) {
      throw new Error("Failed to retrieve S3 file URL");
    }

  //  let whatsappmediaID= await this.uploadImageToAirtelAPI(req.file.path)

  //  let sendWhatsQrAppMessage = await this.sendWhatsQrAppMessage(req.body,whatsappmediaID)


    // Clean up the temporary file
    await unlink(req.file.path);
    fileDeleted = true; // Mark file as deleted

    // Update prescription in database
    const result = await eprescriptionsModel.updateOne(
      { prescriptionId: prescriptionId }, // Use _id if that's the primary key
      { $set: { prescriptionAttachment: newAttachment.fileURL } } // Store only fileURL
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Prescription not found" });
    }

   

    res.status(200).json({
      message: "Attachment uploaded successfully",
      attachment: newAttachment,
      result
    });
  } catch (error) {
    // Clean up file if not already deleted
    if (req.file && req.file.path && !fileDeleted) {
      try {
        await unlink(req.file.path);
        fileDeleted = true;
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }

    console.error("Error in addattach:", error);
    res.status(500).json({
      error: "Failed to upload attachment",
      details: error.message
    });
  }
};

exports.uploadImageToAirtelAPI = async (filePath) => {
  const url = 'https://iqwhatsapp.airtel.in:443/gateway/airtel-xchange/whatsapp-content-manager/v1/media';
  const username = 'world_tek'; 
  const password = 'T7W9&w3396Y"'; 

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  // Create FormData for the API request
  const formData = new FormData();
  formData.append('customerId', 'KWIKTSP_CO_j3og3FCEU1TsAz1EO7wQ');
  formData.append('phoneNumber', '918686078782');
  formData.append('mediaType', 'IMAGE');
  formData.append('messageType', 'TEMPLATE_MESSAGE');
  
  try {
    // Construct path to file in upload folder
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Check if directory exists, if not create it
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created directory: ${uploadDir}`);
    }
    
    const fullPath = filePath || path.join(uploadDir, 'default.png');
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      
      // Use a default image instead - create a simple 1x1 pixel PNG
      const defaultImagePath = path.join(uploadDir, 'default.png');
      
      // Create a simple pixel image if it doesn't exist
      if (!fs.existsSync(defaultImagePath)) {
        // This is a minimal valid PNG file (1x1 transparent pixel)
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        fs.writeFileSync(defaultImagePath, minimalPng);
        console.log(`Created default image: ${defaultImagePath}`);
      }
      
      formData.append('file', fs.createReadStream(defaultImagePath));
      console.log(`Using default image instead: ${defaultImagePath}`);
    } else {
      formData.append('file', fs.createReadStream(fullPath));
      console.log(`Using original image: ${fullPath}`);
    }

    console.log('Uploading image to Airtel API...');  

    const response = await axios.post(url, formData, {
      headers: {
        Authorization: `Basic ${auth}`,
        ...formData.getHeaders(),
      },
    });


    // Return the media ID from the response
    if (response.data && response.data.id) {
      // If upload was successful, remove the file to avoid cluttering
      // Only delete if it's not the default image
      if (fullPath !== path.join(uploadDir, 'default.png')) {
        try {
         // fs.unlinkSync(fullPath);
        } catch (deleteError) {
          // Continue execution even if file deletion fails
        }
      }
      return response.data.id;
    } else {
      throw new Error('❌ Media ID not returned by Airtel API.');
    }
  } catch (error) {
    console.error('❌ Error uploading image to Airtel API:', error.response?.data || error.message);
    throw error;
  }
};


exports.sendWhatsQrAppMessage = async (order, whatsappuploadedid) => {
  const userId = order.userId; // Extract userId from the order object
  const user = await User.findOne({ where: { id: userId } }); // Fetch user details from the User table
  const phoneNumber = user?.mobile; // Get the phone number from the user details

  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "User"; // Default to 'User' if name doesn't exist

  let OrderNo = "NV".concat(order.id.toString());
  let toNumber = "91".concat(phoneNumber);


    sendImageWithAttachment(
      toNumber,
      "01jzzt1qq204fz496stragvr8x",
      [name,doctorfirstname,doctorlastname],
      [],
      whatsappuploadedid
    );


  // const url = 'https://iqwhatsapp.airtel.in/gateway/airtel-xchange/basic/whatsapp-manager/v1/session/send/media';
  // const username = 'world_tek';
  // const password = 'T7W9&w3396Y"'; // Replace with actual password

  // const auth = Buffer.from(`${username}:${password}`).toString('base64');

  // const payload = {
  //   sessionId: generateUuid(),
  //   to: "91".concat(phoneNumber), // Recipient number
  //   from: "918686078782", // Dynamically set the sender number
  //   message: {
  //     text: 'Your Order is Placed', // Message text
  //   },
  //   mediaAttachment: {
  //       "type": "IMAGE",
  //       "id": "https://welfarecanteen.in/public/Naval.jpg"
  //   }
  // };
  // console.log('WhatsApp Payload:', payload);
  // console.log('WhatsApp URL:', url);
  // try {
  //   const response = await axios.post(url, payload, {
  //     headers: {
  //       Authorization: `Basic ${auth}`,
  //       'Content-Type': 'application/json',
  //     },
  //   });

  //    console.log('Message sent successfully:', response.data);
  // } catch (error: any) {
  //   console.error('Error sending message:', error.response?.data || error.message);
  //   throw error;
  // }
};


exports.sendImageWithAttachment = async (
  to,
  templateId,
  variables,
  payload,
  whatsappuploadedid = null
) => {
  const url = 'https://iqwhatsapp.airtel.in/gateway/airtel-xchange/basic/whatsapp-manager/v1/template/send';
  const username = 'world_tek'; // Replace with your Airtel username
  const password = 'T7W9&w3396Y"'; // Replace with your Airtel password

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
  console.log("to number",to)
  // Payload for the API
  const payloadData = {
    templateId,
    to,
    from: '918686078782', // Replace with your Airtel-registered number
    message: {
      headerVars: [],
      variables,
      payload,
    },
    ...(whatsappuploadedid && {
      mediaAttachment: {
        type: "IMAGE",
        id: whatsappuploadedid
      }
    })
  };

  try {
    const response = await axios.post(url, payloadData, { headers });
  } catch (error) {
    console.error('❌ Error sending message with attachment:', error.response?.data || error.message);
    throw error;
  }
};

//originnal
exports.addPrescription = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const { error, value } = prescriptionValidationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors: errorMessages,
      });

    }
  
    const {
      userId,
      doctorId,
      appointmentId,
      addressId,
      patientInfo,
      vitals,
      diagnosis,
      advice,
    } = value;

    // Generate unique prescriptionId
    const prescriptionCounter = await Counter.findByIdAndUpdate(
      { _id: PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.EPRESCRIPTION_MODEL },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const prescriptionId =
      PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.SEQUENCE.concat(
        prescriptionCounter.seq
      );

    // Save medicines if provided
    if (diagnosis?.medications && diagnosis.medications.length > 0) {
      for (const medicine of diagnosis.medications) {
      
        const {
          id: medInventoryId,
          medName,
          quantity,
            medicineType,
          dosage,
          duration,
          timings,
          frequency,
        } = medicine;
console.log("medicine====",medicine)

// Check if medInventory exists for this medName and doctorId
        let inventory = await medInventoryModel.findOne({
          medName,
          doctorId,
        });

        // Use provided medInventoryId or existing inventory _id
        let finalMedInventoryId = medInventoryId ? mongoose.Types.ObjectId(medInventoryId) : null;
        if (!inventory && medInventoryId) {
          inventory = await medInventoryModel.findById(medInventoryId);
        }

        const medCounter = await Counter.findByIdAndUpdate(
          { _id: PREFIX_SEQUENCE.MEDICINES_SEQUENCE.MEDICINES_MODEL },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const pharmacyMedID =
          PREFIX_SEQUENCE.MEDICINES_SEQUENCE.SEQUENCE.concat(medCounter.seq);
console.log("===========97=====",pharmacyMedID)
        await new medicineModel({
          medInventoryId: finalMedInventoryId || (inventory ? inventory._id : null),
          // medInventoryId: medInventoryId ? medInventoryId : null,
          medName,
          quantity,
            medicineType,
          dosage,
          duration,
          timings: Array.isArray(timings) ? timings.join(", ") : timings, // Convert array to string
          frequency,
          pharmacyMedID,
          patientId: userId,
          doctorId,
          createdBy: req.headers.userid,
          updatedBy: req.headers.userid,
        }).save();
      }
    }
console.log("===========97==6===")


    // Save tests if provided
    if (diagnosis?.selectedTests && diagnosis.selectedTests.length > 0) {
      for (const test of diagnosis.selectedTests) {
        const { testInventoryId, testName } = test;

        const testCounter = await Counter.findByIdAndUpdate(
          { _id: PREFIX_SEQUENCE.TESTS_SEQUENCE.TESTS_MODEL },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const labTestID = PREFIX_SEQUENCE.TESTS_SEQUENCE.SEQUENCE.concat(
          testCounter.seq
        );

        await new patientTestModel({
          testInventoryId: testInventoryId ? testInventoryId : null,
          testName,
          patientId: userId,
          labTestID,
          doctorId,
          createdBy: req.user?._id,
          updatedBy: req.user?._id,
        }).save();
      }
    }

    // Create e-prescription document
    const eprescription = new eprescriptionsModel({
      prescriptionId,
      appointmentId,
      userId,
      doctorId,
      addressId,
      patientInfo: {
        patientName: patientInfo?.patientName,
        age: patientInfo?.age,
        gender: patientInfo?.gender,
        mobileNumber: patientInfo?.mobileNumber,
        chiefComplaint: patientInfo?.chiefComplaint,
        pastMedicalHistory: patientInfo?.pastMedicalHistory || null,
        familyMedicalHistory: patientInfo?.familyMedicalHistory || null,
        physicalExamination: patientInfo?.physicalExamination || null,
      },
      vitals: {
        bp: vitals?.bp || null,
        pulseRate: vitals?.pulseRate || null,
        respiratoryRate: vitals?.respiratoryRate || null,
        temperature: vitals?.temperature || null,
        spo2: vitals?.spo2 || null,
        height: vitals?.height || null,
        weight: vitals?.weight || null,
        bmi: vitals?.bmi || null,
        investigationFindings: vitals?.investigationFindings || null,
      },
      diagnosis: diagnosis
        ? {
            diagnosisNote: diagnosis.diagnosisNote || null,
            testsNote: diagnosis.testsNote || null,
            PrescribeMedNotes: diagnosis.PrescribeMedNotes || null,
            selectedTests: diagnosis.selectedTests || [],
            medications: diagnosis.medications || [],
          }
        : null,
      advice: {
        advice: advice?.advice || null,
        followUpDate: advice?.followUpDate || null,
      },
      createdBy: req.headers.userid,
      updatedBy: req.headers.userid,
    });

    await eprescription.save();

    res.status(201).json({
      success: true,
      prescriptionId: eprescription.prescriptionId,
      message: "Prescription added successfully",
    });
  } catch (error) {
    console.log("error", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: "fail",
        message: "Duplicate prescription entry detected",
      });
    }

    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getEPrescriptionByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        status: "fail",
        message: "Patient ID is required",
      });
    }

    const prescriptions = await eprescriptionsModel.find({ userId: patientId });

    if (!prescriptions || prescriptions.length === 0) {
      return res.status(200).json({
        status: "fail",
        message: "No prescriptions found for this patient",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Prescriptions retrieved successfully",
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getEPrescriptionByprescriptionId = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    if (!prescriptionId) {
      return res.status(400).json({
        status: "fail",
        message: "prescription ID is required",
      });
    }

    const prescriptions = await eprescriptionsModel.find({
      prescriptionId: prescriptionId,
    });

    if (!prescriptions || prescriptions.length === 0) {
      return res.status(200).json({
        status: "fail",
        message: "No prescriptions found for this patient",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "success",
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllMedicinesByDoctorID = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.headers.userid;
    // const { doctorId } = req.query;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required",
      });
    }
    const inventory = await medInventoryModel
      .find({ doctorId })
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllPharmacyPatientsByDoctorID = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.headers.userid;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Aggregate medicines by patientId for the given doctorId with price from MedInventory
    const patients = await medicineModel.aggregate([
      {
        $match: { doctorId, isDeleted: false }, // Filter by doctorId and non-deleted records
      },
      {
        $lookup: {
          from: "medinventories", // Collection name for MedInventory model
          localField: "medInventoryId",
          foreignField: "_id",
          as: "inventoryData",
        },
      },
      {
        $unwind: {
          path: "$inventoryData",
          preserveNullAndEmptyArrays: true, // Keep medicines even if no matching inventory
        },
      },
      {
        $lookup: {
          from: "users", // Collection name for Users model
          localField: "patientId",
          foreignField: "userId", // Assuming 'userId' is the field in the users collection
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true, // Keep medicines even if no matching user
        },
      },
      {
        $group: {
          _id: "$patientId", // Group by patientId
          patientName: {
            $first: {
              $concat: [
                { $ifNull: ["$userData.firstname", ""] },
                " ",
                { $ifNull: ["$userData.lastname", ""] },
              ],
            },
          },
          doctorId: { $first: "$doctorId" }, // Include doctorId
          medicines: {
            $push: {
              _id: "$_id",
              medName: "$medName",
              price: { $ifNull: ["$inventoryData.price", null] },
              quantity: "$quantity",
              status: "$status",
              createdAt: "$createdAt",
              pharmacyMedID: "$pharmacyMedID", // Include pharmacyMedID
            },
          },
        },
      },
      {
        $project: {
          patientId: "$_id",
          patientName: 1,
          doctorId: 1,
          medicines: 1, // Rename to match the desired key in the response
          _id: 0,
        },
      },
      {
        $sort: { patientId: 1 }, // Sort by patientId for consistent output
      },
    ]);

    res.status(200).json({
      status: "success",
      data: patients || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.pharmacyPayment = async (req, res) => {
  try {
    // Step 1: Validate input
    const { error } = Joi.object({
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      amount: Joi.number().min(0).required(),
      medicines: Joi.array()
        .items(
          Joi.object({
            medicineId: Joi.string().required(),
            price: Joi.number().min(0).allow(null), // allow null/missing
            quantity: Joi.number().min(0).allow(null),
            pharmacyMedID: Joi.string().allow(null),
          })
        )
        .required()
        .min(1),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }

    const {
      patientId,
      doctorId,
      amount,
      medicines,
      paymentStatus = "paid",
      discount,
      discountType,
    } = req.body;

    // Step 2: Optional - Verify patient exists
    const patientExists = await Users.findOne({ userId: patientId });
    if (!patientExists) {
      return res
        .status(404)
        .json({ status: "error", message: "Patient not found" });
    }

    // Step 3: Process each medicines
    const updatedMedicines = [];

    for (const medicine of medicines) {
      const { medicineId, price, pharmacyMedID } = medicine;

      console.log("price", price, medicineId, patientId, doctorId);
      const updateData = {
        updatedAt: new Date(),
        status: price || price === 0 ? "completed" : "cancelled",
      };

      console.log("updateData", updateData);
      const updated = await MedicineyModel.findOneAndUpdate(
        { _id: medicineId, patientId, doctorId },
        { $set: updateData },
        { new: true }
      );

      if (updated) {
        updatedMedicines.push(updated);
      }

      // Process payment if paymentStatus is 'paid'
      if (
        paymentStatus === "paid" &&
        updateData.status === "completed" &&
        pharmacyMedID
      ) {
        paymentResponse = await createPayment(req.headers.authorization, {
          userId: patientId,
          doctorId,
          pharmacyMedID,
          actualAmount: price || amount,
          discount: discount || 0,
          discountType: discountType || "percentage",
          paymentStatus: "paid",
          paymentFrom: "pharmacy",
        });

        if (!paymentResponse || paymentResponse.status !== "success") {
          return res.status(500).json({
            status: "fail",
            message: "Payment failed.",
          });
        }
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Payment processed and test statuses updated",
      data: {
        patientId,
        doctorId,
        amount,
        updatedMedicines,
      },
    });
  } catch (err) {
    console.error("Error in processPayment:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
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
        status: "fail",
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { medicineId, patientId, price, doctorId } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({
        status: "fail",
        message: "Patient not found",
      });
    }

    // Check if medicine exists in Medicine model
    let medicine = await medicineModel.findOne({
      _id: medicineId,
      patientId,
      doctorId,
      isDeleted: false,
      status: { $ne: "cancelled" },
    });

    if (!medicine) {
      return res.status(404).json({
        status: "fail",
        message: "Patient medicine record not found",
      });
    }

    // Check if medicine exists in MedInventory
    let medInventory = await medInventoryModel.findOne({
      medName: medicine.medName,
      doctorId,
    });

    if (!medInventory) {
      // Create new inventory entry if it doesn't exist
      medInventory = await medInventoryModel.create({
        medName: medicine.medName,
        price,
        quantity: medicine.quantity,
        doctorId,
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
          updatedAt: Date.now(),
        },
      },
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Price updated successfully",
      data: {
        medicine: updatedMedicine,
        inventory: medInventory,
      },
    });
  } catch (error) {
    console.error("Error updating medicine price:", error);

    // Handle specific errors
    if (error.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "Duplicate medicine entry detected",
      });
    }

    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

exports.getPharmacyDetail = async (req, res) => {
  try {
    const { pharmacyMedID } = req.query;
    const medicineDetails = await medicineModel.findOne({ pharmacyMedID });
    return res.status(200).json({
      success: true,
      data: medicineDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatientPrescriptionDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Validate patientId
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    // Fetch medicine details (prescriptions) for the patient
    const prescriptions = await medicineModel.find({
      patientId,
      isDeleted: false,
    }).select(
      "_id pharmacyMedID medName quantity dosage duration timings frequency status createdAt updatedAt"
    );

    // Fetch test details for the patient
    const labTests = await patientTestModel.find({
      patientId,
      isDeleted: false,
    }).select("_id testName labTestID status createdAt updatedAt");

    // Format the response
    const response = {
      success: true,
      data: {
        medicines: prescriptions.map((prescription) => ({
          id: prescription._id,
          pharmacyMedID: prescription.pharmacyMedID,
          medName: prescription.medName,
          quantity: prescription.quantity,
          dosage: prescription.dosage,
          duration: prescription.duration,
          timings: prescription.timings,
          frequency: prescription.frequency,
          status: prescription.status,
          createdAt: prescription.createdAt,
          updatedAt: prescription.updatedAt,
        })),
        tests: labTests.map((test) => ({
          id: test._id,
          testName: test.testName,
          labTestID: test.labTestID,
          status: test.status,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt,
        })),
      },
    };

    // Return the response
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching patient prescription details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
