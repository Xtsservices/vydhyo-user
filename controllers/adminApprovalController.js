
const nodemailer = require('nodemailer');
const approvalSchema=require('../schemas/adminApprovalSchema')
const Users = require('../models/usersModel');


// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Vydhyoteams@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Store password in environment variable
    }
});

// Function to send email

const sendStatusEmail = async (user, status, rejectionReason = '') => {
    try {
        let subject, html;
        console.log("subject=====", user)
        if (status === 'approved') {
            subject = 'Welcome to Vydhyo: Your Doctor Profile is Approved';
            html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Vydhyo Profile Approval</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f1f3f5; color: #333333;">
                     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 40px 30px 20px;">
                                <img src="https://ik.imagekit.io/bhnmoa9nt/TM.png?updatedAt=1751545962441" alt="Vydhyo Logo" style="display: block; margin: 0 auto 20px; max-width: 100px;  border-radius: 50%;">
                                <h4 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px; text-align: center;">Profile Approval Confirmation</h4>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Congratulations! You have been successfully registered on the Vydhyo platform.</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">You’re now ready to connect with patients and start giving appointments through our secure and easy-to-use platform. We’re excited to have you onboard as part of our growing network of trusted healthcare providers.</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">If you need any assistance or wish to update your profile, our support team is just a click away. <a href="mailto:Vydhyoteams@gmail.com" style="color: #28a745; text-decoration: none;">Vydhyoteams@gmail.com</a>.</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">Warm regards,<br>Team Vydhyo<br>Connect. Care. Cure.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:Vydhyoteams@gmail.com" style="color: #28a745; text-decoration: none;">Vydhyoteams@gmail.com</a></p>
                                <p style="font-size: 14px; color: #6c757d; margin: 0;">© ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        } else if (status === 'rejected') {
            subject = 'Update on Your Vydhyo Doctor Profile Application';
            html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Vydhyo Profile Update</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f1f3f5; color: #333333;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 40px 30px 20px;">
                                <img src="https://ik.imagekit.io/bhnmoa9nt/TM.png?updatedAt=1751545962441" alt="Vydhyo Logo" style="display: block; margin: 0 auto 20px; max-width: 100px;  border-radius: 50%;">
                                <h4 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px; text-align: center;">Profile Application Update</h4>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">We regret to inform you that your doctor profile has not been approved at this time.</p>
                                ${rejectionReason ? `<p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;"><strong>Reason for Rejection:</strong> ${rejectionReason}</p>` : ''}
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">Please review your submission and make the necessary updates. Our support team is here to assist you.</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto;">
                                    <tr>
                                        <td style="border-radius: 6px; background-color: #dc3545; padding: 0;">
                                            <a href="mailto:Vydhyoteams@gmail.com" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Contact Support</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">Warm regards,<br>Team Vydhyo<br>Connect. Care. Cure.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:Vydhyoteams@gmail.com" style="color: #28a745; text-decoration: none;">support@vydhyo.in</a></p>
                                <p style="font-size: 14px; color: #6c757d; margin: 0;">© ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        }

      await transporter.sendMail({
            from: '"Vydhyo Healthcare" <Vydhyoteams@gmail.com>',
            // to: 'pavanreddyr42@gmail.com',
            // to: 'glalithakrishna04@gmail.com',
             to: user.email,
            subject: subject,
            html: html
        });
        console.log(`Email sent to pavanreddyr42@gmail.com for ${status} status`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

exports.approveDoctorByAdmin = async (req, res) => {
    try {

        const { error } = approvalSchema.validate(req.body);
        console.log('Approval request body:', req.body);
        if (error) {
          return res.status(400).json({
            status: 'fail',
            message: error.details[0].message,
          });
        }
        if(req.body.status=='approved'){
            req.body.isVerified =true;
        }
        req.body.updatedBy = req.headers.userid;
        req.body.updatedAt = new Date();
        console.log("req.body",req.body)
        // return
        const doctorApproval = await Users.findOneAndUpdate({ "userId": req.body.userId }, req.body, { new: true });
        console.log('Doctor approval response:', doctorApproval);
        if (!doctorApproval) {
          return res.status(404).json({
            status: 'fail',
            message: 'Doctor not found',
          });
        }

         // Send email notification
        await sendStatusEmail(doctorApproval, req.body.status, req.body.rejectionReason);

        //sms notification can be added here
    //     if (req.body.status === "approved" && doctorApproval.mobile) {
    //   const doctorName = `${doctorApproval.firstname || ""} ${doctorApproval.lastname || ""}`.trim();

    //   const smsMessage = `Welcome Dr. ${doctorName} to VYDHYO! Your profile is live and ready to receive appointments. Let's transform healthcare together.`;

    //   await sendOTPSMS(
    //     doctorApproval.mobile,
    //     smsMessage,
    //     "1707175447755557722" 
    //   );
    // }

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