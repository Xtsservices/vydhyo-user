const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const addressController = require('../controllers/addressController');
const { addInsurance, getInsuranceById, updateInsurance } = require('../controllers/insuranceController');
const { getAllUsers, getUserById, updateUser, deleteMyAccount } = usersController;
const { getAddress, updateAddress, addAddress } = addressController;
const { addKYCDetails, getKYCDetails } = require('../controllers/kycController');

// Routes for user management
router.get('/AllUsers', getAllUsers);
router.get('/getUser', getUserById);
router.put('/updateUser', updateUser);
router.get('/deleteMyAccount', deleteMyAccount);

// Routes for user address management
router.get('/getAddress', getAddress);
router.post('/addAddress', addAddress);
router.put('/updateAddress', updateAddress);

// Routes for insurance management
router.post('/addInsurance', addInsurance);
router.get('/getInsuranceById', getInsuranceById);
router.put('/updateInsurance', updateInsurance);


// Routes for KYC management
router.post('/addKYCDetails', addKYCDetails);
router.get('/getKYCDetails', getKYCDetails);
// router.put('/updateInsurance', updateInsurance);


module.exports = router;