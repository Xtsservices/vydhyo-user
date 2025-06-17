

const approvalSchema=require('../schemas/adminApprovalSchema')
const Users = require('../models/usersModel');
exports.approveDoctorByAdmin = async (req, res) => {
    try {
        const { error } = approvalSchema.validate(req.body);
        if (error) {
          return res.status(400).json({
            status: 'fail',
            message: error.details[0].message,
          });
        }
        req.body.updatedBy = req.headers.userid;
        req.body.updatedAt = new Date();
        const doctorApproval = await Users.findOneAndUpdate({ "userId": req.body.userId }, req.body, { new: true });
        if (!doctorApproval) {
          return res.status(404).json({
            status: 'fail',
            message: 'Doctor not found',
          });
        }
        return res.status(200).json({
          status: 'success',
          data: doctorApproval
        });
      } catch (error) {
        return res.status(500).json({
          status: 'fail',
          message: error.message,
        });
      }
};