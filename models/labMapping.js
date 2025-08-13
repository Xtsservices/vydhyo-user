const mongoose = require('mongoose');

const labMappingSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  clinicId: { type: String, required: true },
  labId: { type: String, required: true },
  status: {
    type: String,
    enum: ['Active', 'InActive'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LabMapping', labMappingSchema);