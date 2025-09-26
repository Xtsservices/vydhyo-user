const express = require('express');
const cookieParser = require('cookie-parser');
const usersRoutes = require('./routes/usersRoutes');
const adminRouter = require('./routes/adminRouter')
const doctorsRouter = require('./routes/doctorsRouter')
const receptionistRouter = require('./routes/receptionistRouter')
const superAdminRouter = require('./routes/superAdminRouter');
const DoctorDashboardRouter = require('./routes/DoctorDashboardRouter');
const addressRouter = require('./routes/addressRouter');
const PharmacyRouter = require('./routes/pharmacyRouter');
const labRouter = require('./routes/labRouter')
const whatsappRouter = require('./routes/whatsappRouter')
const templateRouter = require('./routes/templateRoute');


const bodyParser = require("body-parser");
require('dotenv').config();
const connectDB = require('./utils/db');
const logger = require('./utils/logger');
const { P } = require('pino');

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
app.use('/doctor', doctorsRouter);
app.use('/receptionist', receptionistRouter);
app.use('/superAdmin', superAdminRouter);
app.use('/doctorDashboard', DoctorDashboardRouter);
app.use('/address', addressRouter);
app.use('/pharmacy', PharmacyRouter);
app.use('/template', templateRouter);
app.use('/lab', labRouter);
app.use('/whatsapp', whatsappRouter);













// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Users Service running on port ${PORT}`));