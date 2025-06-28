const express = require("express");
const router = express.Router();
const {googleAddressSuggession} = require("../controllers/addressController");

//Routes for approve Doctors
router.get("/googleAddressSuggession", googleAddressSuggession);

module.exports = router;
