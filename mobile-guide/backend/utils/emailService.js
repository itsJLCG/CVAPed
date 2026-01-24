const nodemailer = require('nodemailer');

// Create transporter function (lazy loading)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: process.env.MAILTRAP_PORT || 2525,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  // Create transporter when needed
  const transporter = createTransporter();
  const mailOptions = {
    from: '"CVAPed" <noreply@cvaped.com>',
    to: email,
    subject: 'Verify Your CVAPed Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #C9302C 0%, #E74C3C 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .logo-container {
            margin-bottom: 20px;
          }
          .logo {
            width: 120px;
            height: 120px;
            margin: 0 auto;
            background-color: white;
            border-radius: 50%;
            padding: 15px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          }
          .header h1 {
            font-size: 36px;
            font-weight: bold;
            margin: 15px 0 5px 0;
            letter-spacing: 2px;
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #2C3E50;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 15px;
            line-height: 1.8;
          }
          .otp-container {
            background: linear-gradient(135deg, #FFF5F5 0%, #FFEBEE 100%);
            border: 3px solid #C9302C;
            border-radius: 15px;
            padding: 30px;
            margin: 35px 0;
            text-align: center;
          }
          .otp-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            font-weight: 600;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #C9302C;
            font-family: 'Courier New', monospace;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
          }
          .expiry-notice {
            background-color: #FFF9E6;
            border-left: 4px solid #FFC107;
            padding: 15px 20px;
            margin: 25px 0;
            border-radius: 5px;
          }
          .expiry-notice strong {
            color: #F57C00;
          }
          .security-notice {
            background-color: #F5F5F5;
            padding: 20px;
            border-radius: 10px;
            margin-top: 25px;
            font-size: 14px;
            color: #666;
          }
          .footer {
            background-color: #2C3E50;
            color: white;
            text-align: center;
            padding: 30px;
            font-size: 14px;
          }
          .footer-logo {
            margin-bottom: 15px;
            opacity: 0.9;
          }
          .footer-tagline {
            font-size: 16px;
            font-weight: 300;
            margin: 10px 0;
            font-style: italic;
          }
          .footer-links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
          .footer-copyright {
            opacity: 0.7;
            font-size: 12px;
            margin-top: 10px;
          }
          @media only screen and (max-width: 600px) {
            .container {
              border-radius: 0;
            }
            .header, .content, .footer {
              padding: 30px 20px;
            }
            .otp-code {
              font-size: 36px;
              letter-spacing: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <div class="logo">
                <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <!-- Medical Cross -->
                  <circle cx="50" cy="50" r="45" fill="#C9302C"/>
                  <rect x="35" y="20" width="30" height="60" fill="white" rx="5"/>
                  <rect x="20" y="35" width="60" height="30" fill="white" rx="5"/>
                  <!-- Heart pulse line -->
                  <path d="M 20 50 L 30 50 L 35 40 L 40 60 L 45 45 L 50 50 L 55 50 L 60 40 L 65 60 L 70 50 L 80 50" 
                        stroke="white" stroke-width="3" fill="none" opacity="0.7"/>
                </svg>
              </div>
            </div>
            <h1>CVAPed</h1>
            <p>Account Verification</p>
          </div>
          
          <div class="content">
            <p class="greeting">Hello ${name || 'there'}! 👋</p>
            
            <p class="message">
              Thank you for registering with <strong>CVAPed</strong>. We're excited to have you join our community dedicated to recovery and rehabilitation.
            </p>
            
            <p class="message">
              To complete your registration and verify your account, please use the verification code below:
            </p>
            
            <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="expiry-notice">
              ⏰ <strong>Important:</strong> This verification code will expire in <strong>10 minutes</strong>. Please enter it soon to complete your registration.
            </div>
            
            <div class="security-notice">
              🔒 <strong>Security Notice:</strong> If you didn't request this verification code, please disregard this email. Your account security is important to us.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-logo">
              <strong style="font-size: 24px; letter-spacing: 2px;">CVAPed</strong>
            </div>
            <p class="footer-tagline">Empowering Journeys to Recovery</p>
            <div class="footer-links">
              <p>Need help? Contact us at support@cvaped.com</p>
            </div>
            <p class="footer-copyright">
              &copy; 2025 CVAPed. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail };
