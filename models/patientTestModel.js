const mongoose = require('mongoose');

const patientTestSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: [true, "Test name is required"],
      trim: true,
      minlength: [2, "Test name must be at least 2 characters long"],
      maxlength: [100, "Test name cannot exceed 100 characters"],
    },
    labTestID: {
		type: String,
		unique: true
	},
    testInventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestInventory",
      required: false,// Optional, manual entry allowed incase ther is no test
    },
    patientId: {
      type: String,
      required: [true, "Patient ID is required"],
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, "Doctor ID is required"],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
patientTestSchema.index({ doctorId: 1, createdAt: -1 });
patientTestSchema.index(
  { testInventoryId: 1, patientId: 1, doctorId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } }
);

module.exports = mongoose.model("PatientTest", patientTestSchema);
