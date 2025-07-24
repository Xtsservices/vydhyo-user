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
   
} = require('../controllers/usersController');
const { getAddress, updateAddress, addAddress, getClinicAddress, deleteClinicAddress, uploadClinicHeader } = require('../controllers/addressController');
const { addKYCDetails, getKYCDetails } = require('../controllers/kycController');

// Configure multer for file handling
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

// Routes for user management
router.get('/AllUsers', getAllUsers);
router.get('/getUser', getUserById);
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
router.put('/updateAddress', updateAddress);
router.post('/uploadClinicHeader',  uploadClinicHeader);

// Routes for insurance management
router.post('/addInsurance', addInsurance);
router.get('/getInsuranceById', getInsuranceById);
router.put('/updateInsurance', updateInsurance);

// Routes for KYC management
router.post('/addKYCDetails', upload.fields([
    { name: 'panFile', maxCount: 1 },
    // { name: 'voterFile', maxCount: 1 }
]), addKYCDetails);

router.get('/getKYCDetails', getKYCDetails);


// Route to send onboarding submission email
router.post('/sendOnboardingEmail', userSubmit);
router.post('/getUsersDetailsByIds', getUsersDetailsByIds);
router.post("/deleteClinicAddress", deleteClinicAddress);
router.post("/ePrescription", ePrescription);



module.exports = router;