const mongoose = require('mongoose');

const kycDetailsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  pan: {
    number: {
      type: String,
      required: true,
    },
    attachmentUrl: {
      mimeType: {
        type: String,
        required: true
      },
      data: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    }
  },
  voter: {
    number: {
      type: String,
      required: true,
    },
    attachmentUrl: {
      mimeType: {
        type: String,
        required: true
      },
      data: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    }
  },
  kycVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update `updatedAt`
kycDetailsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('KycDetails', kycDetailsSchema);
