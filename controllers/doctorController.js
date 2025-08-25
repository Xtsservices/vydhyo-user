const { receptionistSchema, editReceptionistSchema } = require("../schemas/doctor_receptionistSchema");
const schedule = require("../models/scheduleModel");
const { patientSchema, patientUpdateSchema, patientSchemaFromPatientApp } = require("../schemas/ReceptionPatientSchema");
const Users = require("../models/usersModel");
const doctorReceptionist = require("../models/doctor_receptionistModel");
const { convertImageToBase64 } = require('../utils/imageService');
const Sequence = require("../sequence/sequenceSchema");
const sequenceConstant = require('../utils/constants')
const fs = require('fs');
const leave = require("../models/leaveModel");
const usersModel = require("../models/usersModel");
const addressModel =require("../models/addressModel");

exports.createReceptionist = async (req, res) => {
  try {
    const { error } = receptionistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const doctorReceptionistData = await doctorReceptionist.findOne({
      doctorId: req.params.userid,
      receptionistId: req.body.receptionistId,
      status: "active",
    });
    if (doctorReceptionistData) {
      return res.status(404).json({
        status: "fail",
        message: "same Doctor with receptionist exist",
      });
    }
    const mobileExists = await Users.findOne({ mobile: req.body?.mobile });
    if (mobileExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'mobile already in use by another user',
      });
    }

    req.body.status = "active";
    // req.body.role = "receptionist";
    req.body.doctorId = req.params?.userid;
    req.body.createdBy = req.params?.userid;
    req.body.assignedBy = req.params?.userid;
    req.body.updatedBy = req.headers?.userid;

    const counter = await Sequence.findByIdAndUpdate({ _id: sequenceConstant.USERSEQUENCE.USER_MODEL }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    req.body.userId = sequenceConstant.USERSEQUENCE.SEQUENCE.concat(counter.seq);
    req.body.receptionistId = req.body.userId;
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

    
    // Ensure access is an array
    req.body.access = req.body.access || [];

    const user = await Users.create(req.body);
    const receptionist = await doctorReceptionist.create(req.body);
    if (user && receptionist) {
      return res.status(200).json({
        status: "success",
        message: "receptionist created successfully",
        data: user,
      });
    }

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.searchAndFetchUser = async (req, res) => {
  try {
    let obj = {}
    if (req.headers.role == 'doctor') {
      obj.role = 'receptionist'
    }
    if (req.headers.role == 'receptionist') {
      obj.role = 'patient'
    }
     obj.role = 'patient'
    if (req.query?.mobile) {
      obj.mobile = req.query.mobile
    }
    const userData = await Users.find(obj)
    if (userData.length < 1) {
      return res.status(400).json({ status: "fail", message: "no data found" })
    }
    if (userData.length == 1) {
      return res.status(200).json({ status: "success", data: userData[0] })
    }
    return res.status(200).json({ status: "success", data: userData })

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { error } = patientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    req.body.status = "active";
    req.body.role = "patient";
    req.body.doctorId = req.headers?.userid;
    req.body.createdBy = req.headers?.userid;
    req.body.assignedBy = req.headers?.userid;
    req.body.updatedBy = req.headers?.userid;

    const counter = await Sequence.findByIdAndUpdate({ _id: sequenceConstant.USERSEQUENCE.USER_MODEL }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    req.body.userId = sequenceConstant.USERSEQUENCE.SEQUENCE.concat(counter.seq);

    const user = await Users.create(req.body);
    if (user) {
      return res.status(200).json({
        status: "success",
        message: "patient created successfully",
        data: user,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};


exports.getStaffByCreator = async (req, res) => {
  try {
    const userId = req.params.userid;

    // Validate that userId exists in headers
    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required in headers",
      });
    }

    const allowedRoles = ['lab-Assistant', 'pharmacy-Assistant', 'receptionist', 'assistent'];
    // Find all active staff created by the user from the User model
    const staff = await Users.find({
      createdBy: userId,
      role: { $ne: "patient" },
      isDeleted: false, // Exclude deleted users
    }).select('firstname lastname email role mobile createdAt status userId lastLogout isLoggedIn lastLogin access DOB gender');

    if (!staff || staff.length === 0) {
      return res.status(200).json({
        status: "success",
      message: "Staff retrieved successfully",
      data: [],
      });
    }

    // Format the response to match requested fields
    const formattedStaff = staff.map(user => ({
      firstname: user.firstname || 'N/A',
      lastname: user.lastname || 'N/A',
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
      email: user.email || 'N/A',
      stafftype: user.role || 'receptionist',
      mobile: user.mobile || 'N/A',
      joinDate: user.createdAt,
      status: user.status,
      userId: user.userId,
      lastLogin: user.lastLogin || 'N/A',
      lastLogout: user.lastLogout || 'N/A',
      isLoggedIn: user.isLoggedIn || false,
      DOB:user.DOB,
      access:user.access,
      gender:user.gender
    }));

    return res.status(200).json({
      status: "success",
      message: "Staff retrieved successfully",
      data: formattedStaff,
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};


// Create Schedule
exports.createSchedule = async (req, res) => {
  try {
    const userId = req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in headers',
      });
    }

    const { staffId, fromDate, toDate, fromTime, toTime } = req.body;

    // Validate input
    if (!staffId || !fromDate || !toDate || !fromTime || !toTime) {
      return res.status(400).json({
        status: 'fail',
        message: 'All fields (staffId, fromDate, toDate, fromTime, toTime) are required',
      });
    }

    // Validate staff exists and was created by user
    const staff =  await Users.findOne({
      userId: staffId,
      createdBy: userId,
      isDeleted: false,
    });
    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'Staff not found or not authorized',
      });
    }

    // Validate dates and times
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    if (fromDateObj > toDateObj) {
      return res.status(400).json({
        status: 'fail',
        message: 'fromDate cannot be later than toDate',
      });
    }
    if (fromTime >= toTime) {
      return res.status(400).json({
        status: 'fail',
        message: 'fromTime must be earlier than toTime',
      });
    }

    // Check for overlapping schedules
    const overlappingSchedule = await schedule.findOne({
      staffId,
      fromDate: { $lte: toDateObj },
      toDate: { $gte: fromDateObj },
      $or: [
        { fromTime: { $lte: toTime }, toTime: { $gte: fromTime } },
        { fromTime: { $gte: fromTime, $lte: toTime } },
        { toTime: { $gte: fromTime, $lte: toTime } },
      ],
      status: { $in: ['pending', 'approved'] },
    });
    if (overlappingSchedule) {
      return res.status(400).json({
        status: 'fail',
        message: 'Overlapping schedule exists for this staff member',
      });
    }

    const newSchedule  = new schedule({
      staffId,
      fromDate: fromDateObj,
      toDate: toDateObj,
      fromTime,
      toTime,
      createdBy: userId,
    });
    await newSchedule.save();

    return res.status(201).json({
      status: 'success',
      message: 'Schedule created successfully',
      data: {
        id: newSchedule._id,
        staffId: newSchedule.staffId,
        fromDate: newSchedule.fromDate,
        toDate: newSchedule.toDate,
        fromTime: newSchedule.fromTime,
        toTime: newSchedule.toTime,
        status: newSchedule.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

// Get Schedule by Staff ID
exports.getSchedulesAndLeaves = async (req, res) => {
  try {
    const userId = req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in headers',
      });
    }

    const { staffId } = req.query; // Optional: filter by staffId

    // Build query for schedules
    const scheduleQuery = { createdBy: userId };
    if (staffId) {
      scheduleQuery.staffId = staffId;
    }
    const schedules = await schedule.find(scheduleQuery).populate({
      path: 'staffId',
      select: 'firstname lastname email',
    });

    // Build query for leaves
    const leaveQuery = { createdBy: userId };
    if (staffId) {
      leaveQuery.staffId = staffId;
    }
    const leaves = await leave.find(leaveQuery).populate({
      path: 'staffId',
      select: 'firstname lastname email',
    });

    // Format data for calendar
    const formattedSchedules = schedules.map(schedule => ({
      // type: 'schedule',
      id: schedule._id,
      staffId: schedule.staffId,
      staffName: `${schedule.staffId.firstname || ''} ${schedule.staffId.lastname || ''}`.trim(),
      fromDate: schedule.fromDate,
      toDate: schedule.toDate,
      fromTime: schedule.fromTime,
      toTime: schedule.toTime,
      status: schedule.status,
    }));

    const formattedLeaves = leaves.map(leave => ({
      type: 'leave',
      id: leave._id,
      staffId: leave.staffId._id,
      staffName: `${leave.staffId.firstname || ''} ${leave.staffId.lastname || ''}`.trim(),
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      status: leave.status,
    }));

    return res.status(200).json({
      status: 'success',
      message: 'Schedules and leaves retrieved successfully',
      data: [...formattedSchedules, ...formattedLeaves],
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

// Create Leave
exports.createLeave = async (req, res) => {
  try {
    const userId = req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required in headers',
      });
    }

    const { staffId, fromDate, toDate } = req.body;

    // Validate input
    if (!staffId || !fromDate || !toDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'All fields (staffId, fromDate, toDate) are required',
      });
    }

    // Validate staff exists and was created by user
    const staff = await Users.findOne({
      userId: staffId,
      createdBy: userId,
      isDeleted: false,
    });
    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'Staff not found or not authorized',
      });
    }

    // Validate dates
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    if (fromDateObj > toDateObj) {
      return res.status(400).json({
        status: 'fail',
        message: 'fromDate cannot be later than toDate',
      });
    }

    // Check for overlapping leaves
    const overlappingLeave = await leave.findOne({
      staffId,
      fromDate: { $lte: toDateObj },
      toDate: { $gte: fromDateObj },
      status: { $in: ['pending', 'approved'] },
    });
    if (overlappingLeave) {
      return res.status(400).json({
        status: 'fail',
        message: 'Overlapping leave exists for this staff member',
      });
    }

    const newLeave = new leave({
      staffId,
      fromDate: fromDateObj,
      toDate: toDateObj,
      createdBy: userId,
    });
    await newLeave.save();

    return res.status(201).json({
      status: 'success',
      message: 'Leave created successfully',
      data: {
        id: newLeave._id,
        staffId: newLeave.staffId,
        fromDate: newLeave.fromDate,
        toDate: newLeave.toDate,
        status: newLeave.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};


exports.editReceptionist = async (req, res) => {
  try {
    // Validate input
    console.log("req.body",req.body)
    const { error } = editReceptionistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const { userId } = req.body; // Receptionist's userId to identify the record
    const doctorId = req.headers.userid; // Doctor making the update

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required in headers"
      });
    }

    // Check if receptionist exists
    const user = await Users.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Receptionist not found"
      });
    }

    // Check if the receptionist was created by this doctor
    if (user.createdBy !== doctorId) {
      return res.status(403).json({
        status: "fail",
        message: "Not authorized to edit this receptionist"
      });
    }

    // Check for duplicate mobile number (excluding current user)
    if (req.body.mobile && req.body.mobile !== user.mobile) {
      const mobileExists = await Users.findOne({
        mobile: req.body.mobile,
        userId: { $ne: userId } // Exclude the current user
      });
      if (mobileExists) {
        return res.status(400).json({
          status: "fail",
          message: "Mobile number already in use by another user"
        });
      }
    }

    // Prepare update object
    const updateData = {
      updatedBy: doctorId,
      updatedAt: new Date()
    };

    // Add fields to update if provided
    if (req.body.firstname) updateData.firstname = req.body.firstname;
    if (req.body.lastname) updateData.lastname = req.body.lastname;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.mobile) updateData.mobile = req.body.mobile;
    if (req.body.gender) updateData.gender = req.body.gender;
    if (req.body.DOB) updateData.DOB = req.body.DOB;
    if (req.body.access) updateData.access = req.body.access;
    if (req.body.role) updateData.role = req.body.role;

    // Handle profile picture update 
    if (req.file) {
      const filePath = req.file.path;
      const { mimeType, base64 } = convertImageToBase64(filePath);
      updateData.profilepic = { mimeType, data: base64 };
      fs.unlinkSync(filePath); // Clean up temporary file
    }

    console.log("userId",userId)
    console.log("userId 2",updateData)
    // Update user in Users collection
    const updatedUser = await Users.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    // Update corresponding record in doctorReceptionist collection (if needed)
    const updateReceptionistData = {};
    if (req.body.firstName) updateReceptionistData.firstName = req.body.firstName;
    if (req.body.lastName) updateReceptionistData.lastName = req.body.lastName;
    if (req.file) updateReceptionistData.profilepic = updateData.profilepic;

    if (Object.keys(updateReceptionistData).length > 0) {
      updateReceptionistData.updatedBy = doctorId;
      updateReceptionistData.updatedAt = new Date();
      await doctorReceptionist.findOneAndUpdate(
        { receptionistId: userId },
        { $set: updateReceptionistData },
        { new: true }
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Receptionist updated successfully",
      data: updatedUser
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message || "Internal server error"
    });
  }
};


