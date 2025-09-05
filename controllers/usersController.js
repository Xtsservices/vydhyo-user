const fs = require('fs');
const Users = require('../models/usersModel');
const Feedback = require('../models/feedbackModel');
const userSchema = require('../schemas/userSchema');
const {receptionistSchema}=require('../schemas/doctor_receptionistSchema')
const { convertImageToBase64 } = require('../utils/imageService');
const specializationSchema = require('../schemas/specializationSchema');
const consultationFeeSchema = require('../schemas/consultationFeeSchema');
const bankDetailsSchema = require('../schemas/bankDetailsSchema');
const { encrypt, decrypt } = require('../utils/encryptData');
const { userAggregation } = require('../queryBuilder/userAggregate');
const nodemailer = require('nodemailer');
const ePrescription = require('../models/ePrescriptionModel');
const ePrescriptionModel = require('../models/ePrescriptionModel');
const axios = require("axios");


const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { generateReferralCode } = require('../utils/referralCode');

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


// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Vydhyoteams@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Store password in environment variable
    }
});

// Function to send onboarding submission email
const sendOnboardingEmail = async (user) => {
  
    try {
        const subject = 'Vydhyo: Your Onboarding Profile Has Been Submitted';
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vydhyo Onboarding Submission</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f1f3f5; color: #333333;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px 20px;">
                            <img src="https://ik.imagekit.io/bhnmoa9nt/TM.png?updatedAt=1751545962441" alt="Vydhyo Logo" style="display: block; margin: 0 auto 20px; max-width: 100px; height: auto; border-radius: 50%;">
                            <h2 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px; text-align: center;">Onboarding Profile Submission</h2>
                            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Thank you for submitting your doctor profile for onboarding with Vydhyo.</p>
                            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">Your profile is now under review by our team. We will notify you once the review process is complete. This typically takes 2-3 business days.</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto;">
                                <tr>
                                    <td style="border-radius: 6px; background-color: #28a745; padding: 0;">
                                        <a href="https://vydhyo.in/login" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Check Your Profile Status</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">We appreciate your interest in joining Vydhyo and look forward to supporting your practice.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                            <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:support@vydhyo.in" style="color: #28a745; text-decoration: none;">support@vydhyo.in</a></p>
                            <p style="font-size: 14px; color: #6c757d; margin: 0;">© ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

       
      await transporter.sendMail({
            from: '"Vydhyo Healthcare" <Vydhyoteams@gmail.com>',
            // to: 'pavanreddyr42@gmail.com', // Replace with user.email for production
              to: user.email,
            subject: subject,
            html: html
        });
      
    } catch (error) {
    
        console.error('Error sending onboarding email:', error);
    }
};

exports.getAllUsers = async (req, res) => {
  try {
    let obj = {}
    // obj.status = 'inActive'

    if (!req.query?.type) {
      return res.status(400).json({ error: "'type' query parameter is required." });
    }
   
      obj.status = req.query?.status || 'inActive';
   
    obj.role = req.query?.type

    // Build search query for name and mobile
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i'); // Case-insensitive search
      obj.$or = [
        { firstname: searchRegex },
        { lastname: searchRegex },
        { mobile: searchRegex },
      ];
    }

     // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    

    console.log("obj",obj)
    const users = await Users.find(obj, { refreshToken: 0,  kyc: 0, 
      address: 0, 
      'specialization.drgreeCertificate': 0, 
      'specialization.specializationCertificate': 0  }) // Exclude kyc, address, and image fields in specialization
      .sort({ createdAt: -1 })
     .skip(skip)
      .limit(limit);

      // Get total count for pagination metadata
    const total = await Users.countDocuments(obj);

    if (users.length < 1) {
      return res.status(404).json({
        status: 'fail',
        message: "no data found",
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: users,
       pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.getDoctorsCount = async (req, res) => {
  try {
    const approvedCount = await Users.countDocuments({ role: 'doctor', status: 'approved' });
    const rejectedCount = await Users.countDocuments({ role: 'doctor', status: 'rejected' });
    const inactiveCount = await Users.countDocuments({ role: 'doctor', status: 'inActive' });
    const totalCount = await Users.countDocuments({ role: 'doctor' });

    return res.status(200).json({
      status: 'success',
      data: {
        total: totalCount,
        approved: approvedCount,
        rejected: rejectedCount,
        inActive: inactiveCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};


exports.getUserById = async (req, res) => {
  const userId = req.query.userId || req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required in query or headers',
    });
  }

  try {
    const user = await Users.aggregate([userAggregation(userId, req.query.userId)]);
    if (!user || user.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Process addresses to include pre-signed S3 URLs
    const userData = user[0];
    // console.log("User Data:", userData);
     /** ------------------  Handle Bank Details ------------------ */
    if (userData.bankDetails) {
      try {
        // Decrypt fields
        if (userData.bankDetails.accountHolderName) {
          userData.bankDetails.accountHolderName = decrypt(userData.bankDetails.accountHolderName);
        }
        if (userData.bankDetails.accountNumber) {
          const decryptedAccNo = decrypt(userData.bankDetails.accountNumber);

          // Mask account number (show first 2 and last 3 digits only)
          userData.bankDetails.accountNumber = decryptedAccNo.replace(
            /^(\d{2})(\d+)(\d{3})$/,
            (match, first, middle, last) => first + '*'.repeat(middle.length) + last
          );
        }
      } catch (err) {
        console.error("Bank details decryption failed:", err.message);
      }
    }
    const addressesWithUrls = [];
    for (const address of userData.addresses) {
      let headerImageUrl = null;
      let digitalSignatureUrl = null;
     let pharmacyHeaderUrl = null;
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
            { expiresIn: 3600 } // 5 minutes
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
            { expiresIn: 3600 } // 5 minutes
          );
        } catch (s3Error) {
          console.error(`Failed to generate pre-signed URL for digitalSignature ${address.digitalSignature}:`, s3Error);
        }
      }

      // Generate pre-signed URL for pharmacyHeader if it exists
if (address.pharmacyHeader) {
  try {
    pharmacyHeaderUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: address.pharmacyHeader,
      }),
      { expiresIn: 3600 }
    );
  } catch (s3Error) {
    console.error(`Failed to generate pre-signed URL for pharmacyHeader ${address.pharmacyHeader}:`, s3Error);
  }
}
    
// Generate pre-signed URL for labHeader if it exists
if (address.labHeader) {
  try {
    labHeaderUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: address.labHeader,
      }),
      { expiresIn: 3600 }
    );
  } catch (s3Error) {
    console.error(`Failed to generate pre-signed URL for labHeader ${address.labHeader}:`, s3Error);
  }
}

      // Add address with pre-signed URLs
      addressesWithUrls.push({
        ...address,
        headerImage: headerImageUrl || address.headerImage,
        digitalSignature: digitalSignatureUrl || address.digitalSignature,
         pharmacyHeader: pharmacyHeaderUrl || address.pharmacyHeader,
  labHeader: labHeaderUrl || address.labHeader,
      });
    }

    // Update user data with addresses containing pre-signed URLs
    userData.addresses = addressesWithUrls;

    return res.status(200).json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}


exports.getUserClinicsData = async (req, res) => {
  const userId = req.query.userId || req.headers.userid;

  // Validate userId
  if (!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required in query or headers',
    });
  }

  try {
    // Aggregation pipeline
    const pipeline = [
      { $match: { userId: userId } },
      {
        $lookup: {
          from: 'addresses',
          localField: 'userId',
          foreignField: 'userId',
          as: 'addresses',
        },
      },
      {
        $project: {
          userId: 1,
          name: {
            $concat: [
              { $ifNull: ['$firstname', ''] },
              ' ',
              { $ifNull: ['$lastname', ''] },
            ],
          },
          addresses: 1,
          specialization: 1, // Include if exists in Users; will be null if not present
          _id: 0,
         
        },
      },
    ];

    const users = await Users.aggregate(pipeline);

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'User data retrieved successfully',
      data: {
        users,
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'An error occurred while fetching user data',
    });
  }
};

exports.getKycByUserId = async (req, res) => {
  const userId = req.query.userId || req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required in query or headers',
    });
  }

  try {
    const kycData = await Users.aggregate([
      { $match: { userId: userId } },
      {
        $lookup: {
          from: 'kycdetails',
          localField: 'userId',
          foreignField: 'userId',
          as: 'kycDetails'
        }
      },
      {
        $unwind: {
          path: '$kycDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: 1,
          kycDetails: 1
        }
      }
    ]);

    // if (!kycData || kycData.length === 0 || !kycData[0].kycDetails) {
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'KYC data not found for user',
    //   });
    // }

     let kycDetails = kycData[0].kycDetails || null;

    // 🔑 Decrypt PAN before sending response

     if (kycDetails) {
      // Decrypt PAN number
      if (kycDetails.pan && kycDetails.pan.number) {
        try {
          kycDetails.pan.number = decrypt(kycDetails.pan.number);
        } catch (err) {
          console.error("PAN decryption failed:", err.message);
        }
      }

      // Generate signed URL for panImage
      if (kycDetails.panImage) {
        try {
          kycDetails.panImageUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: kycDetails.panImage,
            }),
            { expiresIn: 3600 } // 1 hour, matching headerImageUrl
          );
        } catch (s3Err) {
          console.error("Error fetching S3 signed URL for panImage:", s3Err.message);
          kycDetails.panImageUrl = null;
        }
      } else {
        kycDetails.panImageUrl = null;
      }
    }
    

    return res.status(200).json({
      status: 'success',
       data: kycDetails
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.body.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }
    const { email } = req.body;
console.log(req.headers,"req.headers")
    if(req.headers?.role=='doctor'){
      const { error } = userSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'fail',
          message: error.details[0].message,
        });
      }

    }
    if(req.headers?.role=='receptionist')
    {
      const { error } = receptionistSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'fail',
          message: error.details[0].message,
        });
      }
      const mobileExists = await Users.findOne({ mobile:req.body?.mobile });
      if (mobileExists && mobileExists.userId !== userId) {
        return res.status(400).json({
          status: 'fail',
          message: 'mobile already in use by another user',
        });
      }
    }
    // Check if the email is already in use by another user

    if(req.headers?.role=='doctor'){
      const emailExists = await Users.findOne({ email });
      if (emailExists && emailExists.userId !== userId) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email already in use by another user',
        });
      }

    }
    // Update the user
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
    let { spokenLanguage } = req.body;
    if (typeof spokenLanguage === 'string') {
      try {
        req.body.spokenLanguage = JSON.parse(spokenLanguage);
      } catch (err) {
        return res.status(400).json({ message: '"spokenLanguage" must be a valid JSON array' });
      }
    }
    req.body.updatedBy = req.headers.userid;
    req.body.updatedAt = new Date();
    console.log("req.body",req.body)
    const user = await Users.findOneAndUpdate({ "userId": userId }, req.body, { new: true });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: user,
    });
  }
  catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }
    const user = await Users.findOneAndUpdate({ "userId": userId }, { isDeleted: true }, { new: true });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    return res.status(200).json({
      status: 'success',
      message: 'Account marked as deleted',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

exports.updateSpecialization = async (req, res) => {
  try {
    console.log("updateSpecialization called");
    const userId = req.query.userId || req.headers.userid;
    console.log("userId:", userId);
    console.log("req.body:", req.body);
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = specializationSchema.validate(req.body);
    // console.log("req.body:",error.details[0].message);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    console.log("req.files:", req.files);
    // if (!req.files.drgreeCertificate || req.files.drgreeCertificate.length === 0) {
    //   return res.status(400).json({ status: 'fail', message: 'drgreeCertificate file is required' });
    // }
    // if (!req.files.specializationCertificate || req.files.specializationCertificate.length === 0) {
    //   return res.status(400).json({ status: 'fail', message: 'specializationCertificate file is required' });
    // }
    console.log("---------------------------------------------");

        console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");

 const updateFields = {
      specialization: {
        name: req.body.name, // Specialization name from frontend
        experience: Number(req.body.experience), // Years of experience
        degree: req.body.degree, // Selected degree (e.g., MBBS, MD)
        services: req.body.services || '', // Optional services provided
        bio: req.body.bio || '', // Optional bio/profile info
      },
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // Optional: Handle file uploads if you're sending certificates as files instead of base64
    if (req?.files?.drgreeCertificate && req?.files?.drgreeCertificate.length > 0) {
      const filePath = req.files.drgreeCertificate[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.drgreeCertificate) {
        req.body.drgreeCertificate = {};
      }
      
      
     updateFields.specialization.degreeCertificate = { data: base64, mimeType };
           fs.unlinkSync(filePath);
 // Clean up temporary file
     
    }
    if (req?.files?.specializationCertificate && req?.files?.specializationCertificate.length > 0) {
      const filePath = req.files.specializationCertificate[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      updateFields.specialization.specializationCertificate = { data: base64, mimeType };
       // Clean up the temporary file
      fs.unlinkSync(filePath);
    }

    // const updateFields = {
    //   specialization: req.body,
    //   updatedAt: new Date(),
    //   updatedBy: userId,
    // };

   

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: user,
    });

  } catch (error) {
    console.error("Error in updateSpecialization:", error);
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.updateConsultationModes = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = consultationFeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }

    const updateFields = {
      consultationModeFee: req.body.consultationModeFee,
      updatedAt: new Date(),
      updatedBy: userId
    };

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Consultation mode fee updated successfully',
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.updateBankDetails = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in query or headers',
      });
    }

    const { error } = bankDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    const bankDetails = {};
    bankDetails.accountNumber = encrypt(req.body.bankDetails.accountNumber);
    bankDetails.accountHolderName = encrypt(req.body.bankDetails.accountHolderName);
    bankDetails.ifscCode = req.body.bankDetails.ifscCode;
    bankDetails.bankName = req.body.bankDetails.bankName;

    const updateFields = {
      bankDetails,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const user = await Users.findOneAndUpdate({ userId }, updateFields, { new: true });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Bank details updated successfully',
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

exports.getUsersByIds = async (req, res) => {
  try {
    const userIds = req.body.userIds;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        status: 'fail',
        message: 'userIds required and must be an array of user IDs',
      });
    }

    const users = await Users.find({ userId: { $in: userIds } },
      { userId: 1, firstname: 1, lastname: 1, email: 1, mobile: 1, profilepic: 1, gender: 1, DOB: 1 });
    if (users.length < 1) {
      return res.status(404).json({
        status: 'fail',
        message: "no users data found",
      });
    }
    return res.status(200).json({
      status: 'success',
      users,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}


exports.userSubmit = async (req, res) => {
    try {
        // Assuming userId is sent in the request body
        const userId = req.body.userId || req.headers.userid;

        if (!userId) {
            return res.status(400).json({
                status: 'fail',
                message: 'userId is required'
            });
        }

        // Find the user in the database
        const user = await Users.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Send onboarding email
        await sendOnboardingEmail(user);

        return res.status(200).json({
            status: 'success',
            message: 'Onboarding email sent successfully'
        });
    } catch (error) {
        return res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};



exports.getUsersDetailsByIds = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Array of user IDs is required'
      });
    }

    const users = await Users.find({ userId: { $in: userIds }, isDeleted: false })
      .select('userId firstname lastname DOB mobile gender age');

    return res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error in getUsersByIds:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};

