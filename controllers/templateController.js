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
    // const templates = await Template.find({ userId: doctorId, status: 'active' }).sort({ createdAt: -1 });
    const templates = await Template.aggregate([
  {
    $match: { userId: doctorId, status: 'active' }
  },
  {
    $addFields: {
      medications: {
        $filter: {
          input: "$medications",
          as: "med",
          cond: { $eq: ["$$med.status", "active"] }
        }
      }
    }
  },
  { $sort: { createdAt: -1 } }
]);

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


exports.updateTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    const { name, medications, status } = req.body;

    // Find template
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found',
      });
    }

    // Check for duplicate template name (same user)
    if (name && name !== template.name) {
      const duplicate = await Template.findOne({
        name,
        userId: template.userId,
        status: 'active',
        _id: { $ne: templateId },
      });

      if (duplicate) {
        return res.status(409).json({
          message: `Template "${name}" already exists for this user`,
        });
      }
      template.name = name;
    }

    // Update template status
    if (status) {
      template.status = status;
    }

    // Handle medications
    if (Array.isArray(medications)) {
      /**
       * Rules:
       * - If `_id` exists → update medicine.
       * - If `_id` missing → add as new medicine.
       * - If medicine exists in DB but not in req.body → mark as inactive.
       */
      const incomingIds = medications.filter(m => m._id).map(m => m._id.toString());

      // 1. Mark medicines not present in request as inactive
      template.medications.forEach(existingMed => {
        if (!incomingIds.includes(existingMed._id.toString())) {
          existingMed.status = 'inactive';
        }
      });

      // 2. Update or Add medicines from request
      medications.forEach(med => {
        if (med._id) {
          // Update existing medicine
          const existingMed = template.medications.id(med._id);
          if (existingMed) {
            Object.assign(existingMed, med);
          }
        } else {
          // Add new medicine
          template.medications.push(med);
        }
      });
    }

    template.updatedAt = Date.now();
    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

// controllers/templateController.js
exports.deleteTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
 const doctorId = req.query.doctorId || req.headers.userid;
  if (!doctorId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Doctor ID is required',
      });
    }

   // Find template that belongs to this doctor
    const template = await Template.findOne({ _id: templateId, userId:doctorId });
     if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found or not owned by this doctor',
      });
    }

    // Soft delete → mark as inactive
    template.status = 'inactive';
    template.updatedAt = Date.now();

    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully (marked as inactive)',
      data: template,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};



