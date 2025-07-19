const mongoose = require("mongoose");

const eprescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
  },
  prescriptionAttachment: {
    type: String,
  },
  appointmentId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  doctorId: {
    type: String,
    required: true,
  },
  addressId: {
    type: String,
    required: true,
  },
  patientInfo: {
    patientName: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    chiefComplaint: {
      type: String,
  default: '',
    },
    pastMedicalHistory: {
      type: String,
      default: null,
    },
    familyMedicalHistory: {
      type: String,
      default: null,
    },
    physicalExamination: {
      type: String,
      default: null,
    },
  },
  vitals: {
    bp: {
      type: String,
      default: null,
    },
    pulseRate: {
      type: String,
      default: null,
    },
    respiratoryRate: {
      type: String,
      default: null,
    },
    temperature: {
      type: String,
      default: null,
    },
    spo2: {
      type: String,
      default: null,
    },
    height: {
      type: String,
      default: null,
    },
    weight: {
      type: String,
      default: null,
    },
    bmi: {
      type: String,
      default: null,
    },
    investigationFindings: {
      type: String,
      default: null,
    },
  },
  diagnosis: {
    type: new mongoose.Schema(
      {
        diagnosisNote: {
          type: String,
          default: null,
        },
        testsNote: {
          type: String,
          default: null,
        },
        PrescribeMedNotes: {
          type: String,
          default: null,
        },
        selectedTests: [
          {
            testName: {
              type: String,
              required: true,
            },
            testInventoryId: {
              type: String,
                default: null,
              // required: true,
            },
          },
        ],
        medications: [
          {
            medInventoryId: {
              type: String,
               default: null,
              // required: true,
            },
            medName: {
              type: String,
              required: true,
            },
            medicineType :{
  type: String,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
            dosage: {
              type: String,
              required: true,
            },
            duration: {
              type: Number,
              required: true,
            },
            timings: [
              {
                type: String,
              },
            ],
            frequency: {
              type: String,
              required: true,
            },
          },
        ],
      },
      { _id: false }
    ),
    default: null,
  },
  advice: {
    advice: {
      type: String,
      default: null,
    },
    followUpDate: {
      type: String,
      default: null,
    },
  },
  createdBy: {
    type: String,
    default: null,
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

module.exports = mongoose.model("eprescriptions", eprescriptionSchema);
