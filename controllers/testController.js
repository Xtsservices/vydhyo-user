const Test = require('../models/testModel');
const Joi = require('joi');
const { addTestSchema, getTestsSchema } = require('../schemas/testSchema');

// Add a new test to the testTable collection
const addTest = async (req, res) => {
  try {
    // Validate request body using Joi schema
    const { error } = addTestSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((err) => ({
          msg: err.message,
          param: err.path.join('.'),
        })),
      });
    }

    const { testName, testPrice, doctorId } = req.body;

    // Check if testName already exists (case-insensitive)
    const existingTest = await Test.findOne({
      testName: { $regex: `^${testName.trim()}$`, $options: 'i' },
    });

    if (existingTest) {
      return res.status(400).json({
        success: false,
        message: 'A test with this name already exists',
        errors: [{ msg: 'Test name must be unique', param: 'testName' }],
      });
    }

    // Create new test document
    const newTest = new Test({
      testName: testName.trim(),
      testPrice,
      doctorId: doctorId.trim(),
      createdAt: new Date(),
    });

    // Save to database
    const savedTest = await newTest.save();

    return res.status(201).json({
      success: true,
      message: 'Test added successfully',
      data: {
        id: savedTest._id,
        testName: savedTest.testName,
        testPrice: savedTest.testPrice,
        doctorId: savedTest.doctorId,
        createdAt: savedTest.createdAt,
      },
    });
  } catch (error) {
    console.error('Error adding test:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while adding the test',
    });
  }
};

// Get all tests for a specific doctorId
const getTestsByDoctorId = async (req, res) => {
  try {
    // Validate query parameter
    console.log("req.params.doctorId",req.params.doctorId)
    const { error } = getTestsSchema.validate(req.params.doctorId, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((err) => ({
          msg: err.message,
          param: err.path.join('.'),
        })),
      });
    }

    const doctorId = req.params.doctorId

    // Fetch tests by doctorId
    const tests = await Test.find({ doctorId: doctorId.trim() }).sort({ createdAt: -1 });

    // Map tests to response format
    const formattedTests = tests.map((test) => ({
      id: test._id,
      testName: test.testName,
      testPrice: test.testPrice,
      doctorId: test.doctorId,
      createdAt: test.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: 'Tests retrieved successfully',
      data: formattedTests,
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching tests',
    });
  }
};

module.exports = { addTest, getTestsByDoctorId };