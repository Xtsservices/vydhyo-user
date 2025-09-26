const express = require("express");
const { addTemplate, getTemplatesByDoctorId } = require("../controllers/templateController");
const router = express.Router();

router.post("/addTemplate", addTemplate);
router.get("/getTemplatesByDoctorId", getTemplatesByDoctorId);


module.exports = router;
