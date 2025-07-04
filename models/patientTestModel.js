const mongoose = require('mongoose');

const patientTestSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true,
    minlength: [2, 'Test name must be at least 2 characters long'],
    maxlength: [100, 'Test name cannot exceed 100 characters']
  },
  patientId: {
    type: String,
    required: [true, 'Patient ID is required'],
    trim: true,
    index: true
  },
  doctorId: {
    type: String,
    required: [true, 'Doctor ID is required'],
    trim: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false
});

patientTestSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model('PatientTest', patientTestSchema);
