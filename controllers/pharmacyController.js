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
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;

const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY
  }
});

const { unlink } = require('fs').promises;
const path = require('path')
const FormData = require('form-data');
const { waitForDebugger } = require("inspector");
const {generatePrescriptionPDF} = require("../utils/generatePdf")


// const { convertImageToBase64 } = require("../utils/imageService");
// const { fromFile } = require('file-type');
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
    const { medName, dosage, price, quantity, doctorId, gst, cgst } = req.body;

    // Validate required fields
    if (!medName  || !dosage || !price || !quantity || !doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "All fields (medName, dosage, price, quantity, doctorId) are required",
      });
    }

    // Check for existing medicine with same medName and doctorId
    const existingMedicine = await medInventoryModel.findOne({
      medName: { $regex: `^${medName}$`, $options: "i" }, // Case-insensitive match
       dosage: { $regex: `^${dosage}$`, $options: "i" }, // Case-insensitive match
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
       dosage,
      price,
      quantity,
      doctorId,
       gst: gst !== undefined ? gst : 6, // Use provided gst or default to 6
      cgst: cgst !== undefined ? cgst : 6 
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
const checkDuplicates = async (doctorId, medicines) => {
  const existing = await medInventoryModel
    .find({
      doctorId,
       $or: medicines.map(({ medName, dosage }) => ({
        medName: { $regex: `^${medName}$`, $options: "i" },
        dosage: { $regex: `^${dosage}$`, $options: "i" },
      })),
    })
    .lean();
  return new Set(existing.map((med) => `${med.medName.toLowerCase()}|${med.dosage.toLowerCase()}`));
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
        header: ["medName", "dosage", "price", "quantity", "gst", "cgst"],
      });

      if (data.length <= 1) {
        // First row is headers
        return res.status(400).json({
          status: "fail",
          message: "Excel file contains no data",
        });
      }

      // Validate headers
      const expectedHeaders = ["medName", "dosage", "price", "quantity", "gst", "cgst"];
      const firstRow = data[0];
      if (!expectedHeaders.every((header) => header in firstRow)) {
        return res.status(400).json({
          status: "fail",
          message: "Excel file must have headers: medName, dosage, price, quantity, gst, cgst",
        });
      }

      // Remove header row
      data.shift();

      // Validate and process each row
      const errors = [];
      const medicinesToInsert = [];
      const existingMedicines = await checkDuplicates(
        doctorId,
       data.map((row) => ({ medName: row.medName, dosage: row.dosage }))
      );

 const processedMedDosagePairs = new Set();

      for (const [index, row] of data.entries()) {
        // Override doctorId from body/headers
        const medicine = { ...row, doctorId, gst: row.gst !== undefined ? row.gst : 6, // Default to 6 if not provided
          cgst: row.cgst !== undefined ? row.cgst : 6 };

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
        // const medNameLower = medicine.medName.toLowerCase();
          const medDosageKey = `${medicine.medName.toLowerCase()}|${medicine.dosage.toLowerCase()}`;


        if (
          existingMedicines.has(medDosageKey) ||
          processedMedDosagePairs.has(medDosageKey)
        ) {
          errors.push({
            row: index + 2,
             message: `Medicine '${medicine.medName}' with dosage '${medicine.dosage}' already exists for doctor ${doctorId}`,
          });
          continue;
        }

        medicinesToInsert.push({
          medName: medicine.medName,
           dosage: medicine.dosage,
          price: medicine.price,
          quantity: medicine.quantity,
          doctorId: doctorId,
            gst: medicine.gst,
          cgst: medicine.cgst,
          createdAt: new Date(),
        });
        processedMedDosagePairs.add(medDosageKey);
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


exports.addattach2= async (req, res) => {
  console.log("am in 0=====")
  let fileDeleted = false; // Track if file was deleted

  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
   console.log("req.file=1==")
    if (!req.file.mimetype.includes("pdf")) {
      await unlink(req.file.path).catch((err) => console.error("Cleanup error:", err));
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }
   console.log("req.file=2==")

    const { prescriptionId } = req.body;
    if (!prescriptionId) {
      await unlink(req.file.path).catch((err) => console.error("Cleanup error:", err));
      return res.status(400).json({ error: "Prescription ID is missing" });
    }
   console.log("req.file=3==")

  
    // Read file from disk
    const fileBuffer = await fs.promises.readFile(req.file.path);
   console.log("req.file=4==")

    // Upload new attachment to S3
    // const newAttachment = await uploadAttachmentToS3(
    //   fileBuffer,
    //   req.file.originalname,
    //   "prescriptions",
    //   518400,
    //   req.file.mimetype
    // );
    // if (!newAttachment?.fileURL) {
    //   throw new Error("Failed to retrieve S3 file URL");
    // }

   let whatsappmediaID= await this.uploadImageToAirtelAPI(req.file.path)
   console.log("req.file=5==", whatsappmediaID)

   let sendWhatsQrAppMessage = await this.sendWhatsQrAppMessage(req.body,whatsappmediaID)


    // Clean up the temporary file
    await unlink(req.file.path);
    fileDeleted = true; // Mark file as deleted
   console.log("req.file=7==")

    // Update prescription in database
    // const result = await eprescriptionsModel.updateOne(
    //   { prescriptionId: prescriptionId }, // Use _id if that's the primary key
    //   { $set: { prescriptionAttachment: newAttachment.fileURL } } // Store only fileURL
    // );

    // if (result.matchedCount === 0) {
    //   return res.status(404).json({ error: "Prescription not found" });
    // }

   

    res.status(200).json({
      message: "Attachment uploaded successfully",
      // attachment: newAttachment,
      // result
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
console.log("Error in addattach:", error);
    console.error("Error in addattach:", error);
    res.status(500).json({
      error: "Failed to upload attachment",
      details: error.message
    });
  }
};


exports.addattach = async (req, res) => {
  console.log("am in 0=====");
  let fileDeleted = false;

  try {
    const { formData, selectedClinic } = req.body;

    if (!formData || !selectedClinic) {
      return res.status(400).json({ error: "formData or selectedClinic is missing" });
    }

    const { prescriptionId } = formData;
    if (!prescriptionId) {
      return res.status(400).json({ error: "Prescription ID is missing" });
    }

    // console.log("Generating PDF...");
    // console.log("formData:", JSON.stringify(formData, null, 2));
    // console.log("selectedClinic:", JSON.stringify(selectedClinic, null, 2));

    // Generate PDF
    const pdfBuffer = await generatePrescriptionPDF(formData, selectedClinic);
    if (!pdfBuffer) throw new Error("Failed to generate PDF");

    // Ensure tmp folder exists
    const tmpDir = path.join(__dirname, "../tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Save PDF temporarily
    const tempFilePath = path.join(tmpDir, `prescription_${prescriptionId}_${Date.now()}.pdf`);
    await fs.promises.writeFile(tempFilePath, pdfBuffer);
    console.log("PDF saved to:", tempFilePath);

    // Upload file to Airtel API
    const whatsappMediaID = await this.uploadImageToAirtelAPI(tempFilePath);
    console.log("Uploaded to Airtel:", whatsappMediaID);

    // Send WhatsApp message
    await this.sendWhatsQrAppMessage(req.body, whatsappMediaID);

    // Cleanup
    await unlink(tempFilePath);
    fileDeleted = true;
    console.log("Temporary file deleted");

    res.status(200).json({
      message: "Attachment uploaded successfully"
    });

  } catch (error) {
    // Cleanup req.file if exists
    if (!fileDeleted && req.file && req.file.path) {
      try {
        await unlink(req.file.path);
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
  formData.append('mediaType', 'DOCUMENT');
  formData.append('messageType', 'TEMPLATE_MESSAGE');
  
  try {
    // Construct path to file in upload folder
    const uploadDir = path.join(__dirname, '../uploads');

    // Default PDF file to use if no filePath is provided
    const pdfFilePath = path.isAbsolute(filePath)
  ? filePath
  : path.join(__dirname, '..', filePath);

    // console.log("Resolved PDF path:", pdfFilePath);

    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`❌ File not found: ${pdfFilePath}`);
    }

    formData.append('file', fs.createReadStream(pdfFilePath));
    console.log(`✅ Uploading file: ${pdfFilePath}`);

 
    // Check if directory exists, if not create it
    // if (!fs.existsSync(uploadDir)) {
    //   fs.mkdirSync(uploadDir, { recursive: true });
    //   console.log(`Created directory: ${uploadDir}`);
    // }
    // console.log("filePath==",filePath)
    // const fullPath = filePath || path.join(uploadDir, 'default.png');
    // console.log("fullPath==",fullPath)
   
    // Check if file exists
    if (!fs.existsSync(pdfFilePath)) {
      console.log(`File not found: ${pdfFilePath}`);
      
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
      formData.append('file', fs.createReadStream(pdfFilePath));
      console.log(`Using original image: ${pdfFilePath}`);
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
      if (pdfFilePath !== path.join(uploadDir, 'default.png')) {
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
  const userId = order?.patientId; // Extract userId from the order object
  const doctorId = order?.doctorId; // Extract doctorId from the order object
  const user = order?.formData?.patientInfo;
  const doctor = order?.formData?.doctorInfo;

  const phoneNumber =   user?.mobileNumber; // Get the phone number from the user details
  const name = user?.patientName? user.patientName: "User"; // Default to 'User' if name doesn't exist

  // let OrderNo = "NV".concat(order.id.toString());
  let toNumber = "91".concat(phoneNumber);

const doctorName = doctor?.doctorName || "Doctor Unknown";

// Split by ANY whitespace and remove empties
const parts = doctorName.trim().split(/\s+/);

const firstname = parts[0] || "";
const lastname = parts.slice(1).join(" ") || ""; // handles multiple last names too

// console.log("doctorName:", doctorName);
// console.log("Doctor Firstname:", firstname);
// console.log("Doctor Lastname:", lastname);

// fallback if only one name exists
const doctorfirstname = firstname || "Doctor";
const doctorlastname = lastname || ""

    sendImageWithAttachment(
      toNumber,
      "01jzzt1qq204fz496stragvr8x",
      [name,doctorfirstname,doctorlastname],
      [],
      whatsappuploadedid,
       order?.appointmentId || "prescription.pdf"
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


const sendImageWithAttachment = async (
  to,
  templateId,
  variables,
  payload,
  whatsappuploadedid = null,
   originalFileName = "document.pdf"
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
        type: "DOCUMENT",
        id: whatsappuploadedid,
         fileName: originalFileName 
      }
    })
  };
  console.log("📤 Final Payload:", JSON.stringify(payloadData, null, 2));
  try {
    const response = await axios.post(url, payloadData, { headers });
    console.log("✅ Message sent successfully:", response.data);
  } catch (error) {
    console.error('❌ Error sending message with attachment:', error.response?.data || error.message);
    throw error;
  }
};

//originnal
exports.addPrescription2 = async (req, res) => {
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

exports.addPrescription2 = async (req, res) => {
  try {
    const { error, value } = prescriptionValidationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    console.log("value===", value)
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

    console.log("diagnosis===", diagnosis )
    // Check if prescription exists for this appointment
    let eprescription = await eprescriptionsModel.findOne({ appointmentId });


    let prescriptionId;
    if (!eprescription) {
console.log("No existing prescription found, creating a new one");
      // Generate unique prescriptionId for new prescription
      const prescriptionCounter = await Counter.findByIdAndUpdate(
        { _id: PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.EPRESCRIPTION_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      prescriptionId = PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.SEQUENCE.concat(
        prescriptionCounter.seq
      );
    } else {
      prescriptionId = eprescription.prescriptionId;
    }

    // Fetch existing tests and medications by appointmentId, patientId, and doctorId
    const existingTests = await patientTestModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $ne: 'cancelled' },
    });

    const existingMedications = await medicineModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $ne: 'cancelled' },
    });

    // Save or update medicines
    let newMedications = [];
    if (diagnosis?.medications && diagnosis.medications.length > 0) {
      console.log("diagnosis.medications===", diagnosis.medications)
      // Delete existing medications for this prescriptionId to avoid duplicates and ensure only new ones are stored
      // await medicineModel.deleteMany({
      //   prescriptionId,
      //   patientId: userId,
      //   doctorId,
      //   isDeleted: false,
      //   status: { $ne: "cancelled" },
      // });
      
      for (const medicine of diagnosis.medications) {
        const {
          medInventoryId,
          medName,
          quantity,
          medicineType,
          dosage,
          duration,
          timings,
          frequency,
        } = medicine;

        // Check for duplicate medication
        const isDuplicate = existingMedications.some(
          (existing) =>
            existing.medName === medName 
          // &&
          //   existing.dosage === dosage &&
          //   existing.duration === duration &&
          //   existing.frequency === frequency &&
            // existing.timings === (Array.isArray(timings) ? timings.join(", ") : timings)
        );

        if (isDuplicate) {
          console.log(`Skipping duplicate medication: ${medName}`);
          continue;
        }
     

 let finalMedInventoryId2 = medInventoryId ? new mongoose.Types.ObjectId(medInventoryId) : null;

       let finalMedInventoryId = medInventoryId &&  mongoose.Types.ObjectId.isValid(medInventoryId)
          ? new mongoose.Types.ObjectId(medInventoryId)
          : null;

        let inventory = await medInventoryModel.findOne({ medName, doctorId });
        if (!inventory && medInventoryId) {
          inventory = await medInventoryModel.findById(medInventoryId);
        }

        const medCounter = await Counter.findByIdAndUpdate(
          { _id: PREFIX_SEQUENCE.MEDICINES_SEQUENCE.MEDICINES_MODEL },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const pharmacyMedID = PREFIX_SEQUENCE.MEDICINES_SEQUENCE.SEQUENCE.concat(medCounter.seq);

        const newMedicine = await new medicineModel({
          medInventoryId: finalMedInventoryId || (inventory ? inventory._id : null),
          medName,
          quantity,
          medicineType,
          dosage,
          duration,
          timings: Array.isArray(timings) ? timings.join(", ") : timings,
          frequency,
          pharmacyMedID,
          patientId: userId,
          doctorId,
          prescriptionId,
          createdBy: req.headers.userid,
          updatedBy: req.headers.userid,
        }).save();

        console.log("newMedicine===", newMedicine)
        newMedications.push({
          medInventoryId: newMedicine.medInventoryId,
          medName: newMedicine.medName,
          quantity: newMedicine.quantity,
          medicineType: newMedicine.medicineType,
          dosage: newMedicine.dosage,
          duration: newMedicine.duration,
          timings: newMedicine.timings.split(", "), // Convert back to array for consistency
          frequency: newMedicine.frequency,
        });
      }
    } else {
      // If no medications are sent, clear existing medications
      // await medicineModel.deleteMany({
      //   prescriptionId,
      //   patientId: userId,
      //   doctorId,
      //   isDeleted: false,
      //   status: { $ne: "cancelled" },
      // });
    }
console.log("newMedications===", newMedications)
    // Save or update tests
    let newTests = [];
    if (diagnosis?.selectedTests && diagnosis.selectedTests.length > 0) {
      // Delete existing tests for this prescriptionId to avoid duplicates and ensure only new ones are stored
      // await patientTestModel.deleteMany({
      //   prescriptionId,
      //   patientId: userId,
      //   doctorId,
      //   isDeleted: false,
      //   status: { $ne: "cancelled" },
      // });

      for (const test of diagnosis.selectedTests) {
        const { testInventoryId, testName } = test;

        // Check for duplicate test
        const isDuplicate = existingTests.some(
          (existing) => existing.testName === testName
        );

        if (isDuplicate) {
          console.log(`Skipping duplicate test: ${testName}`);
          continue;
        }

        const testCounter = await Counter.findByIdAndUpdate(
          { _id: PREFIX_SEQUENCE.TESTS_SEQUENCE.TESTS_MODEL },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const labTestID = PREFIX_SEQUENCE.TESTS_SEQUENCE.SEQUENCE.concat(testCounter.seq);

        const newTest = await new patientTestModel({
          testInventoryId: testInventoryId ? testInventoryId : null,
          testName,
          patientId: userId,
          prescriptionId,
          labTestID,
          doctorId,
          createdBy: req.user?._id,
          updatedBy: req.user?._id,
        }).save();

        newTests.push({
          testInventoryId: newTest.testInventoryId,
          testName: newTest.testName,
        });
      }
    } else {
      // If no tests are sent, clear existing tests
      // await patientTestModel.deleteMany({
      //   prescriptionId,
      //   patientId: userId,
      //   doctorId,
      //   isDeleted: false,
      //   status: { $ne: "cancelled" },
      // });
    }

    // Merge existing and new tests/medications for the prescription document
    const existingPrescriptionTests = eprescription?.diagnosis?.selectedTests || [];
    const existingPrescriptionMedications = eprescription?.diagnosis?.medications || [];
    console.log("existingPrescriptionMedications===", existingPrescriptionMedications)
    // Create or update e-prescription document
    if (eprescription) {
      // Update existing prescription
      eprescription = await eprescriptionsModel.findOneAndUpdate(
        { appointmentId },
        {
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
            other: vitals?.other || null,

          },
          diagnosis: diagnosis
            ? {
                diagnosisNote: diagnosis.diagnosisNote || null,
                testsNote: diagnosis.testsNote || null,
              
                selectedTests: [
                  ...existingPrescriptionTests,
                  ...newTests,
                ],
                // selectedTests: newTests,
                // medications: newMedications,
                medications: [
                  ...existingPrescriptionMedications,
                  ...newMedications,
                ],
              }
            : null,
          advice: {
              PrescribeMedNotes: advice.PrescribeMedNotes || null,
            advice: advice?.advice || null,
            followUpDate: advice?.followUpDate || null,
          },
          updatedBy: req.headers.userid,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new prescription
      eprescription = new eprescriptionsModel({
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
          other: vitals?.other || null,

        },
        diagnosis: diagnosis
          ? {
              diagnosisNote: diagnosis.diagnosisNote || null,
              testsNote: diagnosis.testsNote || null,
             
              //   selectedTests: newTests,
              // medications: newMedications,
              selectedTests: diagnosis.selectedTests || [],
              medications: diagnosis.medications || [],
            }
          : null,
        advice: {
           PrescribeMedNotes: advice.PrescribeMedNotes || null,
          advice: advice?.advice || null,
          followUpDate: advice?.followUpDate || null,
        },
        createdBy: req.headers.userid,
        updatedBy: req.headers.userid,
      });
      await eprescription.save();
    }

    res.status(201).json({
      success: true,
      prescriptionId: eprescription.prescriptionId,
      message: eprescription.isNew
        ? "Prescription added successfully"
        : "Prescription updated successfully",
      data: {
        skippedTests: diagnosis?.selectedTests
          ? diagnosis.selectedTests.filter((test) =>
              existingTests.some((existing) => existing.testName === test.testName)
            )
          : [],
        skippedMedications: diagnosis?.medications
          ? diagnosis.medications.filter((med) =>
              existingMedications.some(
                (existing) =>
                  existing.medName === med.medName &&
                  existing.dosage === med.dosage &&
                  existing.duration === med.duration &&
                  existing.frequency === med.frequency &&
                  existing.timings === (Array.isArray(med.timings) ? med.timings.join(", ") : med.timings)
              )
            )
          : [],
      },
    });
  } catch (error) {
    console.log("error", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: "fail",
        message: "Duplicate prescription, test, or medication entry detected",
      });
    }

    res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error",
    });
  }
};
//only checking medicine name for duplicates
exports.addPrescription4 = async (req, res) => {
  try {
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

    // Check if prescription exists for this appointment
    let eprescription = await eprescriptionsModel.findOne({ appointmentId });
    let isNewPrescription = !eprescription;

    let prescriptionId;
    if (isNewPrescription) {
      console.log("No existing prescription found, creating a new one");
      const prescriptionCounter = await Counter.findByIdAndUpdate(
        { _id: PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.EPRESCRIPTION_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      prescriptionId = PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.SEQUENCE.concat(
        prescriptionCounter.seq
      );
    } else {
      prescriptionId = eprescription.prescriptionId;
    }

    // Fetch existing tests and medications
    const existingTests = await patientTestModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $nin: ['cancelled', 'deleted'] }, // Updated to exclude "deleted"
    });

    const existingMedications = await medicineModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $nin: ['cancelled', 'deleted'] }, // Updated to exclude "deleted"
    });

    // Determine if we need to process medications and tests
    const processMedications = diagnosis && 'medications' in diagnosis;
    const processTests = diagnosis && 'selectedTests' in diagnosis;

    const sentMedications = processMedications ? (diagnosis.medications || []) : [];
    const sentTests = processTests ? (diagnosis.selectedTests || []) : [];

    // Process medications
    let newMedications = [];
    let medicationWarnings = [];
    if (processMedications) {
      const sentMedNames = new Set(sentMedications.map(m => m.medName));
      const existingMedMap = new Map(existingMedications.map(m => [m.medName, m]));

      for (const medicine of sentMedications) {
        const {
          medInventoryId,
          medName,
          quantity,
          medicineType,
          dosage,
          duration,
          timings,
          frequency,
        } = medicine;

        let existing = existingMedMap.get(medName);
        if (existing) {
          const timingsStr = Array.isArray(timings) ? timings.join(", ") : timings;
          const medInvIdStr = medInventoryId ? medInventoryId : null;
          const existingMedInvIdStr = existing.medInventoryId ? existing.medInventoryId.toString() : null;

          if (
            existing.quantity !== quantity ||
            existing.medicineType !== medicineType ||
            existing.dosage !== dosage ||
            existing.duration !== duration ||
            existing.timings !== timingsStr ||
            existing.frequency !== frequency ||
            existingMedInvIdStr !== medInvIdStr
          ) {
            if (existing.status === 'pending') {
              let finalMedInventoryId = medInventoryId && mongoose.Types.ObjectId.isValid(medInventoryId)
                ? new mongoose.Types.ObjectId(medInventoryId)
                : null;

              existing.medInventoryId = finalMedInventoryId;
              existing.quantity = quantity;
              existing.medicineType = medicineType;
              existing.dosage = dosage;
              existing.duration = duration;
              existing.timings = timingsStr;
              existing.frequency = frequency;
              existing.updatedBy = req.headers.userid;
              await existing.save();
            } else {
              console.log(`Cannot update non-pending medication: ${medName}`);
            }
          }

          newMedications.push({
            medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
            medName: existing.medName,
            quantity: existing.quantity,
            medicineType: existing.medicineType,
            dosage: existing.dosage,
            duration: existing.duration,
            timings: existing.timings ? existing.timings.split(", ") : [],
            frequency: existing.frequency,
          });
        } else {
          let finalMedInventoryId = medInventoryId && mongoose.Types.ObjectId.isValid(medInventoryId)
            ? new mongoose.Types.ObjectId(medInventoryId)
            : null;

          let inventory = await medInventoryModel.findOne({ medName, doctorId });
          if (!inventory && medInventoryId) {
            inventory = await medInventoryModel.findById(medInventoryId);
          }

          const medCounter = await Counter.findByIdAndUpdate(
            { _id: PREFIX_SEQUENCE.MEDICINES_SEQUENCE.MEDICINES_MODEL },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const pharmacyMedID = PREFIX_SEQUENCE.MEDICINES_SEQUENCE.SEQUENCE.concat(medCounter.seq);

          const newMedicine = await new medicineModel({
            medInventoryId: finalMedInventoryId || (inventory ? inventory._id : null),
            medName,
            quantity,
            medicineType,
            dosage,
            duration,
            timings: Array.isArray(timings) ? timings.join(", ") : timings,
            frequency,
            pharmacyMedID,
            patientId: userId,
            doctorId,
            prescriptionId,
            createdBy: req.headers.userid,
            updatedBy: req.headers.userid,
          }).save();

          newMedications.push({
            medInventoryId: newMedicine.medInventoryId ? newMedicine.medInventoryId.toString() : null,
            medName: newMedicine.medName,
            quantity: newMedicine.quantity,
            medicineType: newMedicine.medicineType,
            dosage: newMedicine.dosage,
            duration: newMedicine.duration,
            timings: newMedicine.timings ? newMedicine.timings.split(", ") : [],
            frequency: newMedicine.frequency,
          });
        }
      }

      // Handle removal of medications
      for (const existing of existingMedications) {
        if (!sentMedNames.has(existing.medName)) {
          if (existing.status === 'pending') {
            existing.status = 'deleted'; // Set status to "deleted"
            existing.isDeleted = true; // Keep for backward compatibility
            existing.updatedBy = req.headers.userid;
            await existing.save();
          } else if (existing.status === 'completed') {
            medicationWarnings.push({
              medName: existing.medName,
              message: `Cannot remove medication '${existing.medName}' because payment has been completed`,
            });
            newMedications.push({
              medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
              medName: existing.medName,
              quantity: existing.quantity,
              medicineType: existing.medicineType,
              dosage: existing.dosage,
              duration: existing.duration,
              timings: existing.timings ? existing.timings.split(", ") : [],
              frequency: existing.frequency,
            });
          } else {
            console.log(`Cannot delete non-pending medication: ${existing.medName}`);
            newMedications.push({
              medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
              medName: existing.medName,
              quantity: existing.quantity,
              medicineType: existing.medicineType,
              dosage: existing.dosage,
              duration: existing.duration,
              timings: existing.timings ? existing.timings.split(", ") : [],
              frequency: existing.frequency,
            });
          }
        }
      }
    } else {
      newMedications = existingMedications.map(ex => ({
        medInventoryId: ex.medInventoryId ? ex.medInventoryId.toString() : null,
        medName: ex.medName,
        quantity: ex.quantity,
        medicineType: ex.medicineType,
        dosage: ex.dosage,
        duration: ex.duration,
        timings: ex.timings ? ex.timings.split(", ") : [],
        frequency: ex.frequency,
      }));
    }

    // Process tests
    let newTests = [];
    let testWarnings = [];
    if (processTests) {
      const sentTestNames = new Set(sentTests.map(t => t.testName));
      const existingTestMap = new Map(existingTests.map(t => [t.testName, t]));

      for (const test of sentTests) {
        const { testInventoryId, testName } = test;
        let existing = existingTestMap.get(testName);

        if (existing) {
          const testInvIdStr = testInventoryId ? testInventoryId : null;
          const existingTestInvIdStr = existing.testInventoryId ? existing.testInventoryId.toString() : null;

          if (existingTestInvIdStr !== testInvIdStr) {
            if (existing.status === 'pending') {
              let finalTestInventoryId = testInventoryId && mongoose.Types.ObjectId.isValid(testInventoryId)
                ? new mongoose.Types.ObjectId(testInventoryId)
                : null;

              existing.testInventoryId = finalTestInventoryId;
              existing.updatedBy = req.headers.userid;
              await existing.save();
            } else {
              console.log(`Cannot update non-pending test: ${testName}`);
            }
          }

          newTests.push({
            testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
            testName: existing.testName,
          });
        } else {
          const testCounter = await Counter.findByIdAndUpdate(
            { _id: PREFIX_SEQUENCE.TESTS_SEQUENCE.TESTS_MODEL },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const labTestID = PREFIX_SEQUENCE.TESTS_SEQUENCE.SEQUENCE.concat(testCounter.seq);

          let finalTestInventoryId = testInventoryId && mongoose.Types.ObjectId.isValid(testInventoryId)
            ? new mongoose.Types.ObjectId(testInventoryId)
            : null;

          const newTest = await new patientTestModel({
            testInventoryId: finalTestInventoryId,
            testName,
            patientId: userId,
            prescriptionId,
            labTestID,
            doctorId,
            createdBy:  req.user?._id,
            updatedBy: req.user?._id,
          }).save();

          newTests.push({
            testInventoryId: newTest.testInventoryId ? newTest.testInventoryId.toString() : null,
            testName: newTest.testName,
          });
        }
      }

      // Handle removal of tests
      for (const existing of existingTests) {
        if (!sentTestNames.has(existing.testName)) {
          if (existing.status === 'pending') {
            existing.status = 'deleted'; // Set status to "deleted"
            existing.isDeleted = true; // Keep for backward compatibility
            existing.updatedBy =  req.user?._id;
            await existing.save();
          } else if (existing.status === 'completed') {
            testWarnings.push({
              testName: existing.testName,
              message: `Cannot remove test '${existing.testName}' because payment has been completed`,
            });
            newTests.push({
              testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
              testName: existing.testName,
            });
          } else {
            console.log(`Cannot delete non-pending test: ${existing.testName}`);
            newTests.push({
              testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
              testName: existing.testName,
            });
          }
        }
      }
    } else {
      newTests = existingTests.map(ex => ({
        testInventoryId: ex.testInventoryId ? ex.testInventoryId.toString() : null,
        testName: ex.testName,
      }));
    }

    // Create or update e-prescription document
    if (!isNewPrescription) {
      const updateData = {
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
          other: vitals?.other || null,
        },
        advice: {
          PrescribeMedNotes: advice?.PrescribeMedNotes || null,
          advice: advice?.advice || null,
          followUpDate: advice?.followUpDate || null,
        },
        updatedBy: req.headers.userid,
        updatedAt: new Date(),
      };

      if (diagnosis) {
        updateData.diagnosis = {
          diagnosisNote: diagnosis.diagnosisNote || null,
          testsNote: diagnosis.testsNote || null,
          selectedTests: newTests,
          medications: newMedications,
        };
      }

      eprescription = await eprescriptionsModel.findOneAndUpdate(
        { appointmentId },
        updateData,
        { new: true }
      );
    } else {
      eprescription = new eprescriptionsModel({
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
          other: vitals?.other || null,
        },
        diagnosis: diagnosis
          ? {
              diagnosisNote: diagnosis.diagnosisNote || null,
              testsNote: diagnosis.testsNote || null,
              selectedTests: newTests,
              medications: newMedications,
            }
          : null,
        advice: {
          PrescribeMedNotes: advice?.PrescribeMedNotes || null,
          advice: advice?.advice || null,
          followUpDate: advice?.followUpDate || null,
        },
        createdBy: req.headers.userid,
        updatedBy: req.headers.userid,
      });
      await eprescription.save();
    }

    // Prepare response with warnings
    res.status(201).json({
      success: true,
      prescriptionId: eprescription.prescriptionId,
      message: isNewPrescription
        ? "Prescription added successfully"
        : "Prescription updated successfully",
      data: {
        skippedTests: diagnosis?.selectedTests
          ? diagnosis.selectedTests.filter((test) =>
              existingTests.some((existing) => existing.testName === test.testName)
            )
          : [],
        skippedMedications: diagnosis?.medications
          ? diagnosis.medications.filter((med) =>
              existingMedications.some(
                (existing) =>
                  existing.medName === med.medName &&
                  existing.dosage === med.dosage &&
                  existing.duration === med.duration &&
                  existing.frequency === med.frequency &&
                  existing.timings === (Array.isArray(med.timings) ? med.timings.join(", ") : med.timings)
              )
            )
          : [],
        warnings: [...testWarnings, ...medicationWarnings],
      },
    });
  } catch (error) {
    console.log("error", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: "fail",
        message: "Duplicate prescription, test, or medication entry detected",
      });
    }

    res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error",
    });
  }
};

