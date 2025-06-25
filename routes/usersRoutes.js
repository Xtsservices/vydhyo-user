const express = require('express');
const multer = require('multer');
const router = express.Router();
const { addInsurance, getInsuranceById, updateInsurance } = require('../controllers/insuranceController');
const { getAllUsers, getUserById, updateUser, deleteMyAccount, updateSpecialization, updateConsultationModes, updateBankDetails } = require('../controllers/usersController');
const { getAddress, updateAddress, addAddress } = require('../controllers/addressController');
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

// Routes for user address management
router.get('/getAddress', getAddress);
router.post('/addAddress', addAddress);
router.put('/updateAddress', updateAddress);

// Routes for insurance management
router.post('/addInsurance', addInsurance);
router.get('/getInsuranceById', getInsuranceById);
router.put('/updateInsurance', updateInsurance);

// Routes for KYC management
router.post('/addKYCDetails', upload.fields([
    { name: 'panFile', maxCount: 1 },
    { name: 'voterFile', maxCount: 1 }
]), addKYCDetails);

router.get('/getKYCDetails', getKYCDetails);


module.exports = router;