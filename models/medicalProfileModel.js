const mongoose = require('mongoose');

const medicalEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  diagnosedAt: Date,
  resolvedAt: Date,
  status: { type: String, enum: ['Active', 'Resolved', 'Chronic'], default: 'Active' },
  source: { type: String, enum: ['Doctor', 'Self-Reported', 'Hospital Record'], default: 'Doctor' },
  notes: String
}, { _id: false });

const allergySchema = new mongoose.Schema({
  allergen: { type: String, required: true },
  reaction: String,
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Moderate' },
  discoveredAt: Date,
  notes: String
}, { _id: false });

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: String,
  frequency: String,
  route: String, // oral, IV, etc.
  startDate: Date,
  endDate: Date,
  prescribedBy: String,
  notes: String
}, { _id: false });

const surgerySchema = new mongoose.Schema({
  procedure: { type: String, required: true },
  date: Date,
  hospital: String,
  surgeon: String,
  outcome: String,
  notes: String
}, { _id: false });

const vaccineSchema = new mongoose.Schema({
  vaccineName: { type: String, required: true },
  manufacturer: String,
  dose: Number,
  administeredOn: Date,
  administeredBy: String,
  status: { type: String, enum: ['Completed', 'Pending', 'Declined'], default: 'Completed' },
  notes: String
}, { _id: false });

const patientMedicalProfileSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  conditions: [medicalEventSchema],
  allergies: [allergySchema],
  medications: [medicationSchema],
  surgeries: [surgerySchema],
  vaccinations: [vaccineSchema],

  lifestyle: {
    smoker: { type: Boolean, default: false },
    alcoholUse: { type: Boolean, default: false },
    exerciseFrequency: { type: String, enum: ['None', 'Occasional', 'Regular'] },
    diet: String
  },

  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  version: { type: Number, default: 1 }
});

patientMedicalProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PatientMedicalProfile', patientMedicalProfileSchema);
