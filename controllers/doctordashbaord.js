const Users = require('../models/usersModel');
const userSchema = require('../schemas/userSchema');
const { CommonController } = require('./commonController');

/**
 * Get user counts by approval status
 * @route GET /api/super-admin/user-counts
 * @access Super Admin
 */
exports.getUserCounts = async (req, res) => {
    let userId = req.headers.userid;

    try {
        // Get counts for different user statuses


        const Amount = await CommonController.getTotalAmount(req.headers.userid);

        const AppointmentTypeCounts = await CommonController.getAppointmentTypeCounts(req.headers.userid);

        const AppointmentCounts = await CommonController.getAppointmentCounts(req.headers.userid);
        const UniquePatientsCounts = await CommonController.getUniquePatientsStats(req.headers.userid);

        const topDoctors = await CommonController.getTopDoctorsByAppointmentCount();

        return res.status(200).json({
            success: true,
            totalAmount: Amount,
            appointmentTypes: AppointmentTypeCounts.result,
            appointmentCounts: AppointmentCounts.data,
            uniquePatients: UniquePatientsCounts.data,
            topDoctors: topDoctors.data
        });
    } catch (error) {
        console.error('Error fetching user counts:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching user counts',
            error: error.message
        });
    }
};