//checking medicine nme, dosage for duplicates
exports.addPrescription = async (req, res) => {
  try {
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

    // Check if prescription exists for this appointment
    let eprescription = await eprescriptionsModel.findOne({ appointmentId });
    let isNewPrescription = !eprescription;

    let prescriptionId;
    if (isNewPrescription) {
      console.log("No existing prescription found, creating a new one");
      const prescriptionCounter = await Counter.findByIdAndUpdate(
        { _id: PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.EPRESCRIPTION_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      prescriptionId = PREFIX_SEQUENCE.EPRESCRIPTION_SEQUENCE.SEQUENCE.concat(
        prescriptionCounter.seq
      );
    } else {
      prescriptionId = eprescription.prescriptionId;
    }

    // Fetch existing tests and medications
    const existingTests = await patientTestModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $nin: ['cancelled', 'deleted'] },
    });

    const existingMedications = await medicineModel.find({
      patientId: userId,
      doctorId,
      prescriptionId,
      isDeleted: false,
      status: { $nin: ['cancelled', 'deleted'] },
    });

    // Determine if we need to process medications and tests
    const processMedications = diagnosis && 'medications' in diagnosis;
    const processTests = diagnosis && 'selectedTests' in diagnosis;

    const sentMedications = processMedications ? (diagnosis.medications || []) : [];
    const sentTests = processTests ? (diagnosis.selectedTests || []) : [];

    // Process medications
    let newMedications = [];
    let medicationWarnings = [];
    if (processMedications) {
      // Trim medName and normalize case for comparison
      const sentMedKeys = new Set(
        sentMedications.map(m => `${m.medName.trim().toLowerCase()}|${m.dosage.trim().toLowerCase()}`)
      );
      const existingMedMap = new Map(
        existingMedications.map(m => [`${m.medName.trim().toLowerCase()}|${m.dosage.trim().toLowerCase()}`, m])
      );

      for (const medicine of sentMedications) {
        const {
          medInventoryId,
          medName: rawMedName,
          dosage,
          quantity,
          medicineType,
          duration,
          timings,
          frequency,
        } = medicine;

        // Trim and normalize medName
        const medName = rawMedName.trim();
        const medKey = `${medName.toLowerCase()}|${dosage.trim().toLowerCase()}`;
        let existing = existingMedMap.get(medKey);

        if (existing) {
          const timingsStr = Array.isArray(timings) ? timings.join(", ") : timings;
          const medInvIdStr = medInventoryId ? medInventoryId : null;
          const existingMedInvIdStr = existing.medInventoryId ? existing.medInventoryId.toString() : null;

          if (
            existing.quantity !== quantity ||
            existing.medicineType !== medicineType ||
            existing.dosage !== dosage ||
            existing.duration !== duration ||
            existing.timings !== timingsStr ||
            existing.frequency !== frequency ||
            existingMedInvIdStr !== medInvIdStr
          ) {
            if (existing.status === 'pending') {
              let finalMedInventoryId = medInventoryId && mongoose.Types.ObjectId.isValid(medInventoryId)
                ? new mongoose.Types.ObjectId(medInventoryId)
                : null;

              existing.medInventoryId = finalMedInventoryId;
              existing.quantity = quantity;
              existing.medicineType = medicineType;
              existing.dosage = dosage;
              existing.duration = duration;
              existing.timings = timingsStr;
              existing.frequency = frequency;
              existing.updatedBy = req.headers.userid;
              await existing.save();
            } else {
              console.log(`Cannot update non-pending medication: ${medName} (${dosage})`);
            }
          }

          newMedications.push({
            medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
            medName: existing.medName,
            dosage: existing.dosage,
            quantity: existing.quantity,
            medicineType: existing.medicineType,
            duration: existing.duration,
            timings: existing.timings ? existing.timings.split(", ") : [],
            frequency: existing.frequency,
          });
        } else {
          let finalMedInventoryId = medInventoryId && mongoose.Types.ObjectId.isValid(medInventoryId)
            ? new mongoose.Types.ObjectId(medInventoryId)
            : null;

          let inventory = await medInventoryModel.findOne({
            medName: { $regex: `^${medName}$`, $options: "i" },
            dosage: { $regex: `^${dosage}$`, $options: "i" },
            doctorId,
          });
          if (!inventory && medInventoryId) {
            inventory = await medInventoryModel.findById(medInventoryId);
          }

          const medCounter = await Counter.findByIdAndUpdate(
            { _id: PREFIX_SEQUENCE.MEDICINES_SEQUENCE.MEDICINES_MODEL },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const pharmacyMedID = PREFIX_SEQUENCE.MEDICINES_SEQUENCE.SEQUENCE.concat(medCounter.seq);

          const newMedicine = await new medicineModel({
            medInventoryId: finalMedInventoryId || (inventory ? inventory._id : null),
            medName,
            dosage,
            quantity,
            medicineType,
            duration,
            timings: Array.isArray(timings) ? timings.join(", ") : timings,
            frequency,
            pharmacyMedID,
            patientId: userId,
            doctorId,
            prescriptionId,
            createdBy: req.headers.userid,
            updatedBy: req.headers.userid,
          }).save();

          newMedications.push({
            medInventoryId: newMedicine.medInventoryId ? newMedicine.medInventoryId.toString() : null,
            medName: newMedicine.medName,
            dosage: newMedicine.dosage,
            quantity: newMedicine.quantity,
            medicineType: newMedicine.medicineType,
            duration: newMedicine.duration,
            timings: newMedicine.timings ? newMedicine.timings.split(", ") : [],
            frequency: newMedicine.frequency,
          });
        }
      }

      // Handle removal of medications
      for (const existing of existingMedications) {
        const existingMedKey = `${existing.medName.trim().toLowerCase()}|${existing.dosage.trim().toLowerCase()}`;
        if (!sentMedKeys.has(existingMedKey)) {
          if (existing.status === 'pending') {
            existing.status = 'deleted';
            existing.isDeleted = true;
            existing.updatedBy = req.headers.userid;
            await existing.save();
          } else if (existing.status === 'completed') {
            medicationWarnings.push({
              medName: existing.medName,
              dosage: existing.dosage,
              message: `Cannot remove medication '${existing.medName} (${existing.dosage})' because payment has been completed`,
            });
            newMedications.push({
              medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
              medName: existing.medName,
              dosage: existing.dosage,
              quantity: existing.quantity,
              medicineType: existing.medicineType,
              duration: existing.duration,
              timings: existing.timings ? existing.timings.split(", ") : [],
              frequency: existing.frequency,
            });
          } else {
            console.log(`Cannot delete non-pending medication: ${existing.medName} (${existing.dosage})`);
            newMedications.push({
              medInventoryId: existing.medInventoryId ? existing.medInventoryId.toString() : null,
              medName: existing.medName,
              dosage: existing.dosage,
              quantity: existing.quantity,
              medicineType: existing.medicineType,
              duration: existing.duration,
              timings: existing.timings ? existing.timings.split(", ") : [],
              frequency: existing.frequency,
            });
          }
        }
      }
    } else {
      newMedications = existingMedications.map(ex => ({
        medInventoryId: ex.medInventoryId ? ex.medInventoryId.toString() : null,
        medName: ex.medName,
        dosage: ex.dosage,
        quantity: ex.quantity,
        medicineType: ex.medicineType,
        duration: ex.duration,
        timings: ex.timings ? ex.timings.split(", ") : [],
        frequency: ex.frequency,
      }));
    }

    // Process tests (unchanged)
    let newTests = [];
    let testWarnings = [];
    if (processTests) {
      const sentTestNames = new Set(sentTests.map(t => t.testName));
      const existingTestMap = new Map(existingTests.map(t => [t.testName, t]));

      for (const test of sentTests) {
        const { testInventoryId, testName } = test;
        let existing = existingTestMap.get(testName);

        if (existing) {
          const testInvIdStr = testInventoryId ? testInventoryId : null;
          const existingTestInvIdStr = existing.testInventoryId ? existing.testInventoryId.toString() : null;

          if (existingTestInvIdStr !== testInvIdStr) {
            if (existing.status === 'pending') {
              let finalTestInventoryId = testInventoryId && mongoose.Types.ObjectId.isValid(testInventoryId)
                ? new mongoose.Types.ObjectId(testInventoryId)
                : null;

              existing.testInventoryId = finalTestInventoryId;
              existing.updatedBy =  req.user?._id;
              await existing.save();
            } else {
              console.log(`Cannot update non-pending test: ${testName}`);
            }
          }

          newTests.push({
            testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
            testName: existing.testName,
          });
        } else {
          const testCounter = await Counter.findByIdAndUpdate(
            { _id: PREFIX_SEQUENCE.TESTS_SEQUENCE.TESTS_MODEL },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const labTestID = PREFIX_SEQUENCE.TESTS_SEQUENCE.SEQUENCE.concat(testCounter.seq);

          let finalTestInventoryId = testInventoryId && mongoose.Types.ObjectId.isValid(testInventoryId)
            ? new mongoose.Types.ObjectId(testInventoryId)
            : null;

          const newTest = await new patientTestModel({
            testInventoryId: finalTestInventoryId,
            testName,
            patientId: userId,
            prescriptionId,
            labTestID,
            doctorId,
            createdBy: req.user?._id,
            updatedBy: req.user?._id,
          }).save();

          newTests.push({
            testInventoryId: newTest.testInventoryId ? newTest.testInventoryId.toString() : null,
            testName: newTest.testName,
          });
        }
      }

      // Handle removal of tests
      for (const existing of existingTests) {
        if (!sentTestNames.has(existing.testName)) {
          if (existing.status === 'pending') {
            existing.status = 'deleted';
            existing.isDeleted = true;
            existing.updatedBy = req.user?._id;
            await existing.save();
          } else if (existing.status === 'completed') {
            testWarnings.push({
              testName: existing.testName,
              message: `Cannot remove test '${existing.testName}' because payment has been completed`,
            });
            newTests.push({
              testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
              testName: existing.testName,
            });
          } else {
            console.log(`Cannot delete non-pending test: ${existing.testName}`);
            newTests.push({
              testInventoryId: existing.testInventoryId ? existing.testInventoryId.toString() : null,
              testName: existing.testName,
            });
          }
        }
      }
    } else {
      newTests = existingTests.map(ex => ({
        testInventoryId: ex.testInventoryId ? ex.testInventoryId.toString() : null,
        testName: ex.testName,
      }));
    }

    // Create or update e-prescription document
    if (!isNewPrescription) {
      const updateData = {
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
          other: vitals?.other || null,
        },
        advice: {
          PrescribeMedNotes: advice?.PrescribeMedNotes || null,
          advice: advice?.advice || null,
          followUpDate: advice?.followUpDate || null,
        },
        updatedBy: req.headers.userid,
        updatedAt: new Date(),
      };

      if (diagnosis) {
        updateData.diagnosis = {
          diagnosisNote: diagnosis.diagnosisNote || null,
          testsNote: diagnosis.testsNote || null,
          selectedTests: newTests,
          medications: newMedications,
        };
      }

      eprescription = await eprescriptionsModel.findOneAndUpdate(
        { appointmentId },
        updateData,
        { new: true }
      );
    } else {
      eprescription = new eprescriptionsModel({
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
          other: vitals?.other || null,
        },
        diagnosis: diagnosis
          ? {
              diagnosisNote: diagnosis.diagnosisNote || null,
              testsNote: diagnosis.testsNote || null,
              selectedTests: newTests,
              medications: newMedications,
            }
          : null,
        advice: {
          PrescribeMedNotes: advice?.PrescribeMedNotes || null,
          advice: advice?.advice || null,
          followUpDate: advice?.followUpDate || null,
        },
        createdBy: req.headers.userid,
        updatedBy: req.headers.userid,
      });
      await eprescription.save();
    }

    // Prepare response with warnings
    res.status(201).json({
      success: true,
      prescriptionId: eprescription.prescriptionId,
      message: isNewPrescription
        ? "Prescription added successfully"
        : "Prescription updated successfully",
      data: {
        skippedTests: diagnosis?.selectedTests
          ? diagnosis.selectedTests.filter((test) =>
              existingTests.some((existing) => existing.testName === test.testName)
            )
          : [],
        skippedMedications: diagnosis?.medications
          ? diagnosis.medications.map(med => ({
              ...med,
              medName: med.medName.trim(), // Trim in response
            })).filter((med) =>
              existingMedications.some(
                (existing) =>
                  existing.medName.trim().toLowerCase() === med.medName.trim().toLowerCase() &&
                  existing.dosage.trim().toLowerCase() === med.dosage.trim().toLowerCase() &&
                  existing.quantity === med.quantity &&
                  existing.medicineType === med.medicineType &&
                  existing.duration === med.duration &&
                  existing.frequency === med.frequency &&
                  existing.timings === (Array.isArray(med.timings) ? med.timings.join(", ") : med.timings)
              )
            )
          : [],
        warnings: [...testWarnings, ...medicationWarnings],
      },
    });
  } catch (error) {
    console.log("error", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: "fail",
        message: "Duplicate prescription, test, or medication entry detected",
      });
    }

    res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error",
    });
  }
};

