const express = require('express');
const multer = require('multer');
const router = express.Router();
const { addInsurance, getInsuranceById, updateInsurance } = require('../controllers/insuranceController');
const { 
    getAllUsers,
    getUserById,
    updateUser,
    deleteMyAccount,
    updateSpecialization,
    updateConsultationModes,
    updateBankDetails,
    getUsersByIds,
    userSubmit,
    getUsersDetailsByIds,
    ePrescription,
    getAllSpecializations,
    getAllDoctorsBySpecializations,
    getDoctorsCount,
    getUserClinicsData,
    getKycByUserId,
    getUserIds,
    getDoctorsListByFamily,
    generateReferralCode,
    updateAppLanguage,
    addFeedback,
    getFeedbackByDoctorId,
    getAllFeedbacksGivenByPatient,
   
} = require('../controllers/usersController');
const { getAddress, updateAddress, addAddress, getClinicAddress, deleteClinicAddress, uploadClinicHeader, addAddressFromWeb, addPharmacyToClinic, addLabToClinic, getPharmacyByClinicId, getLabByClinicId, getClinicNameByID } = require('../controllers/addressController');
const { addKYCDetails, getKYCDetails } = require('../controllers/kycController');

// Configure multer for file handling
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily


const upload2 = multer({ storage: multer.memoryStorage() });
// Routes for user management
router.get('/AllUsers', getAllUsers);
router.get('/getDoctorsCount', getDoctorsCount);
router.get('/getUserClinicsData', getUserClinicsData);
router.get('/getUser', getUserById);
router.get('/getKycByUserId', getKycByUserId);
router.put('/updateUser', upload.single('profilePic'), updateUser);
router.get('/deleteMyAccount', deleteMyAccount);
router.post('/updateSpecialization', upload.fields([
    { name: 'drgreeCertificate', maxCount: 1 },
    { name: 'specializationCertificate', maxCount: 1 }
]), updateSpecialization);
router.post('/updateConsultationModes', updateConsultationModes);
router.post('/updateBankDetails', updateBankDetails);
router.post('/getUsersByIds', getUsersByIds);

// Routes for user address management
router.get('/getAddress', getAddress);
router.get('/getClinicAddress', getClinicAddress);
router.post('/addAddress', addAddress);
// router.post('/addAddressFromWeb', upload2.single('pharmacyHeader'), addAddressFromWeb);
router.post(
  '/addAddressFromWeb',
  upload2.fields([
    { name: 'file', maxCount: 1 }, // Clinic header
    { name: 'signature', maxCount: 1 }, // Digital signature
    { name: 'pharmacyHeader', maxCount: 1 },
    { name: 'labHeader', maxCount: 1 }
  ]),
  addAddressFromWeb
);

router.post('/addPharmacyToClinic', upload2.single('pharmacyHeader'), addPharmacyToClinic);
router.get('/getPharmacyByClinicId/:addressId', getPharmacyByClinicId);



router.post('/addLabToClinic', upload2.single('labHeader'), addLabToClinic);
router.get('/getLabByClinicId/:addressId', getLabByClinicId);



router.put('/updateAddress',  upload2.fields([
    { name: 'file', maxCount: 1 }, // Clinic header
    { name: 'signature', maxCount: 1 }, // Digital signature
    { name: 'pharmacyHeader', maxCount: 1 },
    { name: 'labHeader', maxCount: 1 }
  ]),updateAddress);
router.post('/uploadClinicHeader',  uploadClinicHeader);
router.get('/getClinicNameByID/:addressId',  getClinicNameByID);

// Routes for insurance management
router.post('/addInsurance', addInsurance);
router.get('/getInsuranceById', getInsuranceById);
router.put('/updateInsurance', updateInsurance);

// Routes for KYC management
router.post('/addKYCDetails', upload2.fields([
    { name: 'panFile', maxCount: 1 },
    // { name: 'voterFile', maxCount: 1 }
]), addKYCDetails);

router.get('/getKYCDetails', getKYCDetails);



// Route to send onboarding submission email
router.post('/sendOnboardingEmail', userSubmit);
router.post('/getUsersDetailsByIds', getUsersDetailsByIds);
router.post("/deleteClinicAddress", deleteClinicAddress);
router.post("/ePrescription", ePrescription);


//for patient app
router.get('/getAllSpecializations', getAllSpecializations);
router.get('/getAllDoctorsBySpecializations/:specialization', getAllDoctorsBySpecializations);

router.get("/getUserIds", getUserIds);
router.get("/getDoctorsListByFamily/:familyProvider", getDoctorsListByFamily);
router.post("/generateReferralCode", generateReferralCode);
router.get("/:userId/:appLanguage/language", updateAppLanguage);

//feedback and rating 
router.post("/addFeedBack", addFeedback);
router.get("/getFeedbackByDoctorId/:doctorId", getFeedbackByDoctorId);
router.get("/getAllFeedbacksGivenByPatient/:patientId", getAllFeedbacksGivenByPatient);


module.exports = router;