const express = require("express");
const { addTest, getTestsByDoctorId, getAllTestsPatientsByDoctorID, updatePatientTestPrice, processPayment,  } = require("../controllers/testController");
const router = express.Router();

router.post("/addtest", addTest);
router.get("/getTestsByDoctorId/:doctorId", getTestsByDoctorId);
router.get("/getAllTestsPatientsByDoctorID/:doctorId", getAllTestsPatientsByDoctorID);
router.post("/updatePatientTestPrice", updatePatientTestPrice);
router.post("/processPayment", processPayment);


module.exports = router;
