const {receptionistSchema} = require("../schemas/doctor_receptionistSchema");
const Users = require("../models/usersModel");
const doctorReceptionist = require("../models/doctor_receptionistModel");
const { v4: uuidv4 } = require("uuid");
const { convertImageToBase64 } = require('../utils/imageService');
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
    req.body.userId = uuidv4().replace(/-/g, "");
    req.body.receptionistId = req.body.userId;
    req.body.status = "active";
    req.body.role = "receptionist";
    req.body.doctorId = req.headers?.userid;
    req.body.createdBy = req.headers?.userid;
    req.body.assignedBy = req.headers?.userid;
    req.body.updatedBy = req.headers?.userid;
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
    await doctorReceptionist.create(req.body);
    return res.status(200).json({
      status: "pass",
      message: "receptionist created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
exports.getDoctorAndReceptionist = async (req, res) => {
  try {
    let obj={}
    if(req.headers.role=='doctor'){
      obj.role='receptionist'
    }
    if(req.headers.role=='receptionist'){
      obj.role='patient'
    }
    if (req.query?.mobile) {
      obj.mobile = { $regex: req.query.mobile, $options: 'i' };
    }
    const userData=await Users.find(obj)
    if(userData.length<1){
      return res.status(400).json({message:"no data found"})
    }
    return res.status(200).json({message:"data fetch successfully",data:userData})

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
