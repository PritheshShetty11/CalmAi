const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.EMAIL_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create email transporter with more flexible configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Show debug output
  logger: true // Show logs in console
});

// Email sending endpoint
app.post('/send-emergency-email', async (req, res) => {
  try {
    const { staffMember, emergencyDetails } = req.body;
    
    if (!staffMember || !emergencyDetails) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: staffMember and emergencyDetails' 
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: staffMember.email,
      subject: `URGENT: ${emergencyDetails.crisis_type.toUpperCase()} Emergency - ${emergencyDetails.location}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">EMERGENCY NOTIFICATION</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">IMMEDIATE ACTION REQUIRED</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
            <h2 style="color: #dc3545; margin-top: 0;">Dear ${staffMember.name},</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">You have been assigned to respond to the following emergency:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">EMERGENCY DETAILS:</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><strong>Type:</strong> <span style="color: #dc3545; font-weight: bold; text-transform: uppercase;">${emergencyDetails.crisis_type}</span></li>
                <li style="margin: 10px 0;"><strong>Severity:</strong> <span style="color: ${emergencyDetails.severity === 'critical' ? '#dc3545' : emergencyDetails.severity === 'high' ? '#fd7e14' : '#28a745'}; font-weight: bold; text-transform: uppercase;">${emergencyDetails.severity}</span></li>
                <li style="margin: 10px 0;"><strong>Location:</strong> ${emergencyDetails.location}</li>
                <li style="margin: 10px 0;"><strong>Time:</strong> ${emergencyDetails.timestamp}</li>
                <li style="margin: 10px 0;"><strong>Guest Message:</strong> "${emergencyDetails.transcription}"</li>
              </ul>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">YOUR ROLE: ${staffMember.role}</h4>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">ACTION REQUIRED:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Proceed immediately to ${emergencyDetails.location}</li>
                <li>Assess the situation and provide assistance</li>
                <li>Report back to the emergency response team</li>
              </ol>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 0;">
              This is an automated alert from the CalmAI Emergency Response System.<br>
              For system support, contact IT immediately.
            </p>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="margin: 0; color: #495057; font-weight: bold;">CalmAI Emergency Response System</p>
              <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 14px;">AIT Grand Hotel</p>
              <p style="margin: 5px 0 0 0; color: ${emergencyDetails.severity === 'critical' ? '#dc3545' : emergencyDetails.severity === 'high' ? '#fd7e14' : '#28a745'}; font-weight: bold; text-transform: uppercase;">
                Priority Level: ${emergencyDetails.severity}
              </p>
            </div>
          </div>
        </div>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('To:', staffMember.email);
    console.log('Subject:', mailOptions.subject);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      recipient: staffMember.email,
      subject: mailOptions.subject
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'CalmAI Email Service',
    version: '1.0.0',
    emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`CalmAI Email Service running on port ${PORT}`);
  console.log(`Email configured: ${process.env.EMAIL_USER}`);
});

// Test email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});
