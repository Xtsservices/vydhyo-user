const mongoose = require('mongoose');
require('dotenv').config(); 
const logger = require('../utils/logger'); // Assuming you have a logger utility

const connectDB = async () => {
  try {
    logger.info('db.js : connectDB : MongoDB connecting...');
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected...!');
  } catch (err) {
    // Log the error and exit the process
    logger.error('db.js : connectDB : MongoDB connection error:', err.message);
    // Optional: You can log the error using your logger utility
    // logger.error(`MongoDB connection error: ${err.message}`);
    // Exit the process with a failure code
    logger.error(`db.js : connectDB : MongoDB connection error:', ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;