exports.getPrescriptionsByAppointmentIds = async (req, res) => {
  try {
    const { appointmentIds } = req.body;

    // Validate input
    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Valid appointmentIds array is required"
      });
    }

    // Query prescriptions
    const prescriptions = await eprescriptionsModel.find({
      appointmentId: { $in: appointmentIds }
    }).lean();

    return res.status(200).json({
      status: "success",
      message: "Prescriptions retrieved successfully",
      data: prescriptions
    });

  } catch (error) {
    console.error("Error in getPrescriptionsByAppointmentIds:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error"
    });
  }
};

exports.getEPrescriptionByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.params.doctorId || req.headers.userid
    if (!patientId) {
      return res.status(400).json({
        status: "fail",
        message: "Patient ID is required",
      });
    }

    const prescriptions = await eprescriptionsModel.find({ userId: patientId, doctorId :doctorId });

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

exports.getEPrescriptionByPatientIdAndDoctorId = async (req, res) => {
  try{
    const { patientId } = req.params;
     const doctorId = req.query.doctorId || req.headers.userid
    if (!patientId || !doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Patient ID and Doctor ID are required",
      });
    }
    // Fetch only diagnosis.medications and diagnosis.selectedTests
    const prescriptions = await eprescriptionsModel.find(
      { userId: patientId, doctorId: doctorId },
      { "diagnosis.medications": 1, "diagnosis.selectedTests": 1, _id: 0 }
    );
    if (!prescriptions || prescriptions.length === 0) {
      return res.status(200).json({
        status: "fail",
        message: "No prescriptions found for this patient and doctor",
        data: [],
      });
    }
    // Extract only meds and tests
    const result = prescriptions.map((p) => ({
      medications: p.diagnosis?.medications || [],
      selectedTests: p.diagnosis?.selectedTests || [],
    }));

    res.status(200).json({
      success: true,
      message: "Medicines and Tests retrieved successfully",
      data: result,
    });

  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}


