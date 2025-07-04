const express = require("express");
const { addMedInventory, addPrescription, getAllMedicinesByDoctorID } = require("../controllers/pharmacyController");
const router = express.Router();

//Routes for approve Doctors
router.post("/addMedInventory", addMedInventory);


router.post('/addPrescription', addPrescription);
router.get("/getAllMedicinesByDoctorID", getAllMedicinesByDoctorID);

module.exports = router;
