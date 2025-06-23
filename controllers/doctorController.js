const { receptionistSchema } = require("../schemas/doctor_receptionistSchema");
const { patientSchema } = require("../schemas/ReceptionPatientSchema");
const Users = require("../models/usersModel");
const doctorReceptionist = require("../models/doctor_receptionistModel");
const { v4: uuidv4 } = require("uuid");
const { convertImageToBase64 } = require('../utils/imageService');
const Sequence = require("../sequence/sequenceSchema");
const sequenceConstant = require('../utils/constants')
const fs = require('fs');

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
      doctorId: req.headers.userid,
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
    req.body.role = "receptionist";
    req.body.doctorId = req.headers?.userid;
    req.body.createdBy = req.headers?.userid;
    req.body.assignedBy = req.headers?.userid;
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

exports.getReceptionistAndPatient = async (req, res) => {
  try {
    let obj = {}
    if (req.headers.role == 'doctor') {
      obj.role = 'receptionist'
    }
    if (req.headers.role == 'receptionist') {
      obj.role = 'patient'
    }
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