exports.getEPrescriptionByAppointmentId = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({
        status: "fail",
        message: "Patient ID is required",
      });
    }

    const prescriptions = await eprescriptionsModel.find({ appointmentId: appointmentId });

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

     // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const inventory = await medInventoryModel
      .find({ doctorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await medInventoryModel.countDocuments({ doctorId });
   
    res.status(200).json({
      success: true,
      data: inventory,
        currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllPharmacyPatientsByDoctorID2 = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.headers.userid;
     const { searchText, status, page = 1, limit = 5 } = req.query;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid page or limit parameters",
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

exports.getAllPharmacyPatientsByDoctorID2 = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.headers.userid;
    const { searchText, status, page = 1, limit = 5 } = req.query;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid page or limit parameters",
      });
    }

    const skip = (pageNum - 1) * limitNum;
    console.log('Request params:', { doctorId, searchText, status, pageNum, limitNum, skip }); // Debug log

    // Build match conditions
    const matchConditions = { doctorId, isDeleted: false };
    if (searchText) {
      matchConditions.$or = [
        { patientId: { $regex: searchText, $options: 'i' } },
        // Will handle patientName search via userData after $lookup
      ];
    }
    console.log('Initial match conditions:', matchConditions); // Debug log

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: matchConditions,
      },
      {
        $lookup: {
          from: "medinventories",
          localField: "medInventoryId",
          foreignField: "_id",
          as: "inventoryData",
        },
      },
      {
        $unwind: {
          path: "$inventoryData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "userId",
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true,
        },
      },

      
      // Add searchText filter for patientName after userData lookup
      ...(searchText ? [{
        $match: {
          $or: [
            { patientId: { $regex: searchText, $options: 'i' } }, // Already in matchConditions, but included for clarity
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: [
                      { $ifNull: ["$userData.firstname", ""] },
                      " ",
                      { $ifNull: ["$userData.lastname", ""] },
                    ],
                  },
                  regex: searchText,
                  options: 'i',
                },
              },
            },
          ],
        },
      }] : []),
      {
        $group: {
          _id: "$patientId",
          patientName: {
            $first: {
              $concat: [
                { $ifNull: ["$userData.firstname", ""] },
                " ",
                { $ifNull: ["$userData.lastname", ""] },
              ],
            },
          },
          doctorId: { $first: "$doctorId" },
          latestCreatedAt: { $max: "$createdAt" },
          medicines: {
            $push: {
              _id: "$_id",
              medName: "$medName",
              price: { $ifNull: ["$inventoryData.price", null] },
              quantity: "$quantity",
              status: "$status",
             gst: { $ifNull: ["$inventoryData.gst", 6] },
             cgst: { $ifNull: ["$inventoryData.cgst", 6] },
              createdAt: "$createdAt",
              pharmacyMedID: "$pharmacyMedID",
            },
          },
        },
      },
      // Filter medicines by status
      {
        $project: {
          patientId: "$_id",
          patientName: 1,
          doctorId: 1,
          medicines: {
            $filter: {
              input: "$medicines",
              as: "medicine",
              cond: {
                $cond: {
                  if: { $eq: [status, "pending"] },
                  then: { $eq: ["$$medicine.status", "pending"] },
                  else: { $ne: ["$$medicine.status", "pending"] },
                },
              },
            },
          },
          _id: 0,
        },
      },
      // Remove patients with no matching medicines
      {
        $match: {
          medicines: { $ne: [] },
        },
      },
      {
        $sort: { latestCreatedAt: -1 }, // Sort by patientId descending (latest on top)
      },
      {
        $facet: {
          paginatedResults: [
            { $skip: skip },
            { $limit: limitNum },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ];
    console.log('Aggregation pipeline:', JSON.stringify(pipeline, null, 2)); // Debug log

    // Execute aggregation
    const [result] = await medicineModel.aggregate(pipeline);
    const patients = result?.paginatedResults || [];
    const totalPatients = result?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalPatients / limitNum);
    console.log('Results:', { patients: patients.length, totalPatients, totalPages }); // Debug log
// Step 2: Fetch addressId from Appointment Service
    for (let patient of patients) {
      try {
        const resp = await axios.get(
          `http://localhost:4005/appointment/getAppointmentDataByUserIdAndDoctorId`,
          {
            params: {
              doctorId: patient.doctorId,
              userId: patient.patientId,
            },
            headers: {
        'Content-Type': 'application/json',
        // Add authorization headers if needed
        // 'Authorization': `Bearer ${req.headers.authorization}`
      },
          },
           
        );
        const addressId = resp.data?.data?.addressId || null;
        patient.addressId = addressId;
      if (addressId) {
          const address = await UserAddress.findOne({ addressId }).lean();
          if (address && address.pharmacyName) {
            let pharmacyHeaderUrl = null;

console.log("Pharmacy header from DB:", address);

        if (address.pharmacyHeader) {
          // Generate signed S3 URL for pharmacy header image
          try {
            pharmacyHeaderUrl = await getSignedUrl(
              s3Client,
              new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: address.pharmacyHeader,
              }),
              { expiresIn: 300 }
            );
          } catch (s3Err) {
            console.error(`Error fetching S3 signed URL:`, s3Err.message);
          }
        }

            patient.pharmacyData = {
              pharmacyName: address.pharmacyName,
              pharmacyRegistrationNo: address.pharmacyRegistrationNo,
              pharmacyGst: address.pharmacyGst,
              pharmacyPan: address.pharmacyPan,
              pharmacyAddress: address.pharmacyAddress,
              pharmacyId: address.pharmacyId,
              pharmacyHeaderUrl,
            };
          } else {
            patient.pharmacyData = null;
          }
        } else {
          patient.pharmacyData = null;
        }
      } catch (err) {
        console.error(
          `Error fetching appointment or address for ${patient.patientId}`,
          err.message
        );
        patient.addressId = null;
        patient.pharmacyData = null;
      }
    }


    res.status(200).json({
      status: "success",
      message: "Pharmacy patients retrieved successfully",
      data: {
        patients,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPatients,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllPharmacyPatientsByDoctorID:", error);
    res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error",
    });
  }
};

