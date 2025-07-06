const express = require("express");
const { addMedInventory, addPrescription, getAllMedicinesByDoctorID, getAllPharmacyPatientsByDoctorID, pharmacyPayment, updatePatientMedicinePrice ,getPharmacyDetail} = require("../controllers/pharmacyController");
const router = express.Router();

//Routes for approve Doctors
router.post("/addMedInventory", addMedInventory);


router.post('/addPrescription', addPrescription);
router.get("/getAllMedicinesByDoctorID", getAllMedicinesByDoctorID);
router.get("/getAllPharmacyPatientsByDoctorID", getAllPharmacyPatientsByDoctorID);
router.post("/pharmacyPayment", pharmacyPayment);
router.post("/updatePatientMedicinePrice", updatePatientMedicinePrice);

router.get("/getPharmacyDetail", getPharmacyDetail);

module.exports = router;
