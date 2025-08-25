const express = require("express");
const router = express.Router();
const multer = require('multer');

const {  getDoctorSpecializations, getDoctorsBySpecializationAndCity, getDoctorClinicsByUserIdAndCity,getCities } = require("../controllers/whatsappController");
// Get clinics of a doctor by userId and city
// Get doctors by specialization and city

// Get unique doctor specializations
router.get("/cities", getCities);
router.get('/specializations', getDoctorSpecializations);
router.get('/doctors-by-specialization-city', getDoctorsBySpecializationAndCity);
router.get('/doctor-clinics', getDoctorClinicsByUserIdAndCity);




module.exports = router;
