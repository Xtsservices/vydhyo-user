const mongoose = require('mongoose');

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create Feedback Model

module.exports = mongoose.model('Feedback', feedbackSchema);
