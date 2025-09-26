const express = require("express");
const { addTemplate, getTemplatesByDoctorId, updateTemplate, deleteTemplate } = require("../controllers/templateController");
const router = express.Router();

router.post("/addTemplate", addTemplate);
router.get("/getTemplatesByDoctorId", getTemplatesByDoctorId);
router.put('/updateTemplate/:id', updateTemplate);
router.delete('/deleteTemplate/:id', deleteTemplate);


module.exports = router;
