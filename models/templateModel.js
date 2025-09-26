const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  medName: {
    type: String,
    required: true,
    trim: true
  },
  medicineType: {
    type: String,
    required: true,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Other']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  frequency: {
    type: String,
    required: true,
    enum: ['1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1', 'SOS', 'Other']
  },
  timings: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0 && v.length <= 4;
      },
      message: props => `Timings must be between 1 and 4 items`
    },
    enum: ['Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Bedtime']
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  medInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedInventory',
    required: false // Optional, manual entry allowed
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true
  }
});

const templateSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
   type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true // Tracks the doctor who created the template
  },
  medications: {
    type: [medicationSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Template must have at least one medication'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true
  },
  createdAt: {
  type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
    timestamps: true,
  });



const Template = mongoose.model('Template', templateSchema);

module.exports = Template;