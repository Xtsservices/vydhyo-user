
const express = require("express");
const router = express.Router();
const multer = require('multer');
const { getUserCounts } = require("../controllers/doctordashbaord");

//Routes for approve Doctors

router.get("/dashboard", getUserCounts);




module.exports = router;
