const TestInventory = require("../models/testModel");
const Joi = require("joi");
const { addTestSchema, getTestsSchema } = require("../schemas/testSchema");
const patientTestModel = require("../models/patientTestModel");
const Users = require("../models/usersModel");
const { createPayment } = require("../services/paymentServices");
const PREFIX_SEQUENCE = require("../utils/constants");
const Counter = require("../sequence/sequenceSchema");
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require("axios");
const UserAddress = require("../models/addressModel");


const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;

const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY
  }
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


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

    // Check if a test with the same name (case-insensitive) and same doctorId already exists
    const existingTest = await TestInventory.findOne({
      testName: { $regex: `^${testName.trim()}$`, $options: "i" },
      doctorId: doctorId,
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

// Helper function to check duplicates
const checkDuplicates = async (doctorId, testNames) => {
  const existing = await TestInventory.find({
    doctorId,
    testName: { $in: testNames.map(name => new RegExp(`^${name}$`, 'i')) },
  }).lean();
  return new Set(existing.map(test => test.testName.toLowerCase()));
};

const addTestBulk = [
  upload.single('file'),
  async (req, res) => {
    try {
      // Get doctorId from body or headers
      const doctorId = req.query.doctorId || req.headers.userid;
      if (!doctorId) {
        return res.status(400).json({
          status: 'fail',
          message: 'Doctor ID is required in body or headers',
        });
      }

      // Check if file is provided
      if (!req.file) {
        return res.status(400).json({
          status: 'fail',
          message: 'Excel file is required',
        });
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: ['testName', 'testPrice'] });

      if (data.length <= 1) { // First row is headers
        return res.status(400).json({
          status: 'fail',
          message: 'Excel file contains no data',
        });
      }

      // Validate headers
      const expectedHeaders = ['testName', 'testPrice'];
      const firstRow = data[0];
      if (!expectedHeaders.every(header => header in firstRow)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Excel file must have headers: testName, testPrice',
        });
      }

      // Remove header row
      data.shift();

      // Validate and process each row
      const errors = [];
      const testsToInsert = [];
      const existingTests = await checkDuplicates(doctorId, data.map(row => row.testName));
      const processedTestNames = new Set();

      for (const [index, row] of data.entries()) {
        // Override doctorId from body/headers
        const test = { ...row, doctorId };

        // Validate row using Joi schema
        const { error } = addTestSchema.validate(test, { abortEarly: false });
        if (error) {
          errors.push({
            row: index + 2, // Excel row number (1-based, plus header)
            message: error.details.map(detail => detail.message).join('; '),
          });
          continue;
        }

        // Check for duplicates (database and within file)
        const testNameLower = test.testName.toLowerCase();
        if (existingTests.has(testNameLower) || processedTestNames.has(testNameLower)) {
          errors.push({
            row: index + 2,
            message: `Test '${test.testName}' already exists for doctor ${doctorId}`,
          });
          continue;
        }

        testsToInsert.push({
          testName: test.testName.trim(),
          testPrice: test.testPrice,
          doctorId: doctorId.trim(),
          createdAt: new Date(),
        });
        processedTestNames.add(testNameLower);
      }

      // Insert valid tests
      let insertedTests = [];
      if (testsToInsert.length > 0) {
        insertedTests = await TestInventory.insertMany(testsToInsert, { ordered: false });
      }

      // Build response
      const response = {
        status: 'success',
        message: testsToInsert.length > 0 ? 'Tests added successfully' : 'No valid tests to add',
        data: {
          insertedCount: insertedTests.length,
          insertedTests,
          errors: errors.length > 0 ? errors : undefined,
        },
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Error in addTestBulk:', error.stack);
      return res.status(500).json({
        status: 'fail',
        message: 'Error adding test inventory',
        error: error.message,
      });
    }
  },
]


// Get all tests for a specific doctorId added pagination
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

     // Pagination inputs with validation
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
    }

    const skip = (page - 1) * limit;

     // Fetch total count of tests
    const totalTests = await TestInventory.countDocuments({ doctorId: doctorId.trim() });

    // Fetch tests by doctorId
    const tests = await TestInventory.find({ doctorId: doctorId.trim() }).sort({
      createdAt: -1,
    }).skip(skip)
      .limit(limit);

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
     data: {
        tests: formattedTests,
        pagination: {
          page,
          limit,
          totalTests,
          totalPages: Math.ceil(totalTests / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while fetching tests",
    });
  }
};


