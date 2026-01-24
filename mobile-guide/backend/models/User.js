const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please provide a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['patient', 'therapist', 'admin'],
    default: 'patient'
  },
  phone: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values and only enforces uniqueness when value exists
  },
  picture: {
    type: String
  },
  // Therapy information
  therapyType: {
    type: String,
    enum: ['speech', 'physical'],
  },
  patientType: {
    type: String,
    enum: ['myself', 'child', 'dependent'],
  },
  // For speech therapy - child information
  childInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: String,
    gender: {
      type: String,
      enum: ['male', 'female']
    }
  },
  // For speech therapy - parent/guardian information
  parentInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    relationship: String
  },
  // For physical therapy - patient information
  patientInfo: {
    firstName: String,
    lastName: String,
    gender: {
      type: String,
      enum: ['male', 'female']
    },
    phone: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
