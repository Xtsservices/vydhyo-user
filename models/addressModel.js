const { required } = require('joi');
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  addressId: {
    type: String,
    unique: true,
    required: true
  },
  mobile: { type: String, default: null },
  status: {
    type: String,
    enum: ['Active', 'InActive'],
    default: 'Active'
  },
  type: {
    type: String,
    enum: ['Home', 'Clinic', 'Hospital'],
    required: true
  },
  clinicName: {
    type: String,
      default: null
    // required: true,
    // unique: false,
  },
   pharmacyName: {
    type: String,
    default: null
  },
  labName: {
    type: String,
    default: null
  },
  pharmacyRegistrationNo: {
    type: String,
    // unique: true,
    sparse: true,
    required: function () {
      return this.pharmacyName && this.pharmacyName.trim() !== '';
    },
  },
  labRegistrationNo: {
    type: String,
    // unique: true,
    sparse: true,
   required: function () {
      return this.labName && this.labName.trim() !== '';
    },
  },
  pharmacyGst: {
    type: String,
   required: function () {
      return this.pharmacyName && this.pharmacyName.trim() !== '';
    },
  },
  labGst: {
    type: String,
    required: function() { return this.labName != null; }
  },
  pharmacyPan: {
    type: String,
   required: function () {
      return this.pharmacyName && this.pharmacyName.trim() !== '';
    },
  },
  labPan: {
    type: String,
    default: null // Optional even when labName is provided
  },
  address: {
    type: String,
    default: null
  },
   pharmacyAddress: {
    type: String,
    default: null,
    required: function() { return this.pharmacyName != null; }
  },
  labAddress: {
    type: String,
    default: null,
    required: function() { return this.labName != null; }
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
  startTime: {
    type: String,
    match: /^([0-1]\d|2[0-3]):([0-5]\d)$/ 
  },
  endTime: {
    type: String,
    match: /^([0-1]\d|2[0-3]):([0-5]\d)$/
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  headerImage: {
    type: String,
    default: null, // Store the file path or URL of the header image
  },
   pharmacyHeader: {
    type: String,
    default: null
  },
  labHeader: {
    type: String,
    default: null
  },
   digitalSignature: {
    type: String,
    default: null, // Store the base64 string of the digital signature (optional)
  },
  pharmacyId: {
  type: String,
  default: null
},
labId: {
  type: String,
  default: null
}
});


addressSchema.pre('save', function (next) {
  if (['Clinic', 'Hospital'].includes(this.type)) {
    if (!this.startTime || !this.endTime) {
      return next(new Error(`${this.type} requires both startTime and endTime`));
    }

    const toMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (toMinutes(this.startTime) >= toMinutes(this.endTime)) {
      return next(new Error('startTime must be before endTime'));
    }
  }
  next();
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