const getAllTestsByDoctorId = async (req, res) => {
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
        tests: formattedTests,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while fetching tests",
    });
  }
};

const getAllTestsPatientsByDoctorID2 = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
     const { searchValue, status, page = 1, limit = 5 } = req.query;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

     // Validate pagination inputs
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Page and limit must be positive integers",
      });
    }

    const skip = (pageNum - 1) * limitNum;

   // Build match conditions
    const matchConditions = { doctorId };
    if (searchValue) {
      matchConditions.patientId = { $regex: searchValue, $options: "i" }; // Case-insensitive search
    }

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: matchConditions, // Filter by doctorId and patientId (if searchValue provided)
      },
      {
        $lookup: {
          from: "testinventories",
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
                    { $eq: ["$_id", "$$testInventoryId"] },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "userId",
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true,
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
          doctorId: { $first: "$doctorId" },
          latestCreatedAt: { $max: "$createdAt" },
          tests: {
            $push: {
              _id: "$_id",
              testName: "$testName",
              price: { $ifNull: ["$testData.testPrice", null] },
              status: "$status",
              createdAt: "$createdAt",
              labTestID: "$labTestID",
            },
          },
        },
      },
      // Filter tests by status
      {
        $project: {
          patientId: "$_id",
          patientName: 1,
          doctorId: 1,
          tests: {
            $filter: {
              input: "$tests",
              as: "test",
              cond: {
                $cond: {
                  if: { $eq: [status, "pending"] },
                  then: { $eq: ["$$test.status", "pending"] },
                  else: { $ne: ["$$test.status", "pending"] },
                },
              },
            },
          },
          _id: 0,
        },
      },
      // Remove patients with no matching tests
      {
        $match: {
          tests: { $ne: [] },
        },
      },
      {
        $sort: { latestCreatedAt: -1 }, // Sort by patientId descending (latest on top)
      },
      {
        $facet: {
          paginatedResults: [
            { $skip: skip },
            { $limit: limitNum },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ];


    // Aggregate tests by patientId for the given doctorId
     const [result] = await patientTestModel.aggregate(pipeline);
    const patients = result.paginatedResults || [];
    const totalPatients = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalPatients / limitNum);

    // Step 2: Fetch addressId from Appointment Service
        for (let patient of patients) {
          try {
            const resp = await axios.get(
              `http://localhost:4005/appointment/getAppointmentDataByUserIdAndDoctorId`,
              {
                params: {
                  doctorId: patient.doctorId,
                  userId: patient.patientId,
                },
                headers: {
            'Content-Type': 'application/json',
            // Add authorization headers if needed
            // 'Authorization': `Bearer ${req.headers.authorization}`
          },
              },
               
            );
            const addressId = resp.data?.data?.addressId || null;
            patient.addressId = addressId;
          if (addressId) {
              const address = await UserAddress.findOne({ addressId }).lean();
              if (address && address.labName) {
                let labHeaderUrl = null;
    
    console.log("Pharmacy header from DB:", address);
    
            if (address.labHeader) {
              // Generate signed S3 URL for pharmacy header image
              try {
                labHeaderUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: address.labHeader,
                  }),
                  { expiresIn: 300 }
                );
              } catch (s3Err) {
                console.error(`Error fetching S3 signed URL:`, s3Err.message);
              }
            }
    
                patient.labData = {
                  labName: address.labName,
                  labRegistrationNo: address.labRegistrationNo,
                  labGst: address.labGst,
                  labPan: address.labPan,
                  labAddress: address.labAddress,
                  labId: address.labId,
                  labHeaderUrl,
                };
              } else {
                patient.labData = null;
              }
            } else {
              patient.labData = null;
            }
          } catch (err) {
            console.error(
              `Error fetching appointment or address for ${patient.patientId}`,
              err.message
            );
            patient.addressId = null;
            patient.labData = null;
          }
        }
    

    res.status(200).json({
      status: "success",
      data: {
        patients,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPatients,
          totalPages,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

const getAllTestsPatientsByDoctorID = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.headers.userid;
    const { searchValue, status, page = 1, limit = 5 } = req.query;

    // Validate doctorId
    if (!doctorId) {
      return res.status(400).json({
        status: "fail",
        message: "Doctor ID is required",
      });
    }

    // Validate pagination inputs
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || !Number.isFinite(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        status: "fail",
        message: "Page and limit must be positive integers",
      });
    }

    const skip = (pageNum - 1) * limitNum;
      const effectiveStatus = (typeof status === "string") ? status : "pending";

    // Build match conditions
       const matchConditions = { doctorId, isDeleted: false };


    if (searchValue) {
      matchConditions.patientId = { $regex: searchValue, $options: "i" }; // Case-insensitive search
    }

    // Status filter: default to "pending" if not provided
     // Status filter: default to "pending" if not provided
    if (typeof status === "string") {
      if (status === "pending") {
        matchConditions.status = "pending";
      } else if (status === "non-pending") {
        matchConditions.status = { $ne: "pending" };
      } else {
        // Allow exact status match like "completed", "cancelled", etc.
        matchConditions.status = status;
      }
    } else {
      matchConditions.status = "pending"; // default
    }

    // Calculate 48-hour threshold
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);


    // Build aggregation pipeline
    const pipeline = [
      { $match: matchConditions },

       // Lookup eprescriptions to get appointmentId and addressId
            {
              $lookup: {
                from: "eprescriptions",
                localField: "prescriptionId",
                foreignField: "prescriptionId",
                as: "prescriptionData",
              },
            },
            { $unwind: { path: "$prescriptionData", preserveNullAndEmptyArrays: true } },
            
             // Exclude medicines with no matching eprescription
            { $match: { prescriptionData: { $ne: null } } },

      {
        $lookup: {
          from: "testinventories",
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
                    { $eq: ["$_id", "$$testInventoryId"] },
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
            { $project: { _id: 1, testPrice: 1 } },
          ],
          as: "testData",
        },
      },

      { $unwind: { path: "$testData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "userId",
          as: "userData",
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        ...(searchValue
        ? [
            {
              $match: {
                $or: [
                  { patientId: { $regex: searchValue, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $trim: {
                            input: {
                              $concat: [
                                { $ifNull: ["$userData.firstname", ""] },
                                " ",
                                { $ifNull: ["$userData.lastname", ""] },
                              ],
                            },
                          },
                        },
                        regex: searchValue,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),

      {
        $group: {
          _id: "$prescriptionId",  // Changed to group by prescriptionId (proxy for appointmentId)
        appointmentId: { $first: "$prescriptionData.appointmentId" },
          patientId: { $first: "$patientId" },
          patientName: {
            $first: {
              $concat: [
                { $ifNull: ["$userData.firstname", ""] },
                " ",
                { $ifNull: ["$userData.lastname", ""] },
              ],
            },
          },
          doctorId: { $first: "$doctorId" },
          addressId: { $first: "$prescriptionData.addressId" },
          prescriptionCreatedAt: { $first: "$prescriptionData.createdAt" }, // Capture eprescriptions createdAt
       
          tests: {
            $push: {
              _id: "$_id",
              testName: "$testName",
              price: { $ifNull: ["$testData.testPrice", null] },
              status: "$status",
              createdAt: "$createdAt",
              labTestID: "$labTestID",
            },
          },
        },
      },

      // Sort BEFORE projecting away latestCreatedAt
        { $sort: { prescriptionCreatedAt: -1 } },

      // Final shape (keep latestCreatedAt if you want it on the client)
      {
        $project: {
        prescriptionId: "$_id", // or appointmentId: "$_id" if grouping by appointmentId
          appointmentId: 1,
          patientId: 1,
          patientName: 1,
          doctorId: 1,
           addressId: 1,
           prescriptionCreatedAt: 1, 
          tests: 1,
          _id: 0,
          // latestCreatedAt: 1, // <- uncomment if you want to return it
        },
      },

       // Drop patients that have no medicines after filtering
      { $match: { medicines: { $ne: [] } } },

      // Filter out pending prescriptions older than 48 hours
      {
        $match: {
          $or: [
            // Include groups with any non-pending medicines
            { tests: { $elemMatch: { status: { $ne: "pending" } } } },
            // Include pending-only groups created within 48 hours
            {
              $and: [
                { tests: { $not: { $elemMatch: { status: { $ne: "pending" } } } } },
                { prescriptionCreatedAt: { $gte: fortyEightHoursAgo } },
              ],
            },
          ],
        },
      },

      {
        $facet: {
          paginatedResults: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    // Aggregate tests by patientId for the given doctorId
    const [agg = { paginatedResults: [], totalCount: [] }] = await patientTestModel.aggregate(pipeline);
    const patients = agg.paginatedResults || [];
    const totalPatients = agg.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalPatients / limitNum);

    // Step 2: Fetch addressId from Appointment Service and enrich with lab data
    for (const patient of patients) {
      try {
         const addressId = patient.addressId;

        if (addressId) {
          const address = await UserAddress.findOne({ addressId }).lean();
          if (address && address.labName) {
            let labHeaderUrl = null;

            if (address.labHeader) {
              try {
                labHeaderUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: address.labHeader,
                  }),
                  { expiresIn: 300 }
                );
              } catch (s3Err) {
                console.error("Error fetching S3 signed URL:", s3Err.message);
              }
            }

            patient.labData = {
              labName: address.labName,
              labRegistrationNo: address.labRegistrationNo,
              labGst: address.labGst,
              labPan: address.labPan,
              labAddress: address.labAddress,
              labId: address.labId,
              labHeaderUrl,
            };
          } else {
            patient.labData = null;
          }
        } else {
          patient.labData = null;
        }
      } catch (err) {
        console.error(
          Error `fetching appointment or address for ${patient.patientId}:`,
          err.message
        );
        patient.addressId = null;
        patient.labData = null;
      }
    }

    console.log("Patients with lab data:", patients);

    return res.status(200).json({
      status: "success",
      data: {
        patients,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPatients,
          totalPages,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
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
      testName: Joi.string().trim().min(2).max(100).required(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }

    const { testId, patientId, price, doctorId, testName } = req.body;
    const trimmedTestName = testName.trim();

    // Step 1: Verify patient exists
    const patient = await Users.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({
        status: "error",
        message: "Patient not found",
      });
    }

    // Step 2: Find the patient test
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

    // Step 3: Check if testName exists in TestInventory
    let test = await TestInventory.findOne({ testName: trimmedTestName , doctorId});

    // Step 4: If not found, create new test in inventory
    if (!test) {
      test = await TestInventory.create({
        testName: trimmedTestName,
        testPrice: price,
        doctorId,
      });
    }

    console.log(test, " ")

    // Step 5: Update the patient test record with price and inventory reference
    const updatedPatientTest = await patientTestModel.findOneAndUpdate(
      { _id: testId, patientId },
      {
        $set: {
          price,
          testInventoryId: patientTest.testInventoryId || test._id, // only set if not already set
        },
      },
      { new: true }
    );

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
            labTestID: Joi.string().allow(null),
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

    const {
      patientId,
      doctorId,
      amount,
      tests,
      paymentStatus = "paid",
      discount,
      discountType,
    } = req.body;

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
      const { testId, price, labTestID } = test;

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

      // Process payment if paymentStatus is 'paid'
      if (paymentStatus === "paid" && updateData.status === "completed") {
        paymentResponse = await createPayment(req.headers.authorization, {
          userId: patientId,
          doctorId,
          labTestID,
          actualAmount: price || amount,
          discount: discount || 0,
          discountType: discountType || "percentage",
          paymentStatus: "paid",
          paymentFrom: "lab",
        });

        if (!paymentResponse || paymentResponse.status !== "success") {
          return res.status(500).json({
            status: "fail",
            message: "Payment failed.",
          });
        }
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

const getpatientTestDetails = async (req, res) => {
  try {
    const { labTestID } = req.query;

    const patientTestDetils = await patientTestModel.findOne({ labTestID });
    return res.status(200).json({
      status: "success",
      message: "Patient Test Details",
      data: patientTestDetils,
    });
  } catch (err) {
    console.error("Error in patientTestDetails:", err);
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
  getpatientTestDetails,
  addTestBulk,
  getAllTestsByDoctorId
};
