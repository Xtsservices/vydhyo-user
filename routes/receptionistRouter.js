const express = require("express");
const router = express.Router();
const multer = require('multer');

const { updateReceptionist, fetchMyDoctors, fetchMyDoctorPatients, totalBillPayFromReception } = require("../controllers/receptionistController");
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

router.get("/updateReceptionist", upload.single('profilePic'), updateReceptionist);
router.get("/fetchMyDoctors", fetchMyDoctors);
router.get("/fetchMyDoctorPatients/:doctorId", fetchMyDoctorPatients);
router.post("/totalBillPayFromReception", totalBillPayFromReception);

module.exports = router;
