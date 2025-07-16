const fs = require('fs');
const Users = require('../models/usersModel');
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
    if (req.query.status) {
      obj.status = req.query?.status
    }
    obj.role = req.query?.type
    console.log("obj",obj)
    const users = await Users.find(obj, { refreshToken: 0 });
    if (users.length < 1) {
      return res.status(404).json({
        status: 'fail',
        message: "no data found",
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

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

    return res.status(200).json({
      status: 'success',
      data: user[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

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
    if (req.files.drgreeCertificate && req.files.drgreeCertificate.length > 0) {
      const filePath = req.files.drgreeCertificate[0].path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      if (!req.body.drgreeCertificate) {
        req.body.drgreeCertificate = {};
      }
      
      
     updateFields.specialization.degreeCertificate = { data: base64, mimeType };
           fs.unlinkSync(filePath);
 // Clean up temporary file
     
    }
    if (req.files.specializationCertificate && req.files.specializationCertificate.length > 0) {
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
