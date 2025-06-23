const express = require("express");
const router = express.Router();
const multer = require('multer');

const { updateReceptionist, fetchMyDoctors } = require("../controllers/receptionistController");
const upload = multer({ dest: 'uploads/' }); // files go to ./uploads temporarily

router.get("/updateReceptionist", upload.single('profilePic'), updateReceptionist);
router.get("/fetchMyDoctors", fetchMyDoctors);

module.exports = router;
