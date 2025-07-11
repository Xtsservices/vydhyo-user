const express = require("express");
const { addTest, getTestsByDoctorId, getAllTestsPatientsByDoctorID, updatePatientTestPrice, processPayment,getpatientTestDetails, addTestBulk  } = require("../controllers/testController");
const router = express.Router();

router.post("/addtest", addTest);
router.post("/addtest/bulk", addTestBulk);
router.get("/getTestsByDoctorId/:doctorId", getTestsByDoctorId);
router.get("/getAllTestsPatientsByDoctorID/:doctorId", getAllTestsPatientsByDoctorID);
router.post("/updatePatientTestPrice", updatePatientTestPrice);
router.post("/processPayment", processPayment);

router.get("/getpatientTestDetails", getpatientTestDetails);

module.exports = router;
