
const nodemailer = require('nodemailer');
const approvalSchema=require('../schemas/adminApprovalSchema')
const Users = require('../models/usersModel');


// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tech.vydhyo.in@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Store password in environment variable
    }
});

// Function to send email
const sendStatusEmail2 = async (user, status, rejectionReason = '') => {
    try {
        let subject, html;
        
        if (status === 'approved') {
            subject = 'Doctor Profile Approval Notification';
            html = `
                <h2>Profile Approved</h2>
                <p>Dear ${user.firstname} ${user.lastname},</p>
                <p>Congratulations! Your doctor profile has been approved.</p>
                <p>You can now start offering consultations through our platform.</p>
                <p>Best regards,<br>Vydhyo Team</p>
            `;
        } else if (status === 'rejected') {
            subject = 'Doctor Profile Rejection Notification';
            html = `
                <h2>Profile Review Update</h2>
                <p>Dear ${user.firstname} ${user.lastname},</p>
                <p>We regret to inform you that your doctor profile has not been approved.</p>
                ${rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ''}
                <p>Please review your submission and contact support for further details.</p>
                <p>Best regards,<br>Vydhyo Team</p>
            `;
        }

        await transporter.sendMail({
            from: '"Vydhyo" <tech.vydhyo.in@gmail.com>',
              to: 'pavanreddyr42@gmail.com',
            // to: user.email,
            subject: subject,
            html: html
        });
        
        console.log(`Email sent to ${user.email} for ${status} status`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const sendStatusEmail3 = async (user, status, rejectionReason = '') => {
    try {
        let subject, html;
        
        if (status === 'approved') {
            subject = 'Your Vydhyo Doctor Profile Has Been Approved';
            html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 20px; text-align: center; background-color: #007bff; border-radius: 8px 8px 0 0;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Vydhyo Healthcare</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">Profile Approval Confirmation</h2>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">We are pleased to inform you that your doctor profile has been successfully approved on the Vydhyo platform.</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">You can now begin offering consultations and connecting with patients through our secure and user-friendly platform.</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">Thank you for joining Vydhyo. We look forward to supporting your practice.</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-bottom: 0;">Best regards,<br>The Vydhyo Team</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                                <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                                <p style="color: #666666; font-size: 14px; margin: 5px 0 0;">
                                    <a href="https://vydhyo.in" style="color: #007bff; text-decoration: none;">Visit our website</a> | 
                                    <a href="mailto:support@vydhyo.in" style="color: #007bff; text-decoration: none;">Contact Support</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        } else if (status === 'rejected') {
            subject = 'Update on Your Vydhyo Doctor Profile';
            html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 20px; text-align: center; background-color: #007bff; border-radius: 8px 8px 0 0;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Vydhyo Healthcare</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <h2 style="color: #333333; font-size: 20px; margin-top: 0;">Profile Review Update</h2>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">We regret to inform you that your doctor profile has not been approved at this time.</p>
                                ${rejectionReason ? `<p style="color: #333333; font-size: 16px; line-height: 1.5;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                                <p style="color: #333333; font-size: 16px; line-height: 1.5;">Please review your submission and make necessary updates. For further assistance, contact our support team at <a href="mailto:support@vydhyo.in" style="color: #007bff; text-decoration: none;">support@vydhyo.in</a>.</p>
                                <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-bottom: 0;">Best regards,<br>The Vydhyo Team</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                                <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                                <p style="color: #666666; font-size: 14px; margin: 5px 0 0;">
                                    <a href="https://vydhyo.in" style="color: #007bff; text-decoration: none;">Visit our website</a> | 
                                    <a href="mailto:support@vydhyo.in" style="color: #007bff; text-decoration: none;">Contact Support</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        }

        await transporter.sendMail({
            from: '"Vydhyo Healthcare" <tech.vydhyo.in@gmail.com>',
              to: 'pavanreddyr42@gmail.com',
            // to: user.email,
            subject: subject,
            html: html
        });
        
        console.log(`Email sent to ${user.email} for ${status} status`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const sendStatusEmail4 = async (user, status, rejectionReason = '') => {
    try {
        let subject, html;
        
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
                <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #e9ecef; color: #333333;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);">
                                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Vydhyo Healthcare</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 20px;">
                                <h2 style="font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px;">Profile Approval Confirmation</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Congratulations! Your doctor profile has been successfully approved on the Vydhyo platform.</p>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">You are now ready to connect with patients and offer consultations through our secure platform. Start your journey with us today!</p>
                                
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">Thank you for choosing Vydhyo. We are excited to support your practice.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:support@vydhyo.in" style="color: #007bff; text-decoration: none;">support@vydhyo.in</a></p>
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
                <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #e9ecef; color: #333333;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);">
                                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Vydhyo Healthcare</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 20px;">
                                <h2 style="font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px;">Profile Application Update</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Dear Dr. ${user.firstname} ${user.lastname},</p>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">We regret to inform you that your doctor profile has not been approved at this time.</p>
                                ${rejectionReason ? `<p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;"><strong>Reason for Rejection:</strong> ${rejectionReason}</p>` : ''}
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">Please review your submission and make the necessary updates. Our support team is here to assist you.</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto;">
                                    <tr>
                                        <td style="border-radius: 6px; background-color: #007bff; padding: 0;">
                                            <a href="mailto:support@vydhyo.in" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Contact Support</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">We appreciate your interest in joining Vydhyo and look forward to assisting you further.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:support@vydhyo.in" style="color: #007bff; text-decoration: none;">support@vydhyo.in</a></p>
                                <p style="font-size: 14px; color: #6c757d; margin: 0;">© ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        }

        await transporter.sendMail({
            from: '"Vydhyo Healthcare" <tech.vydhyo.in@gmail.com>',
            // to: user.email,
              to: 'pavanreddyr42@gmail.com',
            subject: subject,
            html: html
        });
        
        console.log(`Email sent to ${user.email} for ${status} status`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const sendStatusEmail = async (user, status, rejectionReason = '') => {
    try {
        let subject, html;
        
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
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 15px;">Congratulations! Your doctor profile has been successfully approved on the Vydhyo platform.</p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 25px;">You are now ready to connect with patients and offer consultations through our secure platform. Start your journey with us today!</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto;">
                                    
                                </table>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">Thank you for choosing Vydhyo. We are excited to support your practice.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:support@vydhyo.in" style="color: #28a745; text-decoration: none;">support@vydhyo.in</a></p>
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
                                            <a href="mailto:support@vydhyo.in" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Contact Support</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 25px 0 0;">We appreciate your interest in joining Vydhyo and look forward to assisting you further.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                                <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px;">For assistance, contact us at <a href="mailto:support@vydhyo.in" style="color: #28a745; text-decoration: none;">support@vydhyo.in</a></p>
                                <p style="font-size: 14px; color: #6c757d; margin: 0;">© ${new Date().getFullYear()} Vydhyo Healthcare. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        }

        await transporter.sendMail({
            from: '"Vydhyo Healthcare" <tech.vydhyo.in@gmail.com>',
            to: 'pavanreddyr42@gmail.com',
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