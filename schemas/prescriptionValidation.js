const Joi = require("joi");

// Sub-schema for medications
const medicineValidationSchema = Joi.object({
  // medInventoryId: Joi.string().required().messages({
  //   "string.base": "Medication ID must be a string",
  //   "any.required": "Medication ID is required",
  // }),
   medInventoryId: Joi.string().allow(null, "").optional().messages({
    "string.base": "Medication ID must be a string",
  }),
  medName: Joi.string().trim().required().messages({
    "string.empty": "Medicine name is required",
    "any.required": "Medicine name is required",
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
    "any.required": "Quantity is required",
  }),
  medicineType: Joi.string()
    .valid("Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops")
    .required()
    .messages({
      "string.empty": "Medicine type is required",
      "any.only": "Medicine type must be one of Tablet, Capsule, Syrup, Injection, Cream, Drops",
      "any.required": "Medicine type is required",
    }),
  dosage: Joi.string().trim().required().messages({
    "string.empty": "Dosage is required",
    "any.required": "Dosage is required",
  }),
  duration: Joi.number().integer().min(1).required().messages({
    "number.base": "Duration must be a number",
    "number.integer": "Duration must be an integer",
    "number.min": "Duration must be at least 1 day",
    "any.required": "Duration is required",
  }),
  timings: Joi.array().items(Joi.string().trim()).min(1).required().messages({
    "array.base": "Timings must be an array of strings",
    "array.min": "Timings must contain at least one entry",
    "any.required": "Timings is required",
  }),
  frequency: Joi.string() .required().required().messages({
      "string.empty": "Frequency is required",
      "any.required": "Frequency is required",
    }),
});

// Sub-schema for tests
const testValidationSchema = Joi.object({
  testName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Test name is required",
    "string.min": "Test name must be at least 2 characters long",
    "string.max": "Test name cannot exceed 100 characters",
    "any.required": "Test name is required",
  }),
  testInventoryId: Joi.string().optional().allow(null, "").messages({
    "string.base": "Test inventory ID must be a string",
  }),
});

// Main prescription schema
const prescriptionValidationSchema = Joi.object({
  appointmentId: Joi.string().trim().required().messages({
    "string.empty": "Appointment ID is required",
    "any.required": "Appointment ID is required",
  }),
  userId: Joi.string().trim().required().messages({
    "string.empty": "User ID is required",
    "any.required": "User ID is required",  
  }),
  doctorId: Joi.string().trim().required().messages({
    "string.empty": "Doctor ID is required",
    "any.required": "Doctor ID is required",
  }),
  addressId: Joi.string().trim().required().messages({
    "string.empty": "Address ID is required",
    "any.required": "Address ID is required",
  }),
  patientInfo: Joi.object({
    patientName: Joi.string().trim().required().messages({
      "string.empty": "Patient name is required",
      "any.required": "Patient name is required",
    }),
    age: Joi.number().integer().min(0).required().messages({
      "number.base": "Age must be a number",
      "number.integer": "Age must be an integer",
      "number.min": "Age cannot be negative",
      "any.required": "Age is required",
    }),
    gender: Joi.string().valid("Male", "Female", "Other").required().messages({
      "string.empty": "Gender is required",
      "any.only": "Gender must be one of Male, Female, or Other",
      "any.required": "Gender is required",
    }),
    mobileNumber: Joi.string()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        "string.empty": "Mobile number is required",
        "string.pattern.base": "Mobile number must be a 10-digit number",
        "any.required": "Mobile number is required",
      }),
      chiefComplaint: Joi.string().allow('').optional(),
    pastMedicalHistory: Joi.string().allow(null, "").optional(),
    familyMedicalHistory: Joi.string().allow(null, "").optional(),
    physicalExamination: Joi.string().allow(null, "").optional(),
  }).required(),
  vitals: Joi.object({
    bp: Joi.string().allow(null, "").optional(),
    pulseRate: Joi.string().allow(null, "").optional(),
    respiratoryRate: Joi.string().allow(null, "").optional(),
    temperature: Joi.string().allow(null, "").optional(),
    spo2: Joi.string().allow(null, "").optional(),
    height: Joi.string().allow(null, "").optional(),
    weight: Joi.string().allow(null, "").optional(),
    bmi: Joi.string().allow(null, "").optional(),
    investigationFindings: Joi.string().allow(null, "").optional(),
     other: Joi.object().pattern(Joi.string(), Joi.any()).allow(null).optional(),
  }).optional(),
  diagnosis: Joi.object({
    diagnosisNote: Joi.string().allow(null, "").optional(),
    testsNote: Joi.string().allow(null, "").optional(),
    selectedTests: Joi.array().items(testValidationSchema).min(0).optional(),
    medications: Joi.array().items(medicineValidationSchema).min(0).optional(),
  })
    .optional()
    .allow(null),
  advice: Joi.object({
    PrescribeMedNotes: Joi.string().allow(null, "").optional(),
    advice: Joi.string().allow(null, "").optional(),
    followUpDate: Joi.string().allow(null, "").optional(),
  }).optional(),
  createdBy: Joi.string().optional(),
  updatedBy: Joi.string().optional(),
});

module.exports = {
  medicineValidationSchema,
  testValidationSchema,
  prescriptionValidationSchema,
};
