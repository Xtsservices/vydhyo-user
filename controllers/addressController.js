
const User = require('../models/usersModel');
const { v4: uuidv4 } = require('uuid');
const UserAddress = require('../models/addressModel');
const addressValidationSchema = require('../schemas/addressSchema');
const updateAddressValidationSchema = require('../schemas/updateAddressSchema');
const dotenv = require('dotenv');
const axios = require('axios');
const deleteAddressValidationSchema = require('../schemas/deleteClinicSchema');
dotenv.config();
const Sequence = require("../sequence/sequenceSchema");
const sequenceConstant = require('../utils/constants')

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const multer = require('multer');
const pharmacyMapping = require('../models/pharmacyMapping');
const labMapping = require('../models/labMapping');
const crypto = require("crypto");
const qrCodeModel = require('../models/qrCodeModel');

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload2 = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG and PNG images are allowed'));
  },
}).single('file');

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG and PNG images are allowed'));
  },
});


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

const generateFileName = (bytes = 16) =>
  crypto.randomBytes(bytes).toString("hex");


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


exports.addAddressFromWeb2 = async (req, res) => {
  console.log("am in====", req.body)
  console.log("am in====labname", req.body.labName)
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;
    const { error } = addressValidationSchema.validate(req.body, { abortEarly: false });
  console.log("am in====", error)

    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    // Check for existing pharmacy/lab by registration number
    if (req.body.pharmacyRegistrationNo) {
      const existingPharmacy = await UserAddress.findOne({
        pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
        pharmacyId: { $ne: null }
      });
  console.log("am in==5==")
      
      if (existingPharmacy) {
        const existingMapping = await pharmacyMapping.findOne({
          pharmacyId: existingPharmacy.pharmacyId,
          doctorId: userId
        });
  console.log("am in=6===")
        
        if (!existingMapping) {
          // Return warning for duplicate pharmacy
          return res.status(200).json({
            status: 'warning',
            message: 'This pharmacy is already registered with another doctor. Do you want to link it?',
            data: {
              pharmacyId: existingPharmacy.pharmacyId,
              existingDoctorId: existingPharmacy.userId
            }
          });
        }
      }
    }
  console.log("am in==7==")

    if (req.body.labRegistrationNo) {
      const existingLab = await UserAddress.findOne({
        labRegistrationNo: req.body.labRegistrationNo,
        labId: { $ne: null }
      });
  console.log("am in==9==")
      
      if (existingLab) {
        const existingMapping = await labMapping.findOne({
          labId: existingLab.labId,
          doctorId: userId
        });
  console.log("am in==2==")
        
        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This lab is already registered with another doctor. Do you want to link it?',
            data: {
              labId: existingLab.labId,
              existingDoctorId: existingLab.userId
            }
          });
        }
      }
    }
  console.log("am in==1==")

    // Handle file uploads for pharmacy/lab headers
    const file = req.file;
  console.log("am in====file",file)

    let photo = null;
    if (file) {
      photo = generateFileName();
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Body: file.buffer,
        Key: photo,
        ContentType: file.mimetype
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      
      if (req.body.pharmacyName) {
        req.body.pharmacyHeader = photo;
      } else if (req.body.labName) {
        req.body.labHeader = photo;
      } else {
        req.body.headerImage = photo;
      }
    }
  console.log("am in==23==")

    // Generate IDs for new pharmacy/lab
    if (req.body.pharmacyName && !req.body.pharmacyId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.PHARMACY_SEQUENCE.PHARMACY_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.pharmacyId = sequenceConstant.PHARMACY_SEQUENCE.SEQUENCE.concat(counter.seq);
    }
  console.log("am in==34==")

    if (req.body.labName && !req.body.labId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.LAB_SEQUENCE.LAB_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.labId = sequenceConstant.LAB_SEQUENCE.SEQUENCE.concat(counter.seq);
    }
  console.log("am in===67=")

    req.body.createdBy = userId;
    req.body.updatedBy = userId;
    req.body.addressId = uuidv4().replace(/-/g, '');
    req.body.status = 'Active';
    req.body.createdAt = new Date();
    req.body.updatedAt = new Date();
  console.log("am in==78==")

    const userAddress = await UserAddress.create(req.body);
  console.log("am in==89==")

    // Create mapping entries
    if (req.body.pharmacyId) {
      await pharmacyMapping.create({
        doctorId: userId,
        clinicId: req.body.addressId,
        pharmacyId: req.body.pharmacyId,
        status: 'Active'
      });
    }
  console.log("am in==678==")

    if (req.body.labId) {
      await labMapping.create({
        doctorId: userId,
        clinicId: req.body.addressId,
        labId: req.body.labId,
        status: 'Active'
      });
    }
  console.log("am in==677==")

    // Get mapping counts
    const pharmacyMappingCount = req.body.pharmacyId 
      ? await pharmacyMapping.countDocuments({ pharmacyId: req.body.pharmacyId, status: 'Active' })
      : 0;
    const labMappingCount = req.body.labId 
      ? await labMapping.countDocuments({ labId: req.body.labId, status: 'Active' })
      : 0;
  console.log("am in===99876=")

    return res.status(201).json({
      status: 'success',
      message: 'Address added successfully',
      data: {
        userAddress,
        pharmacyMappingCount,
        labMappingCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.addAddressFromWeb = async (req, res) => {
  console.log("Incoming Body:", req.body);

  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;
 const bypassCheck = req.query.bypassCheck
    // Validate
    const { error } = addressValidationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details.map(e => e.message).join(', '),
      });
    }

    /** ─────────────── Pharmacy check ─────────────── **/
    if (req.body.pharmacyRegistrationNo && !bypassCheck) {
      const existingPharmacy = await UserAddress.findOne({
        pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
        pharmacyId: { $ne: null },
         userId: { $ne: userId }
      });

      if (existingPharmacy) {
        // If same doctor, allow linking silently
        const existingMapping = await pharmacyMapping.findOne({
          pharmacyId: existingPharmacy.pharmacyId,
          doctorId: userId
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This pharmacy is already registered with another doctor. Do you want to link it?',
            data: {
              pharmacyId: existingPharmacy.pharmacyId,
              existingDoctorId: existingPharmacy.userId
            }
          });
        }
      }
    }

    /** ─────────────── Lab check ─────────────── **/
    if (req.body.labRegistrationNo && !bypassCheck) {
      const existingLab = await UserAddress.findOne({
        labRegistrationNo: req.body.labRegistrationNo,
        labId: { $ne: null }
      });

      if (existingLab) {
        const existingMapping = await labMapping.findOne({
          labId: existingLab.labId,
          doctorId: userId
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This lab is already registered with another doctor. Do you want to link it?',
            data: {
              labId: existingLab.labId,
              existingDoctorId: existingLab.userId
            }
          });
        }
      }
    }

      /** ─────────────── ID generation ─────────────── **/
    if (req.body.pharmacyName && !req.body.pharmacyId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.PHARMACY_SEQUENCE.PHARMACY_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.pharmacyId = sequenceConstant.PHARMACY_SEQUENCE.SEQUENCE + counter.seq;
    }

    if (req.body.labName && !req.body.labId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.LAB_SEQUENCE.LAB_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.labId = sequenceConstant.LAB_SEQUENCE.SEQUENCE + counter.seq;
    }

    /** ─────────────── Generate addressId ─────────────── **/
     req.body.createdBy = userId;
    req.body.updatedBy = userId;
    req.body.addressId = uuidv4().replace(/-/g, '');
    req.body.status = 'Active';
    req.body.createdAt = new Date();
    req.body.updatedAt = new Date();

    /** ─────────────── File Upload (optional) ─────────────── **/
   /** ─────────────── File Upload (optional) ─────────────── **/
if (req.files) {
  const qrCodeEntries = [];

  // Clinic Header (file)
      if (req.files['file'] && req.files['file'][0]) {
        const headerPhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['file'][0].buffer,
          Key: headerPhoto,
          ContentType: req.files['file'][0].mimetype,
        }));
        req.body.headerImage = headerPhoto;
      }

      // Digital Signature (signature)
      if (req.files['signature'] && req.files['signature'][0]) {
        const signaturePhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['signature'][0].buffer,
          Key: signaturePhoto,
          ContentType: req.files['signature'][0].mimetype,
        }));
        req.body.digitalSignature = signaturePhoto;
      }
      
  // Pharmacy Header
  if (req.files['pharmacyHeader'] && req.files['pharmacyHeader'][0]) {
    const pharmacyPhoto = generateFileName();
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Body: req.files['pharmacyHeader'][0].buffer,
      Key: pharmacyPhoto,
      ContentType: req.files['pharmacyHeader'][0].mimetype
    }));
    req.body.pharmacyHeader = pharmacyPhoto;
  }

  // Lab Header
  if (req.files['labHeader'] && req.files['labHeader'][0]) {
    const labPhoto = generateFileName();
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Body: req.files['labHeader'][0].buffer,
      Key: labPhoto,
      ContentType: req.files['labHeader'][0].mimetype
    }));
    req.body.labHeader = labPhoto;
  }

   // Clinic QR Code
      if (req.files['clinicQR'] && req.files['clinicQR'][0] && ['Clinic', 'Hospital'].includes(req.body.type)) {
        let existingQR = await qrCodeModel.findOne({ addressId: req.body.addressId, type: 'Clinic' });
        let clinicQRPhoto;
        if (!existingQR) {
          clinicQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['clinicQR'][0].buffer,
              Key: clinicQRPhoto,
              ContentType: req.files['clinicQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Clinic',
            qrCode: clinicQRPhoto,
            createdBy: userId,
            updatedBy: userId,
          });
        } else {
          clinicQRPhoto = existingQR.qrCode; // Reuse existing QR code
          qrCodeEntries.push(existingQR);
        }
        req.body.clinicQrCode = clinicQRPhoto; // Store in Address model
      }

      
      // Pharmacy QR Code
      if (req.files['pharmacyQR'] && req.files['pharmacyQR'][0] && req.body.pharmacyName && req.body.pharmacyRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ pharmacyRegistrationNo: req.body.pharmacyRegistrationNo, type: 'Pharmacy' });
        let pharmacyQRPhoto;
        if (!existingQR) {
          pharmacyQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['pharmacyQR'][0].buffer,
              Key: pharmacyQRPhoto,
              ContentType: req.files['pharmacyQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Pharmacy',
            qrCode: pharmacyQRPhoto,
            pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
            pharmacyId: req.body.pharmacyId,
            createdBy: userId,
            updatedBy: userId,
          });
        } else {
          pharmacyQRPhoto = existingQR.qrCode; // Reuse existing QR code
          qrCodeEntries.push(existingQR);
        }
        req.body.pharmacyQrCode = pharmacyQRPhoto; // Store in Address model
      }

      // Lab QR Code
      if (req.files['labQR'] && req.files['labQR'][0] && req.body.labName && req.body.labRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ labRegistrationNo: req.body.labRegistrationNo ,  type: 'Lab'});
        let labQRPhoto;
        if (!existingQR) {
          labQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['labQR'][0].buffer,
              Key: labQRPhoto,
              ContentType: req.files['labQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Lab',
            qrCode: labQRPhoto,
            labRegistrationNo: req.body.labRegistrationNo,
            labId: req.body.labId,
            createdBy: userId,
            updatedBy: userId,
          });
        } else {
          labQRPhoto = existingQR.qrCode; // Reuse existing QR code
          qrCodeEntries.push(existingQR);
        }
        req.body.labQrCode = labQRPhoto; // Store in Address model
      }

      // Save new QR codes to the QRCode collection
if (qrCodeEntries.length > 0) {
  for (const qrCode of qrCodeEntries) {
    if (!qrCode._id) { // Only save new QR codes
      await qrCodeModel.create(qrCode);
    }
  }
}
}


  

    /** ─────────────── Create Address ─────────────── **/

    const userAddress = await UserAddress.create(req.body);

    /** ─────────────── Create mappings ─────────────── **/
    if (req.body.pharmacyId) {
      await pharmacyMapping.create({
        doctorId: userId,
        clinicId: req.body.addressId,
        pharmacyId: req.body.pharmacyId,
         pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
        status: 'Active'
      });
    }

    if (req.body.labId) {
      await labMapping.create({
        doctorId: userId,
        clinicId: req.body.addressId,
        labId: req.body.labId,
        status: 'Active'
      });
    }

    /** ─────────────── Count mappings ─────────────── **/
    const pharmacyMappingCount = req.body.pharmacyId
      ? await pharmacyMapping.countDocuments({ pharmacyId: req.body.pharmacyId, status: 'Active' })
      : 0;
    const labMappingCount = req.body.labId
      ? await labMapping.countDocuments({ labId: req.body.labId, status: 'Active' })
      : 0;

    return res.status(201).json({
      status: 'success',
      message: 'Address added successfully',
      data: {
        userAddress,
        pharmacyMappingCount,
        labMappingCount
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Clinic name already exists',
      });
    }
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};





exports.updateImagesAddress = async (req, res) => {
  console.log("Incoming Body:", req.body);
  console.log("Incoming Files:", req.files);

  try {
    const userId = req.body.userId || req.headers.userid;
    const addressId = req.body.addressId;

    if (!addressId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Address ID is required',
      });
    }

    // Find existing address
    const existingAddress = await UserAddress.findOne({ addressId, userId });
    if (!existingAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'Address not found or you do not have permission to update it',
      });
    }

    const bypassCheck = req.query.bypassCheck;

    /** ─────────────── Pharmacy check ─────────────── **/
    if (req.body.pharmacyRegistrationNo && !bypassCheck) {
      const existingPharmacy = await UserAddress.findOne({
        pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
        pharmacyId: { $ne: null },
        userId: { $ne: userId },
      });

      if (existingPharmacy && existingPharmacy.addressId !== addressId) {
        const existingMapping = await pharmacyMapping.findOne({
          pharmacyId: existingPharmacy.pharmacyId,
          doctorId: userId,
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This pharmacy is already registered with another doctor. Do you want to link it?',
            data: {
              pharmacyId: existingPharmacy.pharmacyId,
              existingDoctorId: existingPharmacy.userId,
            },
          });
        }
      }
    }

    /** ─────────────── Lab check ─────────────── **/
    if (req.body.labRegistrationNo && !bypassCheck) {
      const existingLab = await UserAddress.findOne({
        labRegistrationNo: req.body.labRegistrationNo,
        labId: { $ne: null },
      });

      if (existingLab && existingLab.addressId !== addressId) {
        const existingMapping = await labMapping.findOne({
          labId: existingLab.labId,
          doctorId: userId,
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This lab is already registered with another doctor. Do you want to link it?',
            data: {
              labId: existingLab.labId,
              existingDoctorId: existingLab.userId,
            },
          });
        }
      }
    }

    /** ─────────────── File Upload (optional) ─────────────── **/
    const qrCodeEntries = [];
    const updateFields = {}; // Define updateFields here

    // Clinic Header (file)
    if (req.files['file'] && req.files['file'][0]) {
      console.log("Processing Clinic Header Upload");
      const headerPhoto = generateFileName();
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['file'][0].buffer,
          Key: headerPhoto,
          ContentType: req.files['file'][0].mimetype,
        })
      );
      updateFields.headerImage = headerPhoto;
    }

    // Digital Signature (signature)
    if (req.files['signature'] && req.files['signature'][0]) {
      console.log("Processing Digital Signature Upload");
      const signaturePhoto = generateFileName();
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['signature'][0].buffer,
          Key: signaturePhoto,
          ContentType: req.files['signature'][0].mimetype,
        })
      );
      updateFields.digitalSignature = signaturePhoto;
    }

    // Pharmacy Header
    if (req.files['pharmacyHeader'] && req.files['pharmacyHeader'][0]) {
      console.log("Processing Pharmacy Header Upload");
      const pharmacyPhoto = generateFileName();
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['pharmacyHeader'][0].buffer,
          Key: pharmacyPhoto,
          ContentType: req.files['pharmacyHeader'][0].mimetype,
        })
      );
      updateFields.pharmacyHeader = pharmacyPhoto;
    }

    // Lab Header
    if (req.files['labHeader'] && req.files['labHeader'][0]) {
      console.log("Processing Lab Header Upload");
      const labPhoto = generateFileName();
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['labHeader'][0].buffer,
          Key: labPhoto,
          ContentType: req.files['labHeader'][0].mimetype,
        })
      );
      updateFields.labHeader = labPhoto;
    }

    // Clinic QR Code
    if (req.files['clinicQR'] && req.files['clinicQR'][0]) {
      console.log("Processing Clinic QR Code Upload, Type:", req.body.type);
      if (['Clinic', 'Hospital'].includes(req.body.type)) {
        let existingQR = await qrCodeModel.findOne({ addressId, type: 'Clinic' });
        const clinicQRPhoto = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: req.files['clinicQR'][0].buffer,
            Key: clinicQRPhoto,
            ContentType: req.files['clinicQR'][0].mimetype,
          })
        );
        if (!existingQR) {
          qrCodeEntries.push({
            addressId,
            userId,
            type: 'Clinic',
            qrCode: clinicQRPhoto,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          existingQR.qrCode = clinicQRPhoto;
          existingQR.updatedBy = userId;
          existingQR.updatedAt = new Date();
          qrCodeEntries.push(existingQR);
        }
        updateFields.clinicQrCode = clinicQRPhoto;
      } else {
        console.log("Clinic QR Code skipped: Invalid type");
      }
    }

    // Pharmacy QR Code
    if (req.files['pharmacyQR'] && req.files['pharmacyQR'][0]) {
      console.log("Processing Pharmacy QR Code Upload, Pharmacy Name:", req.body.pharmacyName, "Registration No:", req.body.pharmacyRegistrationNo);
      // Relax condition to allow update if pharmacyId exists in existingAddress
      if (req.body.pharmacyName && req.body.pharmacyRegistrationNo || existingAddress.pharmacyId) {
        let existingQR = await qrCodeModel.findOne({ 
          pharmacyRegistrationNo: req.body.pharmacyRegistrationNo || existingAddress.pharmacyRegistrationNo, 
          type: 'Pharmacy' 
        });
        const pharmacyQRPhoto = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: req.files['pharmacyQR'][0].buffer,
            Key: pharmacyQRPhoto,
            ContentType: req.files['pharmacyQR'][0].mimetype,
          })
        );
        if (!existingQR) {
          qrCodeEntries.push({
            addressId,
            userId,
            type: 'Pharmacy',
            qrCode: pharmacyQRPhoto,
            pharmacyRegistrationNo: req.body.pharmacyRegistrationNo || existingAddress.pharmacyRegistrationNo,
            pharmacyId: req.body.pharmacyId || existingAddress.pharmacyId,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          existingQR.qrCode = pharmacyQRPhoto;
          existingQR.updatedBy = userId;
          existingQR.updatedAt = new Date();
          qrCodeEntries.push(existingQR);
        }
        updateFields.pharmacyQrCode = pharmacyQRPhoto;
      } else {
        console.log("Pharmacy QR Code skipped: Missing pharmacyName or pharmacyRegistrationNo and no existing pharmacyId");
      }
    }

    // Lab QR Code
    if (req.files['labQR'] && req.files['labQR'][0]) {
      console.log("Processing Lab QR Code Upload, Lab Name:", req.body.labName, "Registration No:", req.body.labRegistrationNo);
      // Relax condition to allow update if labId exists in existingAddress
      if (req.body.labName && req.body.labRegistrationNo || existingAddress.labId) {
        let existingQR = await qrCodeModel.findOne({ 
          labRegistrationNo: req.body.labRegistrationNo || existingAddress.labRegistrationNo, 
          type: 'Lab' 
        });
        const labQRPhoto = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: req.files['labQR'][0].buffer,
            Key: labQRPhoto,
            ContentType: req.files['labQR'][0].mimetype,
          })
        );
        if (!existingQR) {
          qrCodeEntries.push({
            addressId,
            userId,
            type: 'Lab',
            qrCode: labQRPhoto,
            labRegistrationNo: req.body.labRegistrationNo || existingAddress.labRegistrationNo,
            labId: req.body.labId || existingAddress.labId,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          existingQR.qrCode = labQRPhoto;
          existingQR.updatedBy = userId;
          existingQR.updatedAt = new Date();
          qrCodeEntries.push(existingQR);
        }
        updateFields.labQrCode = labQRPhoto;
      } else {
        console.log("Lab QR Code skipped: Missing labName or labRegistrationNo and no existing labId");
      }
    }

    // Save or update QR codes
    if (qrCodeEntries.length > 0) {
      console.log("Saving/Updating QR Codes:", qrCodeEntries);
      for (const qrCode of qrCodeEntries) {
        if (!qrCode._id) {
          await qrCodeModel.create(qrCode);
        } else {
          await qrCodeModel.updateOne({ _id: qrCode._id }, { $set: qrCode });
        }
      }
    }

    // Update Address with new fields
    updateFields.updatedBy = userId;
    updateFields.updatedAt = new Date();

    console.log("Updating Address with fields:", updateFields);
    const updatedAddress = await UserAddress.findOneAndUpdate(
      { addressId, userId },
      { $set: updateFields },
      { new: true }
    );

    /** ─────────────── Update mappings ─────────────── **/
    if (req.body.pharmacyId) {
      await pharmacyMapping.updateOne(
        { doctorId: userId, clinicId: addressId },
        {
          $set: {
            pharmacyId: req.body.pharmacyId,
            pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
            status: 'Active',
          },
        },
        { upsert: true }
      );
    }

    if (req.body.labId) {
      await labMapping.updateOne(
        { doctorId: userId, clinicId: addressId },
        {
          $set: {
            labId: req.body.labId,
            status: 'Active',
          },
        },
        { upsert: true }
      );
    }

    /** ─────────────── Count mappings ─────────────── **/
    const pharmacyMappingCount = req.body.pharmacyId
      ? await pharmacyMapping.countDocuments({ pharmacyId: req.body.pharmacyId, status: 'Active' })
      : 0;
    const labMappingCount = req.body.labId
      ? await labMapping.countDocuments({ labId: req.body.labId, status: 'Active' })
      : 0;

    return res.status(200).json({
      status: 'success',
      message: 'Address updated successfully',
      data: {
        userAddress: updatedAddress,
        pharmacyMappingCount,
        labMappingCount,
      },
    });
  } catch (error) {
    console.error("Error updating address:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Clinic name already exists',
      });
    }
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};


//add pharmacy to existing clinic
exports.addPharmacyToClinic = async (req, res) => {
  try {
    const { userId, addressId, pharmacyName, pharmacyRegistrationNo, pharmacyGst, pharmacyPan, pharmacyAddress } = req.body;
 const bypassCheck = req.query.bypassCheck;
    // Step 1: Check if clinic exists
    const clinic = await UserAddress.findOne({ userId, addressId, type: { $in: ['Clinic', 'Hospital'] } });
    if (!clinic) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic not found for this user'
      });
    }

 // Step 2: Pharmacy duplication check
     /** ─────────────── Pharmacy duplication check ─────────────── **/
    if (pharmacyRegistrationNo && !bypassCheck) {
      const existingPharmacy = await UserAddress.findOne({
        pharmacyRegistrationNo,
        pharmacyId: { $ne: null },
        userId: { $ne: userId }
      });

      if (existingPharmacy) {
        const existingMapping = await pharmacyMapping.findOne({
          pharmacyId: existingPharmacy.pharmacyId,
          doctorId: userId
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This pharmacy is already registered with another doctor. Do you want to link it?',
            data: {
              pharmacyId: existingPharmacy.pharmacyId,
              existingDoctorId: existingPharmacy.userId
            }
          });
        }
      }
    }
    // Step 3: Handle file uploads
  let pharmacyHeader = clinic.pharmacyHeader;
    let pharmacyQrCode = clinic.pharmacyQrCode;
    const qrCodeEntries = [];

    if (req.files) {
      // Pharmacy Header
      if (req.files['pharmacyHeader'] && req.files['pharmacyHeader'][0]) {
        const fileName = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: req.files['pharmacyHeader'][0].buffer,
            Key: fileName,
            ContentType: req.files['pharmacyHeader'][0].mimetype,
          })
        );
        pharmacyHeader = fileName;
      }

      // Pharmacy QR Code
      if (req.files['pharmacyQR'] && req.files['pharmacyQR'][0] && pharmacyName && pharmacyRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ pharmacyRegistrationNo, type: 'Pharmacy' });
        let pharmacyQRPhoto;
        if (!existingQR) {
          pharmacyQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['pharmacyQR'][0].buffer,
              Key: pharmacyQRPhoto,
              ContentType: req.files['pharmacyQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId,
            userId,
            type: 'Pharmacy',
            qrCode: pharmacyQRPhoto,
            pharmacyRegistrationNo,
            pharmacyId: clinic.pharmacyId || null, // Will be set below if not already set
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          pharmacyQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['pharmacyQR'][0].buffer,
              Key: pharmacyQRPhoto,
              ContentType: req.files['pharmacyQR'][0].mimetype,
            })
          );
          await qrCodeModel.updateOne(
            { pharmacyRegistrationNo, type: 'Pharmacy' },
            { qrCode: pharmacyQRPhoto, updatedBy: userId, updatedAt: new Date() }
          );
          qrCodeEntries.push({ ...existingQR.toObject(), qrCode: pharmacyQRPhoto, updatedBy: userId, updatedAt: new Date() });
        }
        pharmacyQrCode = pharmacyQRPhoto;
      }
    }

  

    // Step 4: Generate pharmacyId if missing
    let pharmacyId = clinic.pharmacyId;
    if (!pharmacyId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.PHARMACY_SEQUENCE.PHARMACY_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      pharmacyId = sequenceConstant.PHARMACY_SEQUENCE.SEQUENCE + counter.seq;
    }
// Step 5: Save new QR codes to the QRCode collection
    if (qrCodeEntries.length > 0) {
      for (const qrCode of qrCodeEntries) {
        if (!qrCode._id) {
          qrCode.pharmacyId = pharmacyId; // Ensure pharmacyId is set
          await qrCodeModel.create(qrCode);
        }
      }
    }
    // Step 6: Update clinic record with pharmacy details
    clinic.pharmacyName = pharmacyName;
    clinic.pharmacyRegistrationNo = pharmacyRegistrationNo;
    clinic.pharmacyGst = pharmacyGst;
    clinic.pharmacyPan = pharmacyPan;
    clinic.pharmacyAddress = pharmacyAddress;
    clinic.pharmacyHeader = pharmacyHeader || clinic.pharmacyHeader;
    clinic.pharmacyQrCode = pharmacyQrCode;
    clinic.pharmacyId = pharmacyId;
    clinic.updatedBy = userId;
    clinic.updatedAt = new Date();

    await clinic.save();

    return res.status(200).json({
      status: 'success',
      message: 'Pharmacy added/updated successfully for clinic',
      data: clinic
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

exports.getPharmacyByClinicId = async (req, res) => {
  try {
    const {addressId} = req.params
    const userId = req.headers.userid || req.query.userId
   

    // Step 1: Find clinic with pharmacy
    const clinic = await UserAddress.findOne({ userId, addressId, type: { $in: ['Clinic', 'Hospital'] } });
    if (!clinic) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic not found for this user'
      });
    }

    // Step 2: If pharmacy not set
    if (!clinic.pharmacyId) {
      return res.status(404).json({
        status: 'fail',
        message: 'No pharmacy found for this clinic'
      });
    }

    // Step 3: Generate signed URL for pharmacyHeader if available
    let pharmacyHeaderUrl = null;


      if (clinic.pharmacyHeader) {
              // Generate signed S3 URL for pharmacy header image
              try {
                pharmacyHeaderUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: clinic.pharmacyHeader,
                  }),
                  { expiresIn: 300 }
                );
              } catch (s3Err) {
                console.error(`Error fetching S3 signed URL:`, s3Err.message);
              }
            }

    // Step 4: Return pharmacy details
    return res.status(200).json({
      status: 'success',
      data: {
        pharmacyId: clinic.pharmacyId,
        pharmacyName: clinic.pharmacyName,
        pharmacyRegistrationNo: clinic.pharmacyRegistrationNo,
        pharmacyGst: clinic.pharmacyGst,
        pharmacyPan: clinic.pharmacyPan,
        pharmacyAddress: clinic.pharmacyAddress,
        pharmacyHeader: pharmacyHeaderUrl, // signed URL (if exists)
        updatedAt: clinic.updatedAt
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};




//add lab to existing clinic
exports.addLabToClinic = async (req, res) => {
  try {
    const {
      userId,
      addressId,
      labName,
      labRegistrationNo,
      labGst,
      labPan,
      labAddress
    } = req.body;


const bypassCheck = req.query.bypassCheck || false; // confirmation flag from FE

    console.log("Incoming lab data:", req.body);

    // ─────────────── Lab duplication check ───────────────
    if (labRegistrationNo && !bypassCheck) {
      const existingLab = await UserAddress.findOne({
        labRegistrationNo,
        labId: { $ne: null },
        userId: { $ne: userId }
      });

      if (existingLab) {
        const existingMapping = await labMapping.findOne({
          labId: existingLab.labId,
          doctorId: userId
        });

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This lab is already registered with another doctor. Do you want to link it?',
            data: {
              labId: existingLab.labId,
              existingDoctorId: existingLab.userId
            }
          });
        }
      }
    }

    // 1. Check if clinic exists
    const clinic = await UserAddress.findOne({ userId, addressId, type: { $in: ['Clinic', 'Hospital'] } });
console.log("clinic=====", clinic)

    if (!clinic) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic not found for this user'
      });
    }

console.log("req.file====",req.file)

    // 2. Optional lab header image upload
   let labHeader = clinic.labHeader;
    let labQrCode = clinic.labQrCode;
    const qrCodeEntries = [];
    if (req.files) {
      // Lab Header
      if (req.files['labHeader'] && req.files['labHeader'][0]) {
        const fileName = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: req.files['labHeader'][0].buffer,
            Key: fileName,
            ContentType: req.files['labHeader'][0].mimetype,
          })
        );
        labHeader = fileName;
      }

      // Lab QR Code
      if (req.files['labQR'] && req.files['labQR'][0] && labName && labRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ labRegistrationNo, type: 'Lab' });
        let labQRPhoto;
        if (!existingQR) {
          labQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['labQR'][0].buffer,
              Key: labQRPhoto,
              ContentType: req.files['labQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId,
            userId,
            type: 'Lab',
            qrCode: labQRPhoto,
            labRegistrationNo,
            labId: clinic.labId || null, // Will be set below if not already set
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          labQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['labQR'][0].buffer,
              Key: labQRPhoto,
              ContentType: req.files['labQR'][0].mimetype,
            })
          );
          await qrCodeModel.updateOne(
            { labRegistrationNo, type: 'Lab' },
            { qrCode: labQRPhoto, updatedBy: userId, updatedAt: new Date() }
          );
          qrCodeEntries.push({ ...existingQR.toObject(), qrCode: labQRPhoto, updatedBy: userId, updatedAt: new Date() });
        }
        labQrCode = labQRPhoto;
      }
    }


    // 3. Generate labId if not already present
    let labId = clinic.labId;
    if (!labId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.LAB_SEQUENCE.LAB_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      labId = sequenceConstant.LAB_SEQUENCE.SEQUENCE + counter.seq;
    }

    // Step 4: Save new QR codes to the QRCode collection
    if (qrCodeEntries.length > 0) {
      for (const qrCode of qrCodeEntries) {
        if (!qrCode._id) {
          qrCode.labId = labId; // Ensure labId is set
          await qrCodeModel.create(qrCode);
        }
      }
    }

    // 5. Update clinic record with lab details
    clinic.labName = labName;
    clinic.labRegistrationNo = labRegistrationNo;
    clinic.labGst = labGst;
    clinic.labPan = labPan;
    clinic.labAddress = labAddress;
    clinic.labHeader = labHeader || clinic.labHeader;
     clinic.labQrCode = labQrCode;
    clinic.labId = labId;
    clinic.updatedBy = userId;
    clinic.updatedAt = new Date();

    await clinic.save();

    // 5. Create or update LabMapping
    await labMapping.findOneAndUpdate(
      { doctorId: userId, clinicId: addressId },
      {
        doctorId: userId,
        clinicId: addressId,
        labId,
        status: 'Active',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Lab added/updated successfully for clinic',
      data: clinic
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};



exports.getLabByClinicId = async (req, res) => {
  try {
    const {addressId} = req.params
    const userId = req.headers.userid || req.query.userId
   

    // Step 1: Find clinic/hospital with lab details
    const clinic = await UserAddress.findOne({
      userId,
      addressId,
      type: { $in: ['Clinic', 'Hospital'] }
    });

    if (!clinic) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic not found for this user'
      });
    }

    // Step 2: Ensure lab exists
    if (!clinic.labId) {
      return res.status(404).json({
        status: 'fail',
        message: 'No lab found for this clinic'
      });
    }

    // Step 3: Generate signed URL for labHeader if available
    let labHeaderUrl = null;

     if (clinic.labHeader) {
              // Generate signed S3 URL for pharmacy header image
              try {
                labHeaderUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: clinic.labHeader,
                  }),
                  { expiresIn: 300 }
                );
              } catch (s3Err) {
                console.error(`Error fetching S3 signed URL:`, s3Err.message);
              }
            }

    // Step 4: Return lab details
    return res.status(200).json({
      status: 'success',
      data: {
        labId: clinic.labId,
        labName: clinic.labName,
        labRegistrationNo: clinic.labRegistrationNo,
        labGst: clinic.labGst,
        labPan: clinic.labPan,
        labAddress: clinic.labAddress,
        labHeader: labHeaderUrl,
        updatedAt: clinic.updatedAt
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};



// New endpoint to confirm linking existing pharmacy/lab
exports.confirmLinkExisting = async (req, res) => {
  try {
    const { userId, clinicId, pharmacyId, labId } = req.body;
    
    if (pharmacyId) {
      await pharmacyMapping.create({
        doctorId: userId,
        clinicId,
        pharmacyId,
        status: 'Active'
      });
    }

    if (labId) {
      await labMapping.create({
        doctorId: userId,
        clinicId,
        labId,
        status: 'Active'
      });
    }

    const pharmacyMappingCount = pharmacyId 
      ? await pharmacyMapping.countDocuments({ pharmacyId, status: 'Active' })
      : 0;
    const labMappingCount = labId 
      ? await labMapping.countDocuments({ labId, status: 'Active' })
      : 0;

    return res.status(200).json({
      status: 'success',
      message: 'Successfully linked existing pharmacy/lab',
      data: {
        pharmacyMappingCount,
        labMappingCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};



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

exports.getClinicAddress2 = async (req, res) => {
  try { 
    const userId = req.query.doctorId || req.headers.userid;
    const userAddress = await UserAddress.find({userId});
    // if (!userAddress || userAddress.length === 0) { 
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'No clinic or hospital address found for this user',
    //   });
    // }

    const addressesWithUrls = [];
    for (const address of userAddress) {
      let headerImageUrl = null;
      let digitalSignatureUrl = null;
      let labHeaderUrl = null;

      // Generate pre-signed URL for headerImage if it exists
      if (address.headerImage) {
        try {
          headerImageUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: address.headerImage,
            }),
            { expiresIn: 300 } // 5 minutes
          );
        } catch (s3Error) {
          console.error(`Failed to generate pre-signed URL for headerImage ${address.headerImage}:`, s3Error);
        }
      }

      // Generate pre-signed URL for digitalSignature if it exists
      if (address.digitalSignature) {
        try {
          digitalSignatureUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: address.digitalSignature,
            }),
            { expiresIn: 300 } // 5 minutes
          );
        } catch (s3Error) {
          console.error(`Failed to generate pre-signed URL for digitalSignature ${address.digitalSignature}:`, s3Error);
        }
      }

      

      // Add address with pre-signed URLs to the result array
      addressesWithUrls.push({
        ...address.toObject(), // Convert Mongoose document to plain object
        headerImage: headerImageUrl || address.headerImage, // Use URL if generated, else keep original
        digitalSignature: digitalSignatureUrl || address.digitalSignature, // Use URL if generated, else keep original
      });
    }
    return res.status(200).json({
      status: 'success',
      data: addressesWithUrls || []
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
    const userId = req.query.doctorId || req.headers.userid;
    const userAddress = await UserAddress.find({ userId }).lean(); // lean() = faster plain objects

    if (!userAddress || userAddress.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No clinic or hospital address found for this user',
      });
    }

    const addressesWithUrls = await Promise.all(
      userAddress.map(async (address) => {
        let [headerImageUrl, digitalSignatureUrl,
            clinicQrCodeUrl,
          pharmacyQrCodeUrl,
          labQrCodeUrl,
           pharmacyHeaderUrl,
          labHeaderUrl,
        ] = await Promise.all([
          address.headerImage
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.headerImage,
                }),
                { expiresIn: 300 }
              ).catch(() => address.headerImage)
            : null,
          address.digitalSignature
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.digitalSignature,
                }),
                { expiresIn: 300 }
              ).catch(() => address.digitalSignature)
            : null,
             address.clinicQrCode
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.clinicQrCode,
                }),
                { expiresIn: 300 }
              ).catch(() => address.clinicQrCode)
            : null,
          address.pharmacyQrCode
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.pharmacyQrCode,
                }),
                { expiresIn: 300 }
              ).catch(() => address.pharmacyQrCode)
            : null,
          address.labQrCode
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.labQrCode,
                }),
                { expiresIn: 300 }
              ).catch(() => address.labQrCode)
            : null,
              address.pharmacyHeader
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.pharmacyHeader,
                }),
                { expiresIn: 300 }
              ).catch(() => address.pharmacyHeader)
            : null,
          address.labHeader
            ? getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: address.labHeader,
                }),
                { expiresIn: 300 }
              ).catch(() => address.labHeader)
            : null,
        ]);

        return {
          ...address,
          headerImage: headerImageUrl || address.headerImage,
          digitalSignature: digitalSignatureUrl || address.digitalSignature,
           clinicQrCode: clinicQrCodeUrl || address.clinicQrCode,
          pharmacyQrCode: pharmacyQrCodeUrl || address.pharmacyQrCode,
          labQrCode: labQrCodeUrl || address.labQrCode,
           pharmacyHeader: pharmacyHeaderUrl || address.pharmacyHeader,
          labHeader: labHeaderUrl || address.labHeader,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      data: addressesWithUrls,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};


exports.updateAddress = async (req, res) => {
  try {
     const userId =  req.headers.userid;
     const bypassCheck = req.query.bypassCheck;
    const { error } = updateAddressValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    const updateFields = { ...req.body, updatedBy: userId, updatedAt: new Date() };

    // Clinic name duplicate check if clinicName is provided
    if (updateFields.clinicName) {
      const existingClinic = await UserAddress.findOne({
        clinicName: updateFields.clinicName,
        userId: userId,
        addressId: { $ne: req.body.addressId },
      });

      if (existingClinic) {
        return res.status(400).json({
          status: 'fail',
          message: 'This clinic name is already registered for this user with another address.',
          data: { existingAddressId: existingClinic.addressId },
        });
      }
    }
   
    // Pharmacy check
    if (req.body.pharmacyRegistrationNo && !bypassCheck) {
      const existingPharmacy = await UserAddress.findOne({
        pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
        pharmacyId: { $ne: null },
        userId: { $ne: userId },
      });

      if (existingPharmacy) {
        const existingMapping = await pharmacyMapping.findOne({
          pharmacyId: existingPharmacy.pharmacyId,
          doctorId: userId
        });


        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This pharmacy is already registered with another doctor. Do you want to link it?',
            data: {
              pharmacyId: existingPharmacy.pharmacyId,
              existingDoctorId: existingPharmacy.userId
            }
          });
        }
      }
    }

    // Lab check
    if (req.body.labRegistrationNo && !bypassCheck) {
      const existingLab = await UserAddress.findOne({
        labRegistrationNo: req.body.labRegistrationNo,
        labId: { $ne: null },
      });

      if (existingLab) {
        const existingMapping = await labMapping.findOne({
          labId: existingLab.labId,
          doctorId: userId
        });

        

        if (!existingMapping) {
          return res.status(200).json({
            status: 'warning',
            message: 'This lab is already registered with another doctor. Do you want to link it?',
            data: {
              labId: existingLab.labId,
              existingDoctorId: existingLab.userId
            }
          });
        }
      }
    }

     // ID generation for pharmacy
    if (req.body.pharmacyName && !req.body.pharmacyId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.PHARMACY_SEQUENCE.PHARMACY_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.pharmacyId = sequenceConstant.PHARMACY_SEQUENCE.SEQUENCE + counter.seq;
    }

    // ID generation for lab
    if (req.body.labName && !req.body.labId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.LAB_SEQUENCE.LAB_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      req.body.labId = sequenceConstant.LAB_SEQUENCE.SEQUENCE + counter.seq;
    }

     const qrCodeEntries = [];
    // File uploads
    if (req.files) {
      // Clinic Header
      if (req.files['file'] && req.files['file'][0]) {
        const headerPhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['file'][0].buffer,
          Key: headerPhoto,
          ContentType: req.files['file'][0].mimetype,
        }));
        req.body.headerImage = headerPhoto;
      }

      // Digital Signature
      if (req.files['signature'] && req.files['signature'][0]) {
        const signaturePhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['signature'][0].buffer,
          Key: signaturePhoto,
          ContentType: req.files['signature'][0].mimetype,
        }));
        req.body.digitalSignature = signaturePhoto;
      }

      // Pharmacy Header
      if (req.files['pharmacyHeader'] && req.files['pharmacyHeader'][0]) {
        const pharmacyPhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['pharmacyHeader'][0].buffer,
          Key: pharmacyPhoto,
          ContentType: req.files['pharmacyHeader'][0].mimetype
        }));
        req.body.pharmacyHeader = pharmacyPhoto;
      }

      // Lab Header
      if (req.files['labHeader'] && req.files['labHeader'][0]) {
        const labPhoto = generateFileName();
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Body: req.files['labHeader'][0].buffer,
          Key: labPhoto,
          ContentType: req.files['labHeader'][0].mimetype
        }));
        req.body.labHeader = labPhoto;
      }
       // Clinic QR Code
      if (req.files['clinicQR'] && req.files['clinicQR'][0] && ['Clinic', 'Hospital'].includes(req.body.type)) {
        let existingQR = await qrCodeModel.findOne({ addressId: req.body.addressId, type: 'Clinic' });
        let clinicQRPhoto;
        if (!existingQR) {
          clinicQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['clinicQR'][0].buffer,
              Key: clinicQRPhoto,
              ContentType: req.files['clinicQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Clinic',
            qrCode: clinicQRPhoto,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          clinicQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['clinicQR'][0].buffer,
              Key: clinicQRPhoto,
              ContentType: req.files['clinicQR'][0].mimetype,
            })
          );
          await qrCodeModel.updateOne(
            { addressId: req.body.addressId, type: 'Clinic' },
            { qrCode: clinicQRPhoto, updatedBy: userId, updatedAt: new Date() }
          );
          qrCodeEntries.push({ ...existingQR.toObject(), qrCode: clinicQRPhoto, updatedBy: userId, updatedAt: new Date() });
        }
        updateFields.clinicQrCode = clinicQRPhoto;
      }

      // Pharmacy QR Code
      if (req.files['pharmacyQR'] && req.files['pharmacyQR'][0] && req.body.pharmacyName && req.body.pharmacyRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ pharmacyRegistrationNo: req.body.pharmacyRegistrationNo, type: 'Pharmacy' });
        let pharmacyQRPhoto;
        if (!existingQR) {
          pharmacyQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['pharmacyQR'][0].buffer,
              Key: pharmacyQRPhoto,
              ContentType: req.files['pharmacyQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Pharmacy',
            qrCode: pharmacyQRPhoto,
            pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
            pharmacyId: req.body.pharmacyId,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          pharmacyQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['pharmacyQR'][0].buffer,
              Key: pharmacyQRPhoto,
              ContentType: req.files['pharmacyQR'][0].mimetype,
            })
          );
          await qrCodeModel.updateOne(
            { pharmacyRegistrationNo: req.body.pharmacyRegistrationNo, type: 'Pharmacy' },
            { qrCode: pharmacyQRPhoto, updatedBy: userId, updatedAt: new Date() }
          );
          qrCodeEntries.push({ ...existingQR.toObject(), qrCode: pharmacyQRPhoto, updatedBy: userId, updatedAt: new Date() });
        }
        updateFields.pharmacyQrCode = pharmacyQRPhoto;
      }

      // Lab QR Code
      if (req.files['labQR'] && req.files['labQR'][0] && req.body.labName && req.body.labRegistrationNo) {
        let existingQR = await qrCodeModel.findOne({ labRegistrationNo: req.body.labRegistrationNo, type: 'Lab' });
        let labQRPhoto;
        if (!existingQR) {
          labQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['labQR'][0].buffer,
              Key: labQRPhoto,
              ContentType: req.files['labQR'][0].mimetype,
            })
          );
          qrCodeEntries.push({
            addressId: req.body.addressId,
            userId,
            type: 'Lab',
            qrCode: labQRPhoto,
            labRegistrationNo: req.body.labRegistrationNo,
            labId: req.body.labId,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          labQRPhoto = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: req.files['labQR'][0].buffer,
              Key: labQRPhoto,
              ContentType: req.files['labQR'][0].mimetype,
            })
          );
          await qrCodeModel.updateOne(
            { labRegistrationNo: req.body.labRegistrationNo, type: 'Lab' },
            { qrCode: labQRPhoto, updatedBy: userId, updatedAt: new Date() }
          );
          qrCodeEntries.push({ ...existingQR.toObject(), qrCode: labQRPhoto, updatedBy: userId, updatedAt: new Date() });
        }
        updateFields.labQrCode = labQRPhoto;
      }

      // Save new QR codes to the QRCode collection
      if (qrCodeEntries.length > 0) {
        for (const qrCode of qrCodeEntries) {
          if (!qrCode._id) {
            await qrCodeModel.create(qrCode);
          }
        }
      }
    }

   
console.log("am in==1234==")  
    // Update address
    // Update address using $set to update only provided fields
    const userAddress = await UserAddress.findOneAndUpdate(
      { addressId: req.body.addressId },
      { $set: updateFields },
      { new: true }
    );
    // const userAddress = await UserAddress.findOneAndUpdate({ "addressId": req.body.addressId }, req.body, { new: true });
    if (!userAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'User address not found',
      });
    }

    // Update or create mappings
    if (req.body.pharmacyId) {
      await pharmacyMapping.findOneAndUpdate(
        { doctorId: userId, clinicId: req.body.addressId },
        {
          pharmacyId: req.body.pharmacyId,
          pharmacyRegistrationNo: req.body.pharmacyRegistrationNo,
          status: 'Active'
        },
        { upsert: true, new: true }
      );
    }

    if (req.body.labId) {
      await labMapping.findOneAndUpdate(
        { doctorId: userId, clinicId: req.body.addressId },
        {
          labId: req.body.labId,
          status: 'Active'
        },
        { upsert: true, new: true }
      );
    }

    // Count mappings
    const pharmacyMappingCount = req.body.pharmacyId
      ? await pharmacyMapping.countDocuments({ pharmacyId: req.body.pharmacyId, status: 'Active' })
      : 0;
    const labMappingCount = req.body.labId
      ? await labMapping.countDocuments({ labId: req.body.labId, status: 'Active' })
      : 0;
    return res.status(200).json({
      status: 'success',
     data: {
        userAddress,
        pharmacyMappingCount,
        labMappingCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}



exports.getClinicsQRCode = async (req, res) => {
  try{
    const addressId = req.params.addressId
    const userId = req.query.userId || req.headers.userid;

    if (!addressId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "addressId and userId are required",
      });
    }

     // Find address with minimum fields to avoid heavy response
    const address = await UserAddress.findOne(
      { addressId, userId },
      { clinicQrCode: 1, pharmacyQrCode: 1, labQrCode: 1 }
    );

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    // Helper to generate signed URL if QR exists
    const getSigned = async (key) => {
      if (!key) return null;
      return await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        }),
        { expiresIn: 3600 } // 1 hour
      );
    };

    // Run promises in parallel for performance
    const [clinicQr, pharmacyQr, labQr] = await Promise.all([
      getSigned(address.clinicQrCode),
      getSigned(address.pharmacyQrCode),
      getSigned(address.labQrCode),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        clinicQrCode: clinicQr,
        pharmacyQrCode: pharmacyQr,
        labQrCode: labQr,
      },
    });

  }catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.uploadClinicHeader = async (req, res) => {
    upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        status: 'error',
        message: err.message || 'File upload failed',
      });
    }

    try {
      const { addressId } = req.body;
      const doctorId = req.headers?.userid; // Assuming userId is set by authentication middleware

      if (!addressId || !doctorId) {
        return res.status(400).json({
          status: 'error',
          message: 'addressId and doctorId are required',
        });
      }

      // Verify the clinic exists and belongs to the doctor
      const clinic = await UserAddress.findOne({
        addressId,
        userId: doctorId,
      });

      if (!clinic) {
        return res.status(404).json({
          status: 'error',
          message: 'Clinic not found or not authorized',
        });
      }

      // Check if header image was uploaded
      if (!req.files || !req.files.file || !req.files.file[0]) {
        return res.status(400).json({
          status: 'error',
          message: 'Header image is required',
        });
      }

    // Upload header image to S3
      let headerImage = clinic.headerImage; // Preserve existing if not updated
      const headerFile = req.files.file[0];
      try {
        const headerFileName = generateFileName();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Body: headerFile.buffer,
            Key: headerFileName,
            ContentType: headerFile.mimetype,
          })
        );
        headerImage = headerFileName;
        console.log('Header image uploaded to S3:', headerFileName);
      } catch (s3Error) {
        console.error('S3 header upload failed:', s3Error);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to upload header image to S3',
          error: s3Error.message,
        });
      }

      // Upload digital signature to S3 (if provided)
      let digitalSignature = clinic.digitalSignature; // Preserve existing if not updated
      if (req.files.signature && req.files.signature[0]) {
        const signatureFile = req.files.signature[0];
        try {
          const signatureFileName = generateFileName();
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Body: signatureFile.buffer,
              Key: signatureFileName,
              ContentType: signatureFile.mimetype,
            })
          );
          digitalSignature = signatureFileName;
          console.log('Digital signature uploaded to S3:', signatureFileName);
        } catch (s3Error) {
          console.error('S3 signature upload failed:', s3Error);
          return res.status(500).json({
            status: 'error',
            message: 'Failed to upload digital signature to S3',
            error: s3Error.message,
          });
        }
      }

     // Update the clinic with S3 object keys
      clinic.headerImage = headerImage;
      clinic.digitalSignature = digitalSignature;
      clinic.updatedAt = Date.now();
      await clinic.save();

      // Generate pre-signed URLs for response
      let headerImageUrl = null;
      let digitalSignatureUrl = null;

      if (headerImage) {
        headerImageUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: headerImage,
          }),
          { expiresIn: 300 } // 5 minutes
        );
      }

      if (digitalSignature) {
        digitalSignatureUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: digitalSignature,
          }),
          { expiresIn: 300 } // 5 minutes
        );
      }

      return res.status(200).json({
        status: 'success',
        message: 'Header uploaded successfully',
       data: {
          headerImage: headerImageUrl || 'stored', // Return pre-signed URL or 'stored'
          digitalSignature: digitalSignatureUrl || (digitalSignature ? 'stored' : null),
        },
      });
    } catch (error) {
      console.error('Upload header error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });
};

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


exports.deleteClinicAddress = async (req, res) => {
  try {
    // Get addressId from query params and userId from headers
    const addressId = req.body.addressId;
    const userId = req.headers.userid;

    // Validate input
    const { error } = deleteAddressValidationSchema.validate({ addressId, userId }, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Find the address
    const address = await UserAddress.findOne({ addressId, type: 'Clinic' });
    if (!address) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic address not found'
      });
    }

    // Check if the user is authorized to delete the address
    if (address.userId !== userId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Unauthorized: You can only delete your own clinic address'
      });
    }

    // Soft delete: Set status to 'InActive' and update metadata
    const updatedAddress = await UserAddress.findOneAndUpdate(
      { addressId },
      {
        $set: {
          status: 'InActive',
          updatedBy: userId,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic address not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Clinic address deleted successfully',
      data: updatedAddress
    });
  } catch (error) {
    console.error('Error in deleteClinicAddress:', error.stack);
    return res.status(500).json({
      status: 'fail',
      message: 'Error deleting clinic address',
      error: error.message
    });
  }
};

exports.searchClinics = async (req, res) => {
  try {
    const { search = '', lat, lng, radius = 10 } = req.query;

    const query = {
      type: 'Clinic',
      status: 'Active',
      $or: [
        { clinicName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ]
    };

    // If coordinates are provided, use geolocation filter
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // in meters
        }
      };
    }

    const clinics = await UserAddress.find(query).select('-headerImage -digitalSignature').limit(50)
  .lean(); // add pagination as needed

    res.status(200).json({
      status: 'success',
      results: clinics.length,
      data: clinics
    });
  } catch (err) {
    console.error('Clinic search error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getClinicNameByID = async (req, res) => {
  try {
    const address = await UserAddress.findOne({ addressId: req.params.addressId  }).select('addressId clinicName status');;
    console.log("address===", address)
   if (!address) {
      return res.status(404).json({ status: 'fail', message: 'Clinic not found' });
    }

    res.status(200).json({ 
      status: 'success',
      clinicName: address.clinicName || address.addressId,
      clinicStatus: address.status   // 👈 return status so caller can decide
    });
  } catch (err) {
    console.error('Clinic search error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};