exports.ePrescription = async (req, res) => {
  try {
    const {
      prescriptionId,
      appointmentId,
      userId,
      doctorId,
      addressId,
      doctorInfo,
      patientInfo,
      vitals,
      diagnosis,
      medications,
      advice
    } = req.body;

    // Basic validation
    if ( !appointmentId || !userId || !doctorId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields:  appointmentId, userId, doctorId, or addressId'
      });
    }

    if (!doctorInfo || !patientInfo) {
      return res.status(400).json({
        success: false,
        message: 'Doctor and patient information are required'
      });
    }

    // Create new e-prescription document
    const newPrescription = new ePrescriptionModel({
      prescriptionId,
      appointmentId,
      userId,
      doctorId,
      addressId,
      doctorInfo: {
        doctorName: doctorInfo.doctorName,
        qualifications: doctorInfo.qualifications,
        specialization: doctorInfo.specialization,
        reportDate: doctorInfo.reportDate,
        reportTime: doctorInfo.reportTime,
        selectedClinicId: doctorInfo.selectedClinicId,
        clinicName: doctorInfo.clinicName,
        clinicAddress: doctorInfo.clinicAddress,
        city: doctorInfo.city,
        pincode: doctorInfo.pincode,
        contactNumber: doctorInfo.contactNumber
      },
      patientInfo: {
        patientName: patientInfo.patientName,
        age: patientInfo.age,
        gender: patientInfo.gender,
        mobileNumber: patientInfo.mobileNumber,
        chiefComplaint: patientInfo.chiefComplaint,
        pastMedicalHistory: patientInfo.pastMedicalHistory,
        familyMedicalHistory: patientInfo.familyMedicalHistory,
        physicalExamination: patientInfo.physicalExamination
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
        investigationFindings: vitals?.investigationFindings || null
      },
      diagnosis: {
        diagnosisList: diagnosis?.diagnosisList || null,
        selectedTests: diagnosis?.selectedTests || []
      },
      medications: medications || [],
      advice: {
        advice: advice?.advice || null,
        followUpDate: advice?.followUpDate || null
      },
      createdBy: req.user?.id || null, // Assuming user ID comes from auth middleware
      updatedBy: req.user?.id || null
    });

    // Save to database
    const savedPrescription = await newPrescription.save();

    return res.status(201).json({
      success: true,
      message: 'E-prescription created successfully',
      data: savedPrescription
    });

  } catch (error) {
    console.error('Error creating e-prescription:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getAllSpecializations = async (req, res) => {
   try {
           // Fetch distinct specialization names
           const specializations = await Users.distinct('specialization.name', { role: 'doctor',  status: 'approved' });

           // Filter out null/undefined values and trim whitespace
           const cleanedSpecializations = specializations
               .filter(name => name && name.trim())
               .map(name => name.trim());

           return res.status(200).json({
               success: true,
               message: 'Specializations retrieved successfully',
               data: cleanedSpecializations
           });
       } catch (error) {
           console.error('Error fetching specializations:', error);
           return res.status(500).json({
               success: false,
               message: 'Failed to fetch specializations',
               error: error.message
           });
       }
}

exports.getAllDoctorsBySpecializations = async (req, res) => {
    try {
        const specialization = req.params.specialization?.trim();
        if (!specialization) {
            return res.status(400).json({
                success: false,
                message: 'Specialization parameter is required'
            });
        }

        const doctors = await Users.aggregate([
            {
                $match: {
                    role: 'doctor',
                    status: 'approved',
                    'specialization.name': { $regex: `^${specialization}\\s*$`, $options: 'i' }
                }
            },
            {
                $lookup: {
                    from: 'addresses',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'addresses'
                }
            },
            {
                $project: {
                    userId: 1,
                    firstname: 1,
                    lastname: 1,
                    email: 1,
                    mobile: 1,
                    'specialization.name': 1,
                    'specialization.experience': 1,
                    'specialization.degree': 1,
                    consultationModeFee: 1,
                    addresses: 1
                }
            }
        ]);

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No approved doctors found for specialization: ${specialization}`
            });
        }

        const cleanedDoctors = doctors.map(doctor => ({
            ...doctor,
            specialization: {
                ...doctor.specialization,
                name: doctor.specialization.name.trim()
            }
        }));

        return res.status(200).json({
            success: true,
            message: `Doctors with specialization ${specialization} retrieved successfully`,
            data: cleanedDoctors
        });
    } catch (error) {
        console.error('Error fetching doctors by specialization:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors by specialization',
            error: error.message
        });
    }
};

exports.getUserIds = async(req, res) => {
  try {
    console.log("am in users")
    // Step 1: Extract query parameters
    const query = req.query;
    console.log("am in users, query", query)

    // Step 2: Validate query (basic validation, adjust as needed)
    if (!query || !query.$or || !Array.isArray(query.$or)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid query format. Expected $or with familyProvider or userId conditions.',
      });
    }

    // Step 3: Fetch users from the database
    const users = await Users.find(query).select('userId firstname lastname'); // Select only necessary fields
    console.log("am in users, users", users)

    // Step 4: Check if users were found
    if (!users || users.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No users found matching the criteria',
      });
    }

    // Step 5: Return the users
    return res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      data: users,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error retrieving users',
      error: error.message,
    });
  }
}

exports.getDoctorsListByFamily = async(req, res) => {
  try {
const { familyProvider } = req.params;
    if (!familyProvider ) {
      return res.status(400).json({
        status: 'fail',
        message: 'familyProvider  required'
      });
    }
    // Step 1: Fetch  All patients in family group
    const users = await Users.find({ familyProvider: familyProvider }).select('userId firstname lastname');
    const userIds = users.map(user => user.userId);
    if (userIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No patients found for this family provider',
        data: [],
      });
    }
    
    // step 2: All doctors they have appointments with
     const resp = await axios.get(
              `http://localhost:4005/appointment/getAllFamilyDoctors`,
              {
          params: { userIds: userIds },
                headers: {
            'Content-Type': 'application/json',
            // Add authorization headers if needed
            // 'Authorization': `Bearer ${req.headers.authorization}`
          },
              },
               
            );

            console.log("resp.data", resp.data)
    
            //  Step 3: Basic doctor info
    const doctors = resp.data.data;
    const doctorData = await Users.find({ userId: { $in: doctors } })
      .select('userId firstname lastname  specialization consultationModeFee')
      .lean();
    return res.status(200).json({
      status: 'success',
      message: 'Doctors list retrieved successfully',
      data: doctorData
    });
  } catch (error) {
    console.error('Error in getDoctorsListByFamily:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
}


exports.generateReferralCode = async (req, res) => {
  try {
    const userId = req.headers.userid; 

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    let user = await Users.findOne({ userId: userId });


    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

      if (user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can generate referral codes" });
    }
    // Check if already has a referral code
    if (user.referralCode) {
      return res.status(200).json({
        message: "Referral code already exists",
        referralCode: user.referralCode
      });
    }

    // Generate unique referral code
    let code;
    let exists = true;
    do {
      code = generateReferralCode();
      exists = await Users.findOne({ referralCode: code });
    } while (exists);

    user.referralCode = code;
    await user.save();

    res.status(201).json({
      message: "Referral code generated successfully",
      referralCode: code
    });
  } catch (error) {
    console.error('Error in generateReferralCode:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
}

exports.updateAppLanguage = async (req, res) => {
  try{
    const { appLanguage, userId } = req.params;

  // Validate input
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId is required'
      });
    }

    if (!appLanguage) {
      return res.status(400).json({
        status: 'fail',
        message: 'appLanguage is required'
      });
    }

    // Validate appLanguage value
    const validLanguages = ['en', 'hi', 'tel'];
    if (!validLanguages.includes(appLanguage)) {
      return res.status(400).json({
        success: false,
        message: `appLanguage must be one of: ${validLanguages.join(', ')}`
      });
    }

    // Find and update the user
    const updatedUser = await Users.findOneAndUpdate(
      { userId, isDeleted: false },
      { 
        appLanguage,
        updatedAt: Date.now()
      },
      { 
        new: true, // Return the updated document
        runValidators: true // Ensure schema validations are applied
      }
    );

    // Check if user exists
    if (!updatedUser) {
      return res.status(404).json({
         status: 'fail',
        message: 'User not found or has been deleted'
      });
    }

    // Return the full updated user document
    return res.status(200).json({
      status: 'success',
      message: 'App language updated successfully',
      data: updatedUser
    });

  }catch(error){
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
}

// Function to update doctor's overall rating
async function updateDoctorOverallRating(doctorId) {
  try {
    const feedback = await Feedback.find({ doctorId });
    const avgRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;
    
    await Users.findOneAndUpdate(
      { userId: doctorId, role: 'doctor' }, 
      {
      overallRating: Number(avgRating.toFixed(1))
    });
  } catch (error) {
    console.error('Error updating overall rating:', error);
  }
}

exports.addFeedback = async (req, res) => {
   try {
    const { doctorId, rating, comment } = req.body;
    const patientId = req.headers.userid; // Assuming user ID from auth middleware

    // Validate input
    if (!doctorId || !rating) {
      return res.status(400).json({ error: 'Doctor ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if doctor exists
  const doctor = await Users.findOne({ userId: doctorId, role: 'doctor' });
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' });
    }
     // Check if patient exists and get familyProvider
    const patient = await Users.findOne({userId: patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    // Determine the ID to check for appointments (patientId or familyProvider)
    const appointmentCheckId = patient.familyProvider || patientId;

    // Check if patient (or family provider) has consulted the doctor
    try {
      const response = await axios.get('http://localhost:4005/appointment/checkPatientConsultedDoctor', {
        params: {
          userId: appointmentCheckId,
          doctorId
        }
      });
console.log("response.data", response.data)
      if (!response.data.hasAppointment) {
        return res.status(403).json({
         status: 'fail',
        message: 'You can only provide feedback for doctors you have consulted'
      });
      }
    } catch (error) {
      console.error('Error checking appointment:', error);
      return res.status(500).json({ error: 'Error verifying appointment status' });
    }

    // Create feedback
    const feedback = new Feedback({
      patientId,
      doctorId,
      rating,
      comment: comment || ''
    });

    await feedback.save();

    // Update doctor's overall rating
    await updateDoctorOverallRating(doctorId);

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
}

exports.getFeedbackByDoctorId = async (req, res) => {
   try {
    const { doctorId } = req.params;

    // Get doctor details and feedback
    const doctor = await Users.findOne({ userId: doctorId, role: 'doctor' }).select('firstname lastname specialization overallRating');
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const feedback = await Feedback.find({ doctorId })
      .select('patientId rating comment createdAt');

    // Fetch patient names for feedback
    const patientIds = [...new Set(feedback.map(f => f.patientId))];
    const patients = await Users.find({ userId: { $in: patientIds } }).select('firstname lastname userId');
    const patientMap = patients.reduce((map, p) => {
      map[p.userId] = `${p.firstname} ${p.lastname}`;
      return map;
    }, {});

    res.json({
      doctor: {
        name: `${doctor.firstname} ${doctor.lastname}`,
        specialization: doctor.specialization.name,
        overallRating: doctor.overallRating,
        feedback: feedback.map(f => ({
          patientName: patientMap[f.patientId] || 'Unknown',
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching doctor feedback:', error);
     return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
}
  