const express = require("express");
const { addTest, getTestsByDoctorId, getAllTestsPatientsByDoctorID,  } = require("../controllers/testController");
const router = express.Router();

router.post("/addtest", addTest);
router.get("/getTestsByDoctorId/:doctorId", getTestsByDoctorId);
router.get("/getAllTestsPatientsByDoctorID", getAllTestsPatientsByDoctorID);


module.exports = router;
