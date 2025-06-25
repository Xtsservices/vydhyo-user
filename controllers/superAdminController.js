const Users = require('../models/usersModel');
const userSchema = require('../schemas/userSchema');
const { CommonController } = require('./commonController');

/**
 * Get user counts by approval status
 * @route GET /api/super-admin/user-counts
 * @access Super Admin
 */
exports.getUserCounts = async (req, res) => {
    try {
        // Get counts for different user statuses
        const doctorsCounts = await CommonController.getDoctorsCounts();

        const MessagesCounts = await CommonController.getMessagesCounts();

        const Amount = await CommonController.getTotalAmount();

        const AppointmentTypeCounts = await CommonController.getAppointmentTypeCounts();

        return res.status(200).json({
            success: true,
            doctors: doctorsCounts,
            messages: MessagesCounts,
            totalAmount: Amount,
            appointmentTypes: AppointmentTypeCounts.result,
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