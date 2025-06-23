const express = require("express");
const router = express.Router();
const multer = require('multer');

const { createReceptionist, createPatient, getReceptionistAndPatient } = require("../controllers/doctorController");
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

//Routes for approve Doctors
router.post("/createReceptionist", upload.single('profilePic'), createReceptionist);
router.get("/getReceptionistAndPatient", getReceptionistAndPatient);
router.post("/createPatient", createPatient);




module.exports = router;
