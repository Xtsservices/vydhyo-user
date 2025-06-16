const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  role: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  specialization: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    experience: { type: Number, required: true },
    drgreeCertificate: {
      mimeType: String,
      data: String,
    },
    specializationCertificate: {
      mimeType: String,
      data: String,
    },
  },
  medicalRegistrationNumber: { type: String, required: true },
  mobile: {
    type: String,
    lowercase: true,
    trim: true
  },
  userId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inActive'],
    default: 'inActive'
  },
  consultationModeFee: [{
    type: { type: String, required: true },
    fee: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  }],
  bankDetails: {
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    bankName: { type: String, default: null },
    accountHolderName: { type: String, default: null }
  },
  refreshToken: { type: String },
  spokenLanguage: {
    type: [String],
    default: [],
  },
  appLanguage: {
    type: String,
    enum: ['en', 'hi', 'tel'],
    default: 'en'
  },
  relationship: {
    type: String,
    enum: ['parent', 'child', 'self', 'other'],
    default: 'self'
  },
  profilepic: {
    mimeType: String,
    data: String,
  },
  gender: {
    type: String,
    default: null
  },
  DOB: {
    type: String,
    default: null
  },
  bloodgroup: {
    type: String,
    default: null
  },
  maritalStatus: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    default: null
  },
  updatedBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);