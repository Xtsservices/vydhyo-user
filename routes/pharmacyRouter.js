const express = require("express");
const { addMedInventory, addPrescription } = require("../controllers/pharmacyController");
const router = express.Router();

//Routes for approve Doctors
router.post("/addMedInventory", addMedInventory);


router.post('/addPrescription', addPrescription);
// router.get("/getAllMedicines", getAllMedicines);

module.exports = router;
