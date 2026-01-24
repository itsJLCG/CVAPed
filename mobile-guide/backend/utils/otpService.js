const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate OTP expiry time (10 minutes from now)
const generateOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

// Verify if OTP is valid and not expired
const verifyOTP = (storedOTP, storedExpiry, providedOTP) => {
  if (!storedOTP || !storedExpiry) {
    return { valid: false, message: 'No OTP found' };
  }

  if (new Date() > new Date(storedExpiry)) {
    return { valid: false, message: 'OTP has expired' };
  }

  if (storedOTP !== providedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  generateOTPExpiry,
  verifyOTP
};
