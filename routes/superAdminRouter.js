
const express = require("express");
const router = express.Router();
const multer = require('multer');
const { getUserCounts } = require("../controllers/superAdminController");

//Routes for approve Doctors

router.get("/superAdminDashbaord", getUserCounts);




module.exports = router;