exports.getAllPharmacyPatientsByDoctorID = async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.headers.userid;
    const { searchText, status, page = 1, limit = 5 } = req.query;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Validate pagination parameters
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1 || !Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid page or limit parameters",
      });
    }

    const skip = (pageNum - 1) * limitNum;

    // Default status behavior
    const effectiveStatus = (typeof status === "string") ? status : "pending";

    // Build match conditions (pre-lookup)
    const matchConditions = { doctorId, isDeleted: false };
    if (searchText) {
      matchConditions.$or = [
        { patientId: { $regex: searchText, $options: "i" } }, // name search handled post-lookup
      ];
    }

    // Build the status condition for $filter dynamically
    let statusCond;
    if (effectiveStatus === "pending") {
      statusCond = { $eq: ["$$medicine.status", "pending"] };
    } else if (effectiveStatus === "non-pending") {
      statusCond = { $ne: ["$$medicine.status", "pending"] };
    } else {
      // exact status match, e.g., "completed", "cancelled"
      statusCond = { $eq: ["$$medicine.status", effectiveStatus] };
    }

    // Calculate 48-hour threshold
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const pipeline = [
      { $match: matchConditions },

      // Lookup eprescriptions to get appointmentId and addressId
      {
        $lookup: {
          from: "eprescriptions",
          localField: "prescriptionId",
          foreignField: "prescriptionId",
          as: "prescriptionData",
        },
      },
      { $unwind: { path: "$prescriptionData", preserveNullAndEmptyArrays: true } },
      
       // Exclude medicines with no matching eprescription
      { $match: { prescriptionData: { $ne: null } } },
       {
        $lookup: {
          from: "medinventories",
          let: { medName: "$medName", dosage: "$dosage", doctorId: "$doctorId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toLower: "$medName" }, { $toLower: "$$medName" }] },
                    { $eq: [{ $toLower: "$dosage" }, { $toLower: "$$dosage" }] },
                    { $eq: ["$doctorId", "$$doctorId"] },
                  ],
                },
              },
            },
          ],
          as: "inventoryData",
        },
      },
      // {
      //   $lookup: {
      //     from: "medinventories",
      //     localField: "medInventoryId",
      //     foreignField: "_id",
      //     as: "inventoryData",
      //   },
      // },
      { $unwind: { path: "$inventoryData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "userId",
          as: "userData",
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

      // Name search after we have userData
      ...(searchText
        ? [
            {
              $match: {
                $or: [
                  { patientId: { $regex: searchText, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $trim: {
                            input: {
                              $concat: [
                                { $ifNull: ["$userData.firstname", ""] },
                                " ",
                                { $ifNull: ["$userData.lastname", ""] },
                              ],
                            },
                          },
                        },
                        regex: searchText,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),

      {
        $group: {
        _id: "$prescriptionId",  // Changed to group by prescriptionId (proxy for appointmentId)
        appointmentId: { $first: "$prescriptionData.appointmentId" },
          patientId: { $first: "$patientId" },
          patientName: {
            $first: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$userData.firstname", ""] },
                    " ",
                    { $ifNull: ["$userData.lastname", ""] },
                  ],
                },
              },
            },
          },
          doctorId: { $first: "$doctorId" },
          addressId: { $first: "$prescriptionData.addressId" },
          prescriptionCreatedAt: { $first: "$prescriptionData.createdAt" }, // Capture eprescriptions createdAt
          medicines: {
            $push: {
              _id: "$_id",
              medName: "$medName",
              dosage: "$dosage",
              price: { $ifNull: ["$inventoryData.price", null] },
              quantity: "$quantity",
              status: "$status",
              gst: { $ifNull: ["$inventoryData.gst", 6] },
              cgst: { $ifNull: ["$inventoryData.cgst", 6] },
              createdAt: "$createdAt",
              pharmacyMedID: "$pharmacyMedID",
            },
          },
        },
      },

      // IMPORTANT: sort BEFORE projecting away latestCreatedAt
     { $sort: { prescriptionCreatedAt: -1 } },

      // Filter medicines by effective status
      {
        $project: {
       prescriptionId: "$_id", // or appointmentId: "$_id" if grouping by appointmentId
          appointmentId: 1,
          patientId: 1,
          patientName: 1,
          doctorId: 1,
          addressId: 1,
           prescriptionCreatedAt: 1, 
          // keep latestCreatedAt if you want to show it to client; otherwise omit it
          // latestCreatedAt: 1,
          medicines: {
            $filter: {
              input: "$medicines",
              as: "medicine",
              cond: statusCond,
            },
          },
          _id: 0,
        },
      },

      // Drop patients that have no medicines after filtering
      { $match: { medicines: { $ne: [] } } },

      // Filter out pending prescriptions older than 48 hours
      {
        $match: {
          $or: [
            // Include groups with any non-pending medicines
            { medicines: { $elemMatch: { status: { $ne: "pending" } } } },
            // Include pending-only groups created within 48 hours
            {
              $and: [
                { medicines: { $not: { $elemMatch: { status: { $ne: "pending" } } } } },
                { prescriptionCreatedAt: { $gte: fortyEightHoursAgo } },
              ],
            },
          ],
        },
      },

      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result = { paginatedResults: [], totalCount: [] }] = await medicineModel.aggregate(pipeline);

    const prescriptions = result.paginatedResults || [];
    const totalPrescriptions = result.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalPrescriptions / limitNum);

    // Enrich with appointment + pharmacy header
    for (const prescription of prescriptions) {
      try {
       const addressId = prescription.addressId;
      
        if (addressId) {
          const address = await UserAddress.findOne({ addressId }).lean();
          if (address && address.pharmacyName) {
            let pharmacyHeaderUrl = null;

            if (address.pharmacyHeader) {
              try {
                pharmacyHeaderUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: address.pharmacyHeader,
                  }),
                  { expiresIn: 300 }
                );
              } catch (s3Err) {
                console.error("Error fetching S3 signed URL:", s3Err.message);
              }
            }

            prescription.pharmacyData = {
              pharmacyName: address.pharmacyName,
              pharmacyRegistrationNo: address.pharmacyRegistrationNo,
              pharmacyGst: address.pharmacyGst,
              pharmacyPan: address.pharmacyPan,
              pharmacyAddress: address.pharmacyAddress,
              pharmacyId: address.pharmacyId,
              pharmacyHeaderUrl,
            };
          } else {
            prescription.pharmacyData = null;
          }
        } else {
          prescription.pharmacyData = null;
        }
      } catch (err) {
        console.error(`Error fetching appointment or address for ${prescription.prescriptionId}`, err.message);
        prescription.addressId = null;
        prescription.pharmacyData = null;
      }
    }

    console.log("Patients retrieved:", prescriptions, "Total:", totalPrescriptions);

    return res.status(200).json({
      status: "success",
      message: "Pharmacy patients retrieved successfully",
      data: {
        patients:prescriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPatients:totalPrescriptions,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllPharmacyPatientsByDoctorID:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error",
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
        paymentMethod: Joi.string().valid("cash", "upi", "card").optional().default("cash"),
        
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
      paymentMethod,
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
      const { medicineId, price, pharmacyMedID, quantity } = medicine;

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
          actualAmount: price*quantity || amount,
          discount: discount || 0,
          discountType: discountType || "percentage",
          paymentStatus: "paid",
          paymentFrom: "pharmacy",
          paymentMethod : paymentMethod || 'cash',
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
console.log("Request body:", req.body); // Debug log
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }
console.log("Validation passed"); // Debug log
    const { medicineId, patientId, price, doctorId } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ userId: patientId });
    console.log("Patient found:", patient); // Debug log
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
console.log("Medicine found:", medicine); // Debug log
    if (!medicine) {
      return res.status(404).json({
        status: "fail",
        message: "Patient medicine record not found",
      });
    }

    // Check if medicine exists in MedInventory
    let medInventory = await medInventoryModel.findOne({
      medName: medicine.medName,
      dosage: { $regex: `^${medicine.dosage}$`, $options: "i" }, // Case-insensitive match
      doctorId,
    });

    console.log("MedInventory found:", medInventory); // Debug log
    if (!medInventory) {
      // Create new inventory entry if it doesn't exist
      medInventory = await medInventoryModel.create({
        medName: medicine.medName,
         dosage: medicine.dosage,
        price,
        quantity: medicine.quantity,
        doctorId,
      });
console.log("New MedInventory created:", medInventory); // Debug log
      // Update medicine with new medInventoryId
      await medicineModel.findByIdAndUpdate(
        medicineId,
        { $set: { medInventoryId: medInventory._id } },
        { new: true }
      );
    } else {
      console.log("Updating existing MedInventory"); // Debug log
      // Update existing inventory price
      medInventory = await medInventoryModel.findByIdAndUpdate(
        medInventory._id,
        { $set: { price } },
        { new: true }
      );
    }
console.log("MedInventory after update:", medInventory); // Debug log
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
console.log("Medicine after price update:", updatedMedicine); // Debug log
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
