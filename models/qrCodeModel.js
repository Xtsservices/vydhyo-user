const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  addressId: {
    type: String,
    required: true,
    ref: 'Address', // Reference to the Address collection
  },
  userId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Clinic', 'Pharmacy', 'Lab'],
    required: true,
  },
  qrCode: {
    type: String,
    required: true, // Store the file path or URL of the QR code
  },
  pharmacyRegistrationNo: {
    type: String,
    required: function () {
      return this.type === 'Pharmacy';
    },
    sparse: true,
  },
  labRegistrationNo: {
    type: String,
    required: function () {
      return this.type === 'Lab';
    },
    sparse: true,
  },
  pharmacyId: {
    type: String,
    default: null,
    required: function () {
      return this.type === 'Pharmacy';
    },
  },
  labId: {
    type: String,
    default: null,
    required: function () {
      return this.type === 'Lab';
    },
  },
  createdBy: {
    type: String,
    required: true,
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
});

// Ensure unique QR code for pharmacies by pharmacyRegistrationNo and for labs by labRegistrationNo
qrCodeSchema.index(
  { pharmacyRegistrationNo: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'Pharmacy', pharmacyRegistrationNo: { $exists: true } } }
);
qrCodeSchema.index(
  { labRegistrationNo: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'Lab', labRegistrationNo: { $exists: true } } }
);
// Unique index for Clinic QR codes by addressId and type
qrCodeSchema.index(
  { addressId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'Clinic' } }
);

module.exports = mongoose.model('QRCode', qrCodeSchema);