exports.createPatientFromPatientApp = async (req, res) => {
  try {
    const { error } = patientSchemaFromPatientApp.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    req.body.status = "active";
    req.body.role = "patient";
    req.body.doctorId = req.body?.doctorId;
    req.body.createdBy = req.headers?.userid;
    req.body.assignedBy = req.headers?.userid;
    req.body.updatedBy = req.headers?.userid;

    const counter = await Sequence.findByIdAndUpdate({ _id: sequenceConstant.USERSEQUENCE.USER_MODEL }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    req.body.userId = sequenceConstant.USERSEQUENCE.SEQUENCE.concat(counter.seq);

    const user = await Users.create(req.body);
    if (user) {
      return res.status(200).json({
        status: "success",
        message: "patient created successfully",
        data: user,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
// Update patient
exports.updatePatientFromPatientApp = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid;
    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required in query or headers",
      });
    }

    const { error } = patientUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "fail",
        message: error.details[0].message,
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.headers?.userid,
      updatedAt: new Date()
    };

    const user = await Users.findOneAndUpdate(
      { userId, role: "patient", isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('userId firstname lastname email mobile gender DOB age relationship familyProvider ');

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Patient not found or not authorized",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Patient updated successfully",
      data: user,
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get all family members
exports.getAllFamilyMembers = async (req, res) => {
  try {
    const userId = req.query.userId || req.headers.userid  ;
    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required in headers or query"
      });
    }

    const familyMembers = await Users.aggregate([
      {
        $match: {
          $or: [
            { familyProvider: userId },
            { userId: userId }
          ],
          isDeleted: false
        }
      },
      {
        $project: {
          userId: 1,
          firstname: 1,
          lastname: 1,
          email: 1,
          mobile: 1,
          relationship: 1,
          familyRole: 1,
          gender: 1,
          DOB: 1,
          age: 1,
          bloodgroup: 1
        }
      }
    ]);

    if (!familyMembers || familyMembers.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No family members found for this user"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Family members retrieved successfully",
      data: familyMembers
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
};

// Get unique specializations of doctors from users table
exports.getDoctorSpecializations = async (req, res) => {
  try {
    // Use aggregation to get unique, trimmed, case-insensitive specializations
    const agg = await Users.aggregate([
      {
        $match: {
          role: 'doctor',
          status: 'approved',
          'specialization.name': { $nin: [null, ''] }
        }
      },
      {
        $project: {
          specialization: '$specialization.name'
        }
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$specialization' } } },
          specialization: { $first: '$specialization' }
        }
      },
      {
        $project: {
          _id: 0,
          specialization: 1
        }
      }
    ]);

    const specializations = agg.map(s => s.specialization);
    return res.status(200).json({
      status: 'success',
      data: specializations
    });
  } catch (error) {
    console.error('Error in getDoctorSpecializations:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};


// Get list of doctors filtered by specialization and city
exports.getDoctorsBySpecializationAndCity = async (req, res) => {
  try {
    const { specialization, city } = req.query;
    if (!specialization || !city) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both specialization and city are required as query parameters.'
      });
    }

    // Find all approved doctors with matching specialization (case-insensitive, trimmed, and only if string)
    const doctors = await Users.aggregate([
      {
        $match: {
          role: 'doctor',
          status: 'approved'
        }
      },
      {
        $addFields: {
          specializationType: { $type: '$specialization.name' }
        }
      },
      {
        $addFields: {
          specializationTrimmed: {
            $cond: [
              { $eq: ['$specializationType', 'string'] },
              { $trim: { input: '$specialization.name' } },
              '$specialization.name'
            ]
          },
          specializationLower: {
            $cond: [
              { $eq: ['$specializationType', 'string'] },
              { $toLower: { $trim: { input: '$specialization.name' } } },
              '$specialization.name'
            ]
          }
        }
      },
      {
        $match: {
          specializationLower: specialization.trim().toLowerCase()
        }
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'userId',
          foreignField: 'userId',
          as: 'addresses',
          pipeline: [
            {
              $match: {
                type: 'Clinic',
                status: 'Active'
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          cityType: { $type: '$addresses.city' }
        }
      },
      {
        $addFields: {
          cityTrimmed: {
            $cond: [
              { $eq: ['$cityType', 'string'] },
              { $trim: { input: '$addresses.city' } },
              '$addresses.city'
            ]
          },
          cityLower: {
            $cond: [
              { $eq: ['$cityType', 'string'] },
              { $toLower: { $trim: { input: '$addresses.city' } } },
              '$addresses.city'
            ]
          }
        }
      },
      {
        $match: {
          cityLower: city.trim().toLowerCase()
        }
      },
      // Group by userId to remove duplicates
      {
        $group: {
          _id: '$userId',
          doc: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$doc' }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          name: 1,
          specialization: '$specializationTrimmed',
          city: '$cityTrimmed',
          email: 1,
          mobile: 1,
          experience: 1,
          degree: 1,
          services: 1,
          bio: 1
        }
      }
    ]);

    if (doctors.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No doctors found matching the criteria.'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: doctors
    });
  } catch (error) {
    console.error('Error in getDoctorsBySpecializationAndCity:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};

exports.getDoctorClinicsByUserIdAndCity = async (req, res) => {
  try {
    const { userId, city } = req.query;
    if (!userId || !city) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both userId and city are required as query parameters.'
      });
    }
    // Find clinics for the doctor in the specified city (case-insensitive, trimmed)
    const clinics = await addressModel.aggregate([
      {
      $match: {
        userId: userId,
        type: 'Clinic',
        status: 'Active',
        city: { $exists: true, $ne: null, $ne: '' }
      }
      },
      {
      $addFields: {
        cityType: { $type: '$city' }
      }
      },
      {
      $addFields: {
        cityTrimmed: {
        $cond: [
          { $eq: ['$cityType', 'string'] },
          { $trim: { input: '$city' } },
          '$city'
        ]
        },
        cityLower: {
        $cond: [
          { $eq: ['$cityType', 'string'] },
          { $toLower: { $trim: { input: '$city' } } },
          '$city'
        ]
        }
      }
      },
      {
      $match: {
        cityLower: city.trim().toLowerCase()
      }
      },
      {
      $project: {
        userId: 1,
        addressId: 1,
        status: 1,
        type: 1,
        clinicName: 1
      }
      }
    ]);
    if (clinics.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No clinics found for this doctor in the specified city.'
      });
    }
    return res.status(200).json({
      status: 'success',
      data: clinics
    });
  } catch (error) {
    console.error('Error in getDoctorClinicsByUserIdAndCity:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};