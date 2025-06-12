const { required } = require('joi');
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  addressId: {
    type: String,
    unique: true,
    required: true
  },
  countrycode: { type: String, default: '+91' },
  status: {
    type: String,
    enum: ['Active', 'InActive'],
    default: 'Active'
  },
  type: {
    type: String,
    enum: ['Home', 'Clinic'],
    required: true
  },
  address: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  state: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  },
  pincode: {
    type: String,
    default: null
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
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

addressSchema.pre('save', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

addressSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  const update = this.getUpdate();

  if (update.latitude != null && update.longitude != null) {
    update.location = {
      type: 'Point',
      coordinates: [update.longitude, update.latitude]
    };
  }

  // If using $set wrapper
  if (update.$set?.latitude != null && update.$set?.longitude != null) {
    update.$set.location = {
      type: 'Point',
      coordinates: [update.$set.longitude, update.$set.latitude]
    };
  }

  next();
});


addressSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Address', addressSchema);