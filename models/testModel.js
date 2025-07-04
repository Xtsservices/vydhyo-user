const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true,
    minlength: [2, 'Test name must be at least 2 characters long'],
    maxlength: [100, 'Test name cannot exceed 100 characters'],
  },
  testPrice: {
    type: Number,
    required: [true, 'Test price is required'],
    min: [0, 'Test price cannot be negative'],
  },
  doctorId: {
    type: String,
    required: [true, 'Doctor ID is required'],
    trim: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
}, {
  timestamps: false, // We manage createdAt manually, no need for Mongoose's automatic timestamps
});

// Index for efficient querying by doctorId and createdAt
testSchema.index({ doctorId: 1, createdAt: -1 });

const Test = mongoose.model('Test', testSchema);

module.exports = Test;