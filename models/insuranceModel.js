const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
    insuranceId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        required: true
    },
    policyNumber: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['health', 'life'],
        required: true
    },
    coverageAmount: {
        type: Number,
        required: true
    },
    premiumAmount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,   
        default: 'active'
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

module.exports = mongoose.model('Insurance', insuranceSchema);
