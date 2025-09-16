const fs = require('fs');
const KycDetailsModel = require('../models/KycDetailsModel');
const kycDetailsSchema = require('../schemas/kycDetailsSchema');
const { encrypt, decrypt } = require('../utils/encryptData');
const { convertImageToBase64 } = require('../utils/imageService');
const {validatePan} = require('../utils/validatePan');
const crypto = require("crypto");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

// Create KYC Details
//master code
// exports.addKYCDetails = async (req, res) => {
//   try {
//     const userId = req.body.userId || req.headers.userid;
//     req.body.userId = userId;
//     const { error } = kycDetailsSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         status: 'fail....',
//         message: error.details[0].message,
//       });
//     }
//     if (!req.files.panFile || req.files.panFile.length === 0) {
//       return res.status(400).json({ status: 'fail', message: 'PAN file is required' });
//     }
//     if (!req.files.aadharFile || req.files.aadharFile.length === 0) {
//       return res.status(400).json({ status: 'fail', message: 'Aadhar file is required' });
//     }
//     if (req.files.panFile && req.files.panFile.length > 0) {
//       const filePath = req.files.panFile[0].path;
//       const { mimeType, base64 } = convertImageToBase64(filePath);
//       if (!req.body.panAttachmentUrl) {
//         req.body.panAttachmentUrl = {};
//       }
//       req.body.panAttachmentUrl.data = base64;
//       req.body.panAttachmentUrl.mimeType = mimeType;
//       // Clean up the temporary file
//       fs.unlinkSync(filePath);
//     }
//     if (req.files.aadharFile && req.files.aadharFile.length > 0) {
//       const filePath = req.files.aadharFile[0].path;
//       const { mimeType, base64 } = convertImageToBase64(filePath);
//       if (!req.body.aadharAttachmentUrl) {
//         req.body.aadharAttachmentUrl = {};
//       }
//       req.body.aadharAttachmentUrl.data = base64;
//       req.body.aadharAttachmentUrl.mimeType = mimeType;
//       // Clean up the temporary file
//       fs.unlinkSync(filePath);
//     }

//     const encryptedPanNumber = encrypt(req.body.panNumber);
//     const encryptedAadharNumber = encrypt(req.body.aadharNumber);
//     const kycDetails = {
//       userId: req.body.userId,
//       pan: {
//         number: encryptedPanNumber,
//         attachmentUrl: {
//           data: req.body.panAttachmentUrl ? req.body.panAttachmentUrl.data : null,
//           mimeType: req.body.panAttachmentUrl ? req.body.panAttachmentUrl.mimeType : null
//         },
//         status: 'pending',
//       },
//       aadhar: {
//         number: encryptedAadharNumber,
//         attachmentUrl: {
//           data: req.body.aadharAttachmentUrl ? req.body.aadharAttachmentUrl.data : null,
//           mimeType: req.body.aadharAttachmentUrl ? req.body.aadharAttachmentUrl.mimeType : null
//         },
//         status: 'pending',
//       },
//       kycVerified: false,
//       createdAt: new Date(),
//       updatedAt: new Date()
//     };
//     // const saveKYCDetails = new KycDetailsModel(kycDetails);
//     // const savedDetails = await saveKYCDetails.save();
//     const savedDetails = await KycDetailsModel.findOneAndUpdate(
//       { userId: req.body.userId },
//       { $set: kycDetails },
//       { new: true, upsert: true }
//     );
//     if (!savedDetails) {
//       return res.status(400).json({ status: 'fail', error: 'Failed to save KYC details' });
//     }
//     return res.status(201).json({
//       status: 'success',
//       data: savedDetails
//     });
//   } catch (error) {
//     res.status(500).json({ status: 'fail', error: 'Failed to create KYC details' });
//   }
// };

// Create KYC Details
exports.addKYCDetails2 = async (req, res) => {
  try {
    console.log('Request step0:', req.body);
    console.log('Request step0:', req.files)
    console.log('Request step1:', 1);
    const userId = req.body.userId || req.headers.userid;
    console.log('Request step2:', userId);

    req.body.userId = userId;
    const { error } = kycDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail....',
        message: error.details[0].message,
      });
    }
    if (!req.files.panFile || req.files.panFile.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'PAN file is required' });
    }

     let panFileKey = null;
    // if (!req.files.voterFile || req.files.voterFile.length === 0) {
    //   return res.status(400).json({ status: 'fail', message: 'voter file is required' });
    // }
    if (req.files.panFile && req.files.panFile.length > 0) {
       const file = req.files.panFile[0];
      const fileName = generateFileName();

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
      }));

      panFileKey = fileName;

      // Clean up the temporary file
      // fs.unlinkSync(file.path);
    }
console.log('PAN Validation Response:', 1900);


    // here we need to validate the PAN number using an external service
    const panValidationResponse = await validatePan(req.body.panNumber, userId);
