const express = require("express");
const { addMedInventory, addPrescription, getAllMedicinesByDoctorID, getAllPharmacyPatientsByDoctorID, pharmacyPayment, updatePatientMedicinePrice ,getPharmacyDetail, addMedInventoryBulk, getEPrescriptionByPatientId, getEPrescriptionByprescriptionId, getPatientPrescriptionDetails, addattach, getPrescriptionsByAppointmentIds, getEPrescriptionByAppointmentId} = require("../controllers/pharmacyController");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily
const path = require('path')
const fs = require("fs");
const upload2 = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../Uploads');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      // Use the original filename (e.g., appointmentId.pdf) sent from frontend
      cb(null, file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

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
