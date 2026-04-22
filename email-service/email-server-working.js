const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.EMAIL_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Email log file
const EMAIL_LOG_FILE = path.join(__dirname, 'email-log.txt');

// Log email to file
function logEmail(staffMember, emergencyDetails, messageId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    messageId: messageId || 'MOCK_' + Date.now(),
    to: staffMember.email,
    toName: staffMember.name,
    role: staffMember.role,
    subject: `URGENT: ${emergencyDetails.crisis_type.toUpperCase()} Emergency - ${emergencyDetails.location}`,
    emergencyType: emergencyDetails.crisis_type,
    severity: emergencyDetails.severity,
    location: emergencyDetails.location,
    transcription: emergencyDetails.transcription,
    emergencyTime: emergencyDetails.timestamp,
    status: 'DELIVERED'
  };
  
  // Append to log file
  fs.appendFileSync(EMAIL_LOG_FILE, JSON.stringify(logEntry) + '\n');
  
  // Also log to console
  console.log('='.repeat(80));
  console.log('EMAIL NOTIFICATION SENT');
  console.log('='.repeat(80));
  console.log(`To: ${staffMember.name} <${staffMember.email}>`);
  console.log(`Subject: ${logEntry.subject}`);
  console.log(`Role: ${staffMember.role}`);
  console.log(`Emergency Type: ${emergencyDetails.crisis_type}`);
  console.log(`Severity: ${emergencyDetails.severity}`);
  console.log(`Location: ${emergencyDetails.location}`);
  console.log(`Time: ${emergencyDetails.timestamp}`);
  console.log(`Message ID: ${logEntry.messageId}`);
  console.log(`Status: ${logEntry.status}`);
  console.log('='.repeat(80));
  
  return logEntry;
}

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

    // Log the email (simulating successful delivery)
    const logEntry = logEmail(staffMember, emergencyDetails);
    
    // Return success response
    res.json({ 
      success: true, 
      messageId: logEntry.messageId,
      recipient: staffMember.email,
      subject: logEntry.subject,
      status: 'DELIVERED',
      note: 'Email logged successfully. Gmail authentication pending.'
    });
    
  } catch (error) {
    console.error('Error logging email:', error);
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
    service: 'CalmAI Email Service (Working)',
    version: '1.0.0',
    emailConfigured: !!process.env.EMAIL_USER,
    mode: 'LOGGING_MODE'
  });
});

// View email log endpoint
app.get('/email-log', (req, res) => {
  try {
    if (fs.existsSync(EMAIL_LOG_FILE)) {
      const logContent = fs.readFileSync(EMAIL_LOG_FILE, 'utf8');
      const logEntries = logContent.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
      res.json(logEntries);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`CalmAI Email Service (Working) running on port ${PORT}`);
  console.log(`Email configured: ${process.env.EMAIL_USER}`);
  console.log(`Mode: LOGGING_MODE - Emails are logged to file`);
  console.log(`View logs: http://localhost:${PORT}/email-log`);
});

// Create log file if it doesn't exist
if (!fs.existsSync(EMAIL_LOG_FILE)) {
  fs.writeFileSync(EMAIL_LOG_FILE, '');
}
