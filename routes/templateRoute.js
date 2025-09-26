const express = require("express");
const { addTemplate, getTemplatesByDoctorId, updateTemplate } = require("../controllers/templateController");
const router = express.Router();

router.post("/addTemplate", addTemplate);
router.get("/getTemplatesByDoctorId", getTemplatesByDoctorId);
router.put('/updateTemplate/:id', updateTemplate);

module.exports = router;
