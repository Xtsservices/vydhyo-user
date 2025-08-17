const mongoose = require('mongoose');
require('dotenv').config(); 
const logger = require('../utils/logger'); // Assuming you have a logger utility

const connectDB = async () => {
  try {
    logger.info('db.js : connectDB : MongoDB connecting...');
    // Connect to MongoDB with connection pool
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Add poolSize option (default is 5)
      poolSize: 10, // Adjust the pool size as needed
    });
    logger.info('MongoDB connected...!');
  } catch (err) {
    logger.error('db.js : connectDB : MongoDB connection error:', err.message);
    logger.error(`db.js : connectDB : MongoDB connection error:', ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
