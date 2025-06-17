const express = require('express');
const cookieParser = require('cookie-parser');
const usersRoutes = require('./routes/usersRoutes');
const adminRouter=require('./routes/adminApprovalRouter')
const bodyParser = require("body-parser");
require('dotenv').config();
const connectDB = require('./utils/db');
const logger = require('./utils/logger'); 

// Middleware
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
// Connect to MongoDB
connectDB();
// Routes
app.use('/users', usersRoutes);
app.use('/admin', adminRouter);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Users Service running on port ${PORT}`));