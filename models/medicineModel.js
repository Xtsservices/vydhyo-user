const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medInventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedInventory',
      required: false, // Optional, manual entry allowed
    },
    pharmacyMedID:{
    type: String,
    required: true,
		unique: true
    },
    medName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
     dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be an integer',
      },
    },
    timings: {
      type: String,
      required: [true, 'Timings is required'],
      trim: true,
    },
    frequency: {
      type: Number,
      required: [true, 'Frequency is required'],
      min: [1, 'Frequency must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Frequency must be an integer',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicates unless cancelled/deleted
medicineSchema.index(
  { medName: 1, patientId: 1, doctorId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' }, isDeleted: false },
  }
);

module.exports = mongoose.model('Medicine', medicineSchema);
