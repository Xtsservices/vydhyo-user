const express = require("express");
const { addMedInventory, addPrescription, getAllMedicinesByDoctorID, getAllPharmacyPatientsByDoctorID, pharmacyPayment, updatePatientMedicinePrice ,getPharmacyDetail, addMedInventoryBulk, getEPrescriptionByPatientId, getEPrescriptionByprescriptionId, getPatientPrescriptionDetails, addattach, getPrescriptionsByAppointmentIds, getEPrescriptionByAppointmentId} = require("../controllers/pharmacyController");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

//Routes for approve Doctors
router.post("/addMedInventory", addMedInventory);
router.post("/addMedInventory/bulk", addMedInventoryBulk);

router.post("/addattachprescription", upload.single("file"),addattach);

router.post('/addPrescription', addPrescription);
router.get('/getEPrescriptionByPatientId/:patientId', getEPrescriptionByPatientId);
router.get('/getEPrescriptionByAppointmentId/:appointmentId', getEPrescriptionByAppointmentId);
router.get('/getEPrescriptionByprescriptionId/:prescriptionId', getEPrescriptionByprescriptionId);
router.get("/getAllMedicinesByDoctorID", getAllMedicinesByDoctorID);
router.get("/getAllPharmacyPatientsByDoctorID", getAllPharmacyPatientsByDoctorID);
router.post("/pharmacyPayment", pharmacyPayment);
router.post("/updatePatientMedicinePrice", updatePatientMedicinePrice);

router.get("/getPharmacyDetail", getPharmacyDetail);
router.get("/getPatientPrescriptionDetails/:patientId", getPatientPrescriptionDetails);
router.post('/getPrescriptionsByAppointmentIds', getPrescriptionsByAppointmentIds);

module.exports = router;
