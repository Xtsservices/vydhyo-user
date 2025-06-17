const express = require("express");
const router = express.Router();
const {approveDoctorByAdmin} = require("../controllers/adminApprovalController");

//Routes for approve Doctors
router.put("/approveDoctor", approveDoctorByAdmin);

module.exports = router;
