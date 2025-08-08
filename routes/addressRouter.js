const express = require("express");
const router = express.Router();
const {googleAddressSuggession, searchClinics} = require("../controllers/addressController");

//Routes for approve Doctors
router.get("/googleAddressSuggession", googleAddressSuggession);
router.get("/searchClinics", searchClinics);

module.exports = router;
