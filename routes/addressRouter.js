const express = require("express");
const router = express.Router();
const { googleAddressSuggession, searchClinics, getCities } = require("../controllers/addressController");
// Get list of unique cities

//Routes for approve Doctors
router.get("/googleAddressSuggession", googleAddressSuggession);
router.get("/searchClinics", searchClinics);


module.exports = router;
