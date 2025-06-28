const mongoose = require('mongoose');

// Leave Schema
const leaveSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Leave', leaveSchema);

