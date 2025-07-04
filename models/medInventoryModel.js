const mongoose = require('mongoose');

const medInventorySchema = new mongoose.Schema({
  medName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
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

module.exports = mongoose.model('MedInventory', medInventorySchema);