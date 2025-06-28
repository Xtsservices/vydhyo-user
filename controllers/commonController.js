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

    static async getTotalAmount(doctorId) {

        let url = 'http://localhost:4003/finance/getTotalAmount';
        if (doctorId) {
            url += `?doctorId=${encodeURIComponent(doctorId)}`;
        }

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching total amount:', error);
            throw error;
        }
    }

    static async getAppointmentTypeCounts(doctorId) {
        let url = 'http://localhost:4005/appointment/getAppointmentTypeCounts';
        if (doctorId) {
            url += `?doctorId=${encodeURIComponent(doctorId)}`;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching appointment type counts:', error);
            throw error;
        }
    }
     static async getAppointmentCounts(doctorId) {
        let url = 'http://localhost:4005/appointment/getTodayAndUpcomingAppointmentsCount';
        if (doctorId) {
            url += `?doctorId=${encodeURIComponent(doctorId)}`;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching appointment type counts:', error);
            throw error;
        }
    }
    static async getUniquePatientsStats(doctorId) {
        let url = 'http://localhost:4005/appointment/getUniquePatientsStats';
        if (doctorId) {
            url += `?doctorId=${encodeURIComponent(doctorId)}`;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching unique patients stats:', error);
            throw error;
        }
    }

     static async getTopDoctorsByAppointmentCount() {
        let url = 'http://localhost:4005/appointment/getTopDoctorsByAppointmentCount';
       
        try {
            const response = await axios.get(url);
            console.log('Top doctors response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching unique patients stats:', error);
            throw error;
        }
    }

    

    
}


      
module.exports = { CommonController };