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

    /** ─────────────── File Upload (optional) ─────────────── **/
   /** ─────────────── File Upload (optional) ─────────────── **/
if (req.files) {
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

    /** ─────────────── Create Address ─────────────── **/
    req.body.createdBy = userId;
    req.body.updatedBy = userId;
    req.body.addressId = uuidv4().replace(/-/g, '');
    req.body.status = 'Active';
    req.body.createdAt = new Date();
    req.body.updatedAt = new Date();

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
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};



exports.addPharmacyToClinic = async (req, res) => {
  try {
    const { userId, addressId, pharmacyName, pharmacyRegistrationNo, pharmacyGst, pharmacyPan, pharmacyAddress } = req.body;

    // Step 1: Check if clinic exists
    const clinic = await UserAddress.findOne({ userId, addressId, type: { $in: ['Clinic', 'Hospital'] } });
    if (!clinic) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clinic not found for this user'
      });
    }

    // Step 2: Optional pharmacy header upload
    let pharmacyHeader = null;
    if (req.file) {
      const fileName = `pharmacy-header-${Date.now()}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Body: req.file.buffer,
        Key: fileName,
        ContentType: req.file.mimetype
      }));
      pharmacyHeader = fileName;
    }

    // Step 3: Generate pharmacyId if missing
    let pharmacyId = clinic.pharmacyId;
    if (!pharmacyId) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: sequenceConstant.PHARMACY_SEQUENCE.PHARMACY_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      pharmacyId = sequenceConstant.PHARMACY_SEQUENCE.SEQUENCE + counter.seq;
    }

    // Step 4: Update clinic record with pharmacy details
    clinic.pharmacyName = pharmacyName;
    clinic.pharmacyRegistrationNo = pharmacyRegistrationNo;
    clinic.pharmacyGst = pharmacyGst;
    clinic.pharmacyPan = pharmacyPan;
    clinic.pharmacyAddress = pharmacyAddress;
    clinic.pharmacyHeader = pharmacyHeader || clinic.pharmacyHeader;
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

exports.getClinicAddress = async (req, res) => {
  try { 
    const userId = req.query.doctorId || req.headers.userid;
    const userAddress = await UserAddress.find({userId});
    // if (!userAddress || userAddress.length === 0) { 
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'No clinic or hospital address found for this user',
    //   });
    // }
    return res.status(200).json({
      status: 'success',
      data: userAddress || []
    });
    
  } catch (error) { 
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.updateAddress = async (req, res) => {
  try {
    const { error } = updateAddressValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    req.body.updatedBy = req.headers.userid;
    req.body.updatedAt = new Date();
    const userAddress = await UserAddress.findOneAndUpdate({ "addressId": req.body.addressId }, req.body, { new: true });
    if (!userAddress) {
      return res.status(404).json({
        status: 'fail',
        message: 'User address not found',
      });
    }
    return res.status(200).json({
      status: 'success',
      data: userAddress
    });
  } catch (error) {
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

    // Convert header image to base64
      const headerFile = req.files.file[0];
      const base64Image = `data:${headerFile.mimetype};base64,${headerFile.buffer.toString('base64')}`;

      // Convert digital signature to base64 (if provided)
      let base64Signature = clinic.digitalSignature; // Preserve existing signature if not updated
      if (req.files.signature && req.files.signature[0]) {
        const signatureFile = req.files.signature[0];
        base64Signature = `data:${signatureFile.mimetype};base64,${signatureFile.buffer.toString('base64')}`;
      }

      // Update the clinic with the base64 image
      clinic.headerImage = base64Image;
      clinic.digitalSignature = base64Signature;
      clinic.updatedAt = Date.now();
      await clinic.save();

      return res.status(200).json({
        status: 'success',
        message: 'Header uploaded successfully',
        data: {
          headerImage: 'stored', // Indicate success without returning the full base64 string
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