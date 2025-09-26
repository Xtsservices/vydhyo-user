const Joi = require("joi");
const mongoose = require("mongoose");
const { templateSchema } = require("../schemas/templateSchema");
const Template = require("../models/templateModel");

exports.addTemplate = async (req, res) => {
    try{
 // Validate request body using Joi
    const { error, value } = templateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    const { name, userId, createdBy, medications, status } = value;

    // Additional check for duplicate template name (user-specific)
    const existingTemplate = await Template.findOne({
      name: name,
      userId: userId,
      status: 'active'
    });

    if (existingTemplate) {
      return res.status(409).json({ 
        message: `Template "${name}" already exists for this user` 
      });
    }

    
    const newTemplate = new Template({ 
      name, 
      userId, 
      createdBy, 
      medications, 
      status: status || 'active' 
    });

    await newTemplate.save();
    return res.status(201).json({
      success: true,
      data: newTemplate,
    });
   
    }catch (error) {
    console.error('Error creating template:', error);
        // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A template with this configuration already exists' 
      });
    }
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

exports.getTemplatesByDoctorId = async (req, res) => {
    try{
 const doctorId = req.query.doctorId || req.headers.userid;
    if (!doctorId) {
        return res.status(400).json({ message: 'doctorId is required' });
    }
    const templates = await Template.find({ userId: doctorId, status: 'active' }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: templates,
    });
    }catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}