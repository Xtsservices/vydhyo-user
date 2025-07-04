const express = require("express");
const { addTest, getTestsByDoctorId } = require("../controllers/testController");
const router = express.Router();

router.post("/addtest", addTest);
router.get("/getTestsByDoctorId/:doctorId", getTestsByDoctorId);

module.exports = router;
