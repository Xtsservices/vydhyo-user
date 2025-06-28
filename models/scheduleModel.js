const mongoose = require('mongoose');


// Schedule Schema
const scheduleSchema = new mongoose.Schema({
  staffId: {
     type: String,
    required: true
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  fromTime: {
    type: String, // e.g., "09:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  },
  toTime: {
    type: String, // e.g., "17:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdBy: {
    type: String,
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
