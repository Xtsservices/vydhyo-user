const mongoose = require("mongoose");

const doctorReceptionistAssignmentSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    required: true,
    trim: true,
  },
  receptionistId: {
    type: String,
    required: true,
    trim: true,
  },
  assignedBy: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["inActive", "active"],
    default: "active",
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    default: null,
  },
  updatedBy: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  access: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model(
  "DoctorReceptionist",
  doctorReceptionistAssignmentSchema
);
