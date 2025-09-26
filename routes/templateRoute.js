const express = require("express");
const { addTemplate } = require("../controllers/templateController");
const router = express.Router();

router.post("/addTemplate", addTemplate);


module.exports = router;
