const Users = require('../models/usersModel');
const axios = require('axios');
// userSchema is not used in this file, so removed the import

class CommonController {
    static async getDoctorsCounts() {
        try {
            const pendingCount = await Users.countDocuments({ status: 'pending', role: 'doctor' });
            const approvedCount = await Users.countDocuments({ status: 'approved', role: 'doctor' });
            const rejectedCount = await Users.countDocuments({ status: 'rejected', role: 'doctor' });

            return {
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
            };
        } catch (error) {
            console.error('Error fetching user counts:', error);
            throw error; // Re-throw the error for the caller to handle
        }
    }

    static async getMessagesCounts() {
        try {
            const open = 0
            const inprogress = 0
            const completed = 0

            return {
                open: open,
                inprogress: inprogress,
                completed: completed
            };
        } catch (error) {
            console.error('Error fetching user counts:', error);
            throw error; // Re-throw the error for the caller to handle
        }
    }

    static async getTotalAmount() {
        try {
            const response = await axios.get('http://localhost:4003/finance/getTotalAmount');
            return response.data;
        } catch (error) {
            console.error('Error fetching total amount:', error);
            throw error;
        }
    }

    static async getAppointmentTypeCounts() {
        try {
            const response = await axios.get('http://localhost:4005/appointment/getAppointmentTypeCounts');
            return response.data;
        } catch (error) {
            console.error('Error fetching appointment type counts:', error);
            throw error;
        }
    }
}


      
module.exports = { CommonController };