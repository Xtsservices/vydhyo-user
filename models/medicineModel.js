const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedInventory',
    required: false // Optional, as medicine can be manually entered
  },
  medName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  patientId: {
    type: String,
    required: [true, 'Patient ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  doctorId: {
    type: String,
    required: [true, 'Doctor ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Medicine', medicineSchema);
