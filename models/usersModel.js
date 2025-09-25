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
    id: { type: String,   },
    name: { type: String,   },
    experience: { type: Number,   },
    degree: { type: String }, // Added for degree (e.g., MBBS, MD)
    services: { type: String, default: '' }, // Added for services, optional
    bio: { type: String, default: '' },
    degreeCertificate: {
       type: String,
    default: null
    },
    specializationCertificate: {
      type: String,
    default: null
    },
  },
  medicalRegistrationNumber: { type: String,   },
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
    default: 'inActive'
  },
  consultationModeFee: [{
    type: { type: String,   },
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
    type: String,
    default: null
  },
  gender: {
    type: String,
    default: null
  },
  DOB: {
    type: String,
    default: null
  },
   age: {
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
  rejectionReason:{ type: String,default:null},
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
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  lastLogout: {
    type: Date,
    default: null
  },
  access: {
    type: [String],
    default: []
  },
   familyProvider: {
    type: String,
    default: null // Set to userId of the primary family member or null if self
  },
   referralCode: { type: String, unique: true, sparse: true },
    referredBy: {  
      type: String,
     default: null
     },
     usedReferralCode: { type: String ,default: null}, 
  usedReferralCodeStatus: {
    type: String,
    enum: ["pending", "applied", "invalid", "expired", "alreadyUsed"],
    default: "pending"
  },
   userFrom: {
    type: String,
    default: null
  },
  overallRating: { //feedback rating
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
   fcmToken: {
    type: String,
    default: null,
  },

});

module.exports = mongoose.model('User', userSchema);