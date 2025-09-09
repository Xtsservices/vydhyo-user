const mongoose = require('mongoose');

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
   appointmentId: {
    type: String,
    required: true,
    unique: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  conversation: [{
    sender: {
      type: String,
      enum: ['doctor', 'patient'],
      required: true
    },
    message: {
      type: String,
      trim: true,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


// Validate conversation length and turn order
feedbackSchema.pre('save', function(next) {
  if (this.isModified('conversation')) {
    const conversation = this.conversation;
    if (conversation.length > 4) {
      return next(new Error('Conversation limit of 4 messages reached'));
    }
    if (conversation.length > 1) {
      const lastSender = conversation[conversation.length - 1].sender;
      const secondLastSender = conversation[conversation.length - 2].sender;
      if (lastSender === secondLastSender) {
        return next(new Error('Cannot send consecutive messages by the same sender'));
      }
    }
  }
  next();
});

// Create Feedback Model

module.exports = mongoose.model('Feedback', feedbackSchema);
