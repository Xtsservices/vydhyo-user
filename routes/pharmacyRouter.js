const express = require("express");
const { addMedInventory, addPrescription, getAllMedicinesByDoctorID, getAllPharmacyPatientsByDoctorID, pharmacyPayment, updatePatientMedicinePrice } = require("../controllers/pharmacyController");
const router = express.Router();

//Routes for approve Doctors
router.post("/addMedInventory", addMedInventory);


router.post('/addPrescription', addPrescription);
router.get("/getAllMedicinesByDoctorID", getAllMedicinesByDoctorID);
router.get("/getAllPharmacyPatientsByDoctorID", getAllPharmacyPatientsByDoctorID);
router.post("/pharmacyPayment/:patientId", pharmacyPayment);
router.post("/updatePatientMedicinePrice", updatePatientMedicinePrice);


module.exports = router;
