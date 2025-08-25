const express = require("express");
const router = express.Router();
const multer = require('multer');

const { createReceptionist, createPatient, searchAndFetchUser, getStaffByCreator, createSchedule, getSchedulesAndLeaves, createLeave, editReceptionist, createPatientFromPatientApp, updatePatientFromPatientApp, getAllFamilyMembers, getDoctorSpecializations, getDoctorsBySpecializationAndCity, getDoctorClinicsByUserIdAndCity } = require("../controllers/doctorController");
// Get clinics of a doctor by userId and city
// Get doctors by specialization and city


const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

//Routes for approve Doctors
router.post("/createReceptionist/:userid", upload.single('profilePic'), createReceptionist);
router.get("/searchUser", searchAndFetchUser);
router.post("/createPatient", createPatient);
// Route definition
router.get("/getStaffByCreator/:userid", getStaffByCreator);
router.post("/createSchedule", createSchedule);
router.post("/createLeave", createLeave);
router.get("/getSchedulesAndLeaves", getSchedulesAndLeaves);
router.put("/editReceptionist",  editReceptionist);

//patient app route
router.post("/createPatientFromPatientApp", createPatientFromPatientApp);
router.put("/updatePatientFromPatientApp", updatePatientFromPatientApp);
router.get("/getAllFamilyMembers", getAllFamilyMembers);
// Get unique doctor specializations
router.get('/specializations', getDoctorSpecializations);
router.get('/doctors-by-specialization-city', getDoctorsBySpecializationAndCity);
router.get('/doctor-clinics', getDoctorClinicsByUserIdAndCity);




module.exports = router;