// console.log('PAN Validation Response:', panValidationResponse);
    if (!panValidationResponse.http_response_code === 200) {
      return res.status(400).json({
        status: 'fail',
        message: 'PAN validation failed: ' + panValidationResponse.message,
      });
    }

    // if (req.files.voterFile && req.files.voterFile.length > 0) {
    //   const filePath = req.files.voterFile[0].path;
    //   const { mimeType, base64 } = convertImageToBase64(filePath);
    //   if (!req.body.voterAttachmentUrl) {
    //     req.body.voterAttachmentUrl = {};
    //   }
    //   req.body.voterAttachmentUrl.data = base64;
    //   req.body.voterAttachmentUrl.mimeType = mimeType;
    //   // Clean up the temporary file
    //   fs.unlinkSync(filePath);
    // }

    console.log('Request step3:', req.body.panNumber, );

    const encryptedPanNumber = encrypt(req.body.panNumber);
    // const encryptedVoterNumber = encrypt(req.body.voterNumber);
    const kycDetails = {
      userId: req.body.userId,
      pan: {
        number: encryptedPanNumber,
        attachmentUrl: panFileKey,
        status: 'pending',
      },
      // voter: {
      //   number: encryptedVoterNumber,
      //   attachmentUrl: {
      //     data: req.body.voterAttachmentUrl ? req.body.voterAttachmentUrl.data : null,
      //     mimeType: req.body.voterAttachmentUrl ? req.body.voterAttachmentUrl.mimeType : null
      //   },
      //   status: 'pending',
      // },
      kycVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // const saveKYCDetails = new KycDetailsModel(kycDetails);
    // const savedDetails = await saveKYCDetails.save();
    console.log('Request step4:', kycDetails);
    const savedDetails = await KycDetailsModel.findOneAndUpdate(
      { userId: req.body.userId },
      { $set: kycDetails },
      { new: true, upsert: true }
    );
    if (!savedDetails) {
      return res.status(400).json({ status: 'fail', error: 'Failed to save KYC details' });
    }
    return res.status(201).json({
      status: 'success',
      data: savedDetails
    });
  } catch (error) {
    console.error('Error in addKYCDetails:', error);
    res.status(500).json({ status: 'fail', error: 'Failed to create KYC details' });
  }
};

exports.addKYCDetails3 = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;

    const { error } = kycDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'fail', message: error.details[0].message });
    }

    if (!req.files?.panFile?.length) {
      return res.status(400).json({ status: 'fail', message: 'PAN file is required' });
    }

    const file = req.files.panFile[0];
    const fileName = generateFileName();

    // Upload PAN file to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    const encryptedPanNumber = encrypt(req.body.panNumber);

    // Save KYC with "pending" status
    const kycDetails = {
      userId,
      pan: {
        number: encryptedPanNumber,
        attachmentUrl: fileName,
        status: 'pending',
      },
      kycVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedDetails = await KycDetailsModel.findOneAndUpdate(
      { userId },
      { $set: kycDetails },
      { new: true, upsert: true }
    );

    // 🔹 Run PAN validation in background (non-blocking)
    validatePan(req.body.panNumber, userId)
      .then(async (panValidationResponse) => {
        console.log("panValidationResponse==",panValidationResponse)
        if (panValidationResponse.success) {
        const a=  await KycDetailsModel.updateOne(
            { userId },
            { $set: { "pan.status": "verified", kycVerified: true, updatedAt: new Date() } }
          );
        } else {
        a=  await KycDetailsModel.updateOne(
            { userId },
            { $set: { "pan.status": "rejected", updatedAt: new Date() } }
          );
        }
      })
      .catch(async (err) => {
        console.error("PAN validation error:", err);
      a=  await KycDetailsModel.updateOne(
          { userId },
          { $set: { "pan.status": "rejected", updatedAt: new Date() } }
        );
      });

    // ✅ Respond immediately (no 20s wait)
    return res.status(201).json({ status: 'success', data: savedDetails });

  } catch (error) {
    console.error('Error in addKYCDetails:', error);
    res.status(500).json({ status: 'fail', error: 'Failed to create KYC details' });
  }
};

exports.addKYCDetails = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    req.body.userId = userId;

    const { error } = kycDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'fail', message: error.details[0].message });
    }

    if (!req.files?.panFile?.length) {
      return res.status(400).json({ status: 'fail', message: 'PAN file is required' });
    }

    const file = req.files.panFile[0];
    const fileName = generateFileName();

    // Upload PAN file to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const encryptedPanNumber = encrypt(req.body.panNumber);

    // Save KYC with "pending" status
    const kycDetails = {
      userId,
      pan: {
        number: encryptedPanNumber,
        attachmentUrl: fileName,
        status: 'pending',
      },
      kycVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await KycDetailsModel.findOneAndUpdate(
      { userId },
      { $set: kycDetails },
      { new: true, upsert: true }
    );

    // 🔹 Run PAN validation in background
    validatePan(req.body.panNumber, userId)
      .then(async (panValidationResponse) => {
        if (panValidationResponse.success) {
          await KycDetailsModel.updateOne(
            { userId },
            {
              $set: {
                "pan.status": "verified",
                kycVerified: true,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          await KycDetailsModel.updateOne(
            { userId },
            { $set: { "pan.status": "rejected", updatedAt: new Date() } }
          );
        }
      })
      .catch(async (err) => {
        console.error("PAN validation error:", err);
        await KycDetailsModel.updateOne(
          { userId },
          { $set: { "pan.status": "rejected", updatedAt: new Date() } }
        );
      });

    // ✅ Fetch the latest DB record to include in response
    const latestDetails = await KycDetailsModel.findOne({ userId });

    return res.status(201).json({ status: "success", data: latestDetails });
  } catch (error) {
    console.error("Error in addKYCDetails:", error);
    res.status(500).json({ status: "fail", error: "Failed to create KYC details" });
  }
};


// Read KYC Details by ID
exports.getKYCDetails = async (req, res) => {
  try {
    let kycQuery = {};
    if (req.query.userId) {
      kycQuery = { userId: req.query.userId };
    } else {
      kycQuery = { userId: req.headers.userid };
    }

    const kycDetails = await KycDetailsModel.findOne(kycQuery);
    if (!kycDetails) {
      return res.status(404).json({
        status: 'fail',
        message: 'KYC details not found',
      });
    }
    kycDetails.pan.number = decrypt(kycDetails.pan.number);
    kycDetails.aadhar.number = decrypt(kycDetails.aadhar.number);
    return res.status(200).json({
      status: 'success',
      data: kycDetails,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC details' });
  }
};
