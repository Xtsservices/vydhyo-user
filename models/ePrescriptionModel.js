const mongoose = require('mongoose');

const eprescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true
  },
  appointmentId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  addressId: {
    type: String,
    required: true
  },
  doctorInfo: {
    doctorName: {
      type: String,
      required: true
    },
    qualifications: {
      type: String,
      required: true
    },
    specialization: {
      type: String,
      required: true
    },
    reportDate: {
      type: String,
      required: true
    },
    reportTime: {
      type: String,
      required: true
    },
    selectedClinicId: {
      type: String,
      required: true
    },
    clinicName: {
      type: String,
      required: true
    },
    clinicAddress: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    contactNumber: {
      type: String,
      required: true
    }
  },
  patientInfo: {
    patientName: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      required: true
    },
    mobileNumber: {
      type: String,
      required: true
    },
    chiefComplaint: {
      type: String,
      required: true
    },
    pastMedicalHistory: {
      type: String,
      default: null
    },
    familyMedicalHistory: {
      type: String,
      default: null
    },
    physicalExamination: {
      type: String,
      default: null
    }
  },
  vitals: {
    bp: {
      type: String,
      default: null
    },
    pulseRate: {
      type: String,
      default: null
    },
    respiratoryRate: {
      type: String,
      default: null
    },
    temperature: {
      type: String,
      default: null
    },
    spo2: {
      type: String,
      default: null
    },
    height: {
      type: String,
      default: null
    },
    weight: {
      type: String,
      default: null
    },
    bmi: {
      type: String,
      default: null
    },
    investigationFindings: {
      type: String,
      default: null
    }
  },
  diagnosis: {
    diagnosisList: {
      type: String,
      default: null
    },
    selectedTests: [
      {
        testName: {
          type: String,
          required: true
        },
        testInventoryId: {
          type: String,
          required: true
        }
      }
    ]
  },
  medications: [
    {
      id: {
        type: Number,
        required: true
      },
      medName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      dosage: {
        type: String,
        required: true
      },
      duration: {
        type: Number,
        required: true
      },
      timings: [
        {
          type: String
        }
      ],
      frequency: {
        type: Number,
        required: true
      }
    }
  ],
  advice: {
    advice: {
      type: String,
      default: null
    },
    followUpDate: {
      type: String,
      default: null
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

module.exports = mongoose.model('eprescriptions', eprescriptionSchema);