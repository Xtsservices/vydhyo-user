const TestInventory = require("../models/testModel");
const Joi = require("joi");
const { addTestSchema, getTestsSchema } = require("../schemas/testSchema");
const patientTestModel = require("../models/patientTestModel");
const Users = require("../models/usersModel");
const { createPayment } = require("../services/paymentServices");

// Add a new test to the testTable collection
const addTest = async (req, res) => {
  try {
    // Validate request body using Joi schema
    const { error } = addTestSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((err) => ({
          msg: err.message,
          param: err.path.join("."),
        })),
      });
    }

    const { testName, testPrice, doctorId } = req.body;

    // Check if testName already exists (case-insensitive)
    const existingTest = await TestInventory.findOne({
      testName: { $regex: `^${testName.trim()}$`, $options: "i" },
    });

    if (existingTest) {
      return res.status(400).json({
        success: false,
        message: "A test with this name already exists",
        errors: [
          { msg: "TestInventory name must be unique", param: "testName" },
        ],
      });
    }

    // Create new test document
    const newTest = new TestInventory({
      testName: testName.trim(),
      testPrice,
      doctorId: doctorId.trim(),
      createdAt: new Date(),
    });

    // Save to database
    const savedTest = await newTest.save();

    return res.status(201).json({
      success: true,
      message: "TestInventory added successfully",
      data: {
        id: savedTest._id,
        testName: savedTest.testName,
        testPrice: savedTest.testPrice,
        doctorId: savedTest.doctorId,
        createdAt: savedTest.createdAt,
      },
    });
  } catch (error) {
    console.error("Error adding test:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while adding the test",
    });
  }
};

// Get all tests for a specific doctorId
const getTestsByDoctorId = async (req, res) => {
  try {
    // Validate query parameter
    console.log("req.params.doctorId", req.params.doctorId);
    const { error } = getTestsSchema.validate(req.params.doctorId, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((err) => ({
          msg: err.message,
          param: err.path.join("."),
        })),
      });
    }

    const doctorId = req.params.doctorId;

    // Fetch tests by doctorId
    const tests = await TestInventory.find({ doctorId: doctorId.trim() }).sort({
      createdAt: -1,
    });

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
      message: "Tests retrieved successfully",
      data: formattedTests,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while fetching tests",
    });
  }
};

const getAllTestsPatientsByDoctorID = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Aggregate tests by patientId for the given doctorId
    const patients = await patientTestModel.aggregate([
      {
        $match: { doctorId }, // Filter by doctorId
      },
      {
        $lookup: {
          from: "testinventories", // Collection name for TestInventory model
          let: {
            testInventoryId: "$testInventoryId",
            testName: "$testName",
            doctorId: "$doctorId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$testInventoryId"] }, // Match by testInventoryId
                    {
                      $and: [
                        { $eq: ["$testName", "$$testName"] },
                        { $eq: ["$doctorId", "$$doctorId"] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "testData",
        },
      },
      {
        $unwind: {
          path: "$testData",
          preserveNullAndEmptyArrays: true, // Keep tests even if no matching test price
        },
      },
      {
        $lookup: {
          from: "users", // Collection name for Users model
          localField: "patientId",
          foreignField: "userId",
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true, // Keep tests even if no matching user
        },
      },
      {
        $group: {
          _id: "$patientId",
          patientName: {
            $first: {
              $concat: [
                { $ifNull: ["$userData.firstname", ""] },
                " ",
                { $ifNull: ["$userData.lastname", ""] },
              ],
            },
          },
          doctorId: { $first: "$doctorId" }, // Include doctorId
          tests: {
            $push: {
              _id: "$_id",
              testName: "$testName",
              price: { $ifNull: ["$testData.testPrice", null] },
              status: "$status", // Include status
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          patientId: "$_id",
          patientName: 1,
          doctorId: 1,
          tests: 1,
          _id: 0,
        },
      },
      {
        $sort: { patientId: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: patients || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

const updatePatientTestPrice = async (req, res) => {
  try {
    // Validate request body
    const { error } = Joi.object({
      testId: Joi.string().required(),
      patientId: Joi.string().required(),
      price: Joi.number().min(0).required(),
      doctorId: Joi.string().required(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }

    const { testId, patientId, price, doctorId } = req.body;

    // Verify patient exists
    const patient = await Users.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({
        status: "error",
        message: "Patient not found",
      });
    }

    // Check if test exists in TestInventory
    let test = await TestInventory.findById(testId);
    if (!test) {
      // Fallback: get test name from patient test
      const patientTest = await patientTestModel.findOne({
        _id: testId,
        patientId,
      });
      if (!patientTest) {
        return res.status(404).json({
          status: "error",
          message: "Patient test record not found",
        });
      }

      // Add test to inventory
      test = await TestInventory.create({
        testName: patientTest.testName || `Test-${testId}`,
        testPrice: price,
        doctorId,
      });
    }

    // Update the price in patient test
    const updatedPatientTest = await patientTestModel.findOneAndUpdate(
      { _id: testId, patientId },
      { $set: { price } },
      { new: true }
    );

    if (!updatedPatientTest) {
      return res.status(404).json({
        status: "error",
        message: "Patient test record not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Price updated successfully",
      data: updatedPatientTest,
    });
  } catch (error) {
    console.error("Error updating test price:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const processPayment = async (req, res) => {
  try {
    // Step 1: Validate input
    const { error } = Joi.object({
      patientId: Joi.string().required(),
      doctorId: Joi.string().required(),
      amount: Joi.number().min(0).required(),
      tests: Joi.array()
        .items(
          Joi.object({
            testId: Joi.string().required(),
            price: Joi.number().min(0).allow(null), // allow null/missing
          })
        )
        .required()
        .min(1),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }

    const { patientId, doctorId, amount, tests, paymentStatus = 'paid', discount, discountType } = req.body;

    // Step 2: Optional - Verify patient exists
    const patientExists = await Users.findOne({ userId: patientId });
    if (!patientExists) {
      return res
        .status(404)
        .json({ status: "error", message: "Patient not found" });
    }

    // Step 3: Process each test
    const updatedTests = [];

    for (const test of tests) {
      const { testId, price } = test;

      const updateData = {
        updatedAt: new Date(),
        status: price || price === 0 ? "completed" : "cancelled",
      };

      // Only set price if it's a valid number
      if (typeof price === "number" && price >= 0) {
        updateData.price = price;
      }

      const updated = await patientTestModel.findOneAndUpdate(
        { _id: testId, patientId, doctorId },
        { $set: updateData },
        { new: true }
      );

      if (updated) {
        updatedTests.push(updated);
      }
    }

      // Process payment if paymentStatus is 'paid'
    if (paymentStatus === 'paid') {
      paymentResponse = await createPayment(req.headers.authorization, {
        userId:patientId,
        doctorId,
        actualAmount: amount,
        discount:discount || 0,
        discountType: discountType || 'percentage',
        paymentStatus: 'paid',
        paymentFrom: 'lab',
      });

      if (!paymentResponse || paymentResponse.status !== 'success') {
        return res.status(500).json({
          status: 'fail',
          message: 'Payment failed.'
        });
      }
    }


    return res.status(200).json({
      status: "success",
      message: "Payment processed and test statuses updated",
      data: {
        patientId,
        doctorId,
        amount,
        updatedTests,
      },
    });
  } catch (err) {
    console.error("Error in processPayment:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports = {
  addTest,
  getTestsByDoctorId,
  getAllTestsPatientsByDoctorID,
  updatePatientTestPrice,
  processPayment,
};
