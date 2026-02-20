const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { generateOTP, generateOTPExpiry, verifyOTP } = require('../utils/otpService');
const { sendOTPEmail } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');
const { createOrUpdateFirebaseUser } = require('../config/firebaseAdmin');

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '292803901437-fk6kg98k8gj8e61k39osqlvf03cq3aer.apps.googleusercontent.com');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register user (sends OTP)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  console.log('\n=== REGISTER REQUEST STARTED ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      firstName,
      lastName,
      email,
      password,
      phone,
      age,
      gender,
      therapyType,
      patientType,
      // Speech therapy - child fields
      childFirstName,
      childLastName,
      childDateOfBirth,
      childGender,
      // Speech therapy - parent fields
      parentFirstName,
      parentLastName,
      parentEmail,
      parentPhone,
      relationshipWithChild,
      // Physical therapy - patient fields
      patientFirstName,
      patientLastName,
      patientGender,
      patientPhone
    } = req.body;
    
    console.log('📝 Extracted fields - FirstName:', firstName, 'LastName:', lastName, 'Email:', email);
    console.log('📝 Age:', age, 'Gender:', gender);
    console.log('📝 Therapy Type:', therapyType, 'Patient Type:', patientType);

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide first name, last name, email, and password'
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log('❌ User already exists');
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    console.log('✅ User does not exist, proceeding...');

    // Generate OTP
    console.log('🔢 Generating OTP...');
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();
    console.log('✅ OTP generated:', otp, 'Expires:', otpExpiry);

    // Create user (unverified)
    console.log('💾 Creating user in database...');
    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      age,
      gender,
      otp,
      otpExpiry,
      isVerified: false,
      role: 'patient', // Always set role to patient for new registrations
      therapyType,
      patientType
    };

    // Add conditional fields based on therapy type and patient type
    if (therapyType === 'speech' && patientType === 'child') {
      userData.childInfo = {
        firstName: childFirstName,
        lastName: childLastName,
        dateOfBirth: childDateOfBirth,
        gender: childGender
      };
      userData.parentInfo = {
        firstName: parentFirstName,
        lastName: parentLastName,
        email: parentEmail,
        phone: parentPhone,
        relationship: relationshipWithChild
      };
      console.log('📝 Added child and parent info');
    }

    if (therapyType === 'speech' && patientType === 'myself') {
      userData.patientInfo = {
        firstName: firstName,
        lastName: lastName,
        gender: patientGender,
        phone: patientPhone
      };
      console.log('📝 Added patient info for myself (speech therapy)');
    }

    if (therapyType === 'speech' && patientType === 'dependent') {
      userData.patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        dateOfBirth: childDateOfBirth,
        gender: childGender,
        phone: patientPhone
      };
      userData.parentInfo = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: patientPhone,
        relationship: relationshipWithChild
      };
      console.log('📝 Added dependent patient info and guardian info');
    }

    if (therapyType === 'physical') {
      userData.patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        gender: patientGender,
        phone: patientPhone
      };
      console.log('📝 Added patient info (physical therapy)');
    }

    const user = await User.create(userData);
    console.log('✅ User created successfully:', user._id);

    if (user) {
      // Send OTP email
      console.log('📧 Sending OTP email...');
      try {
        const fullName = `${firstName} ${lastName}`;
        await sendOTPEmail(email, otp, fullName);
        console.log('✅ OTP email sent successfully');
      } catch (emailError) {
        console.error('⚠️  Error sending OTP email:', emailError.message);
        // Continue even if email fails
      }

      console.log('✅ Registration completed successfully');
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        data: {
          _id: user._id,
          email: user.email,
          requiresVerification: true
        }
      });
    } else {
      console.log('❌ User creation returned null');
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('❌ REGISTER ERROR:', error);
    console.error('Error Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
  console.log('=== REGISTER REQUEST ENDED ===\n');
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  console.log('\n=== VERIFY OTP REQUEST STARTED ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.log('❌ Missing email or OTP');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }
    console.log('📝 Verifying OTP for email:', email);

    // Find user with OTP fields
    console.log('🔍 Finding user with OTP...');
    const user = await User.findOne({ email }).select('+otp +otpExpiry');

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    console.log('✅ User found:', user._id);
    console.log('🔢 Stored OTP:', user.otp, 'Provided OTP:', otp);

    // Verify OTP
    console.log('🔐 Verifying OTP...');
    const verification = verifyOTP(user.otp, user.otpExpiry, otp);

    if (!verification.valid) {
      console.log('❌ OTP verification failed:', verification.message);
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }
    console.log('✅ OTP verified successfully');

    // Update user as verified and clear OTP
    console.log('💾 Updating user verification status...');
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    console.log('✅ User verified and OTP cleared');

    // Sync to Firebase Authentication
    await createOrUpdateFirebaseUser({
      uid: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
      isVerified: user.isVerified
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('❌ VERIFY OTP ERROR:', error);
    console.error('Error Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
  console.log('=== VERIFY OTP REQUEST ENDED ===\n');
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  console.log('\n=== LOGIN REQUEST STARTED ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('📝 Login attempt for email:', email);

    // Check if email and password provided
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password field)
    console.log('🔍 Finding user in database...');
    const user = await User.findOne({ email }).select('+password +otp +otpExpiry');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log('✅ User found:', user._id);

    // Check if password matches
    console.log('🔐 Verifying password...');
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log('✅ Password matched');

    // Check if user is verified
    console.log('🔍 Checking verification status...');
    if (!user.isVerified) {
      console.log('❌ User not verified - sending OTP redirect response');
      
      // Generate and send new OTP if not exists or expired
      const currentTime = new Date();
      const otpExpiry = user.otpExpiry ? new Date(user.otpExpiry) : null;
      
      if (!user.otp || !otpExpiry || currentTime > otpExpiry) {
        console.log('🔢 Generating new OTP for unverified user...');
        const newOtp = generateOTP();
        const newOtpExpiry = generateOTPExpiry();
        
        user.otp = newOtp;
        user.otpExpiry = newOtpExpiry;
        await user.save();
        
        // Send OTP email
        try {
          const fullName = `${user.firstName} ${user.lastName}`;
          await sendOTPEmail(email, newOtp, fullName);
          console.log('✅ New OTP sent to user email');
        } catch (emailError) {
          console.error('⚠️  Error sending OTP email:', emailError.message);
        }
      } else {
        console.log('📧 Existing OTP is still valid');
      }
      
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email. A verification code has been sent to your email.'
      });
    }
    console.log('✅ User is verified');

    console.log('🔑 Generating token...');
    const token = generateToken(user._id);
    console.log('✅ Login successful');

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        therapyType: user.therapyType,
        patientType: user.patientType,
        childInfo: user.childInfo,
        parentInfo: user.parentInfo,
        patientInfo: user.patientInfo,
        picture: user.picture,
        googleId: user.googleId,
        hasInitialDiagnostic: user.hasInitialDiagnostic,
        token: token
      }
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    console.error('Error Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
  console.log('=== LOGIN REQUEST ENDED ===\n');
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {};
    
    // Only update fields that are provided
    if (req.body.firstName) fieldsToUpdate.firstName = req.body.firstName;
    if (req.body.lastName) fieldsToUpdate.lastName = req.body.lastName;
    if (req.body.phone !== undefined) fieldsToUpdate.phone = req.body.phone;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update diagnostic status
// @route   PUT /api/auth/diagnostic-status
// @access  Private
exports.updateDiagnosticStatus = async (req, res) => {
  try {
    const { hasInitialDiagnostic } = req.body;

    if (hasInitialDiagnostic === undefined || hasInitialDiagnostic === null) {
      return res.status(400).json({
        success: false,
        message: 'hasInitialDiagnostic is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        hasInitialDiagnostic: Boolean(hasInitialDiagnostic),
        diagnosticStatusUpdatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Diagnostic status updated successfully',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        therapyType: user.therapyType,
        patientType: user.patientType,
        hasInitialDiagnostic: user.hasInitialDiagnostic,
        diagnosticStatusUpdatedAt: user.diagnosticStatusUpdatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update diagnostic status',
      error: error.message
    });
  }
};

// @desc    Google Sign In / Sign Up
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  console.log('\n=== GOOGLE AUTH REQUEST STARTED ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));

  try {
    const { idToken } = req.body;

    if (!idToken) {
      console.log('❌ No ID token provided');
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }

    // Verify the Google ID token
    console.log('🔐 Verifying Google ID token...');
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID || '292803901437-fk6kg98k8gj8e61k39osqlvf03cq3aer.apps.googleusercontent.com',
      });
    } catch (verifyError) {
      console.log('❌ Google token verification failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const payload = ticket.getPayload();
    console.log('✅ Google token verified. User info:', {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    });

    const { email, name, picture, sub: googleId } = payload;

    // Check if user already exists
    console.log('🔍 Checking if user exists with email:', email);
    let user = await User.findOne({ email });

    if (user) {
      console.log('✅ User found, logging in...');
      
      // Update Google ID and picture if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture;
        
        // If user was previously unverified (registered via email), verify them now
        if (!user.isVerified) {
          console.log('📧 User was unverified, verifying via Google Sign-In...');
          user.isVerified = true;
          user.otp = undefined;
          user.otpExpiry = undefined;
        }
        
        // Ensure firstName and lastName are set from name if they don't exist
        if (!user.firstName || !user.lastName) {
          const nameParts = name.split(' ');
          user.firstName = user.firstName || nameParts[0];
          user.lastName = user.lastName || nameParts.slice(1).join(' ') || nameParts[0];
        }
        await user.save({ validateBeforeSave: false }); // Skip validation for existing user
        console.log('✅ Updated user with Google info');
      }

      // Check if profile is complete (has therapy type and patient type)
      const isProfileComplete = user.therapyType && user.patientType;
      console.log(`📋 Profile complete: ${isProfileComplete}`);

      // Sync to Firebase Authentication
      await createOrUpdateFirebaseUser({
        uid: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        picture: user.picture,
        isVerified: user.isVerified,
        googleId: user.googleId
      });

      // Generate JWT token
      console.log('🔑 Generating JWT token...');
      const token = generateToken(user._id);

      console.log('✅ Google authentication successful');
      res.status(200).json({
        success: true,
        message: 'Login successful',
        needsProfileCompletion: false,
        data: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          picture: user.picture,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          therapyType: user.therapyType,
          patientType: user.patientType,
          childInfo: user.childInfo,
          parentInfo: user.parentInfo,
          patientInfo: user.patientInfo,
          googleId: user.googleId,
          hasInitialDiagnostic: user.hasInitialDiagnostic,
          token: token
        }
      });
    } else {
      console.log('📝 Creating new user with Google info...');
      
      // Split name into firstName and lastName
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      // Create new user with minimal info (profile completion needed)
      user = await User.create({
        firstName,
        lastName,
        email,
        googleId,
        picture,
        role: 'patient', // Default role for Google sign-ups
        isVerified: true, // Google accounts are pre-verified
        password: Math.random().toString(36).slice(-8) + 'Aa1!' // Random password (won't be used for Google login)
      });
      
      console.log('✅ New user created:', user._id);

      // Sync to Firebase Authentication
      await createOrUpdateFirebaseUser({
        uid: user._id.toString(),
        email: user.email,
        name: `${firstName} ${lastName}`,
        picture: user.picture,
        isVerified: user.isVerified,
        googleId: user.googleId
      });

      // Generate JWT token
      console.log('🔑 Generating JWT token...');
      const token = generateToken(user._id);

      console.log('✅ Google authentication successful - Profile completion needed');
      res.status(200).json({
        success: true,
        message: 'Account created successfully',
        needsProfileCompletion: true,
        data: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          picture: user.picture,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          googleId: user.googleId,
          token: token
        }
      });
    }
  } catch (error) {
    console.error('❌ GOOGLE AUTH ERROR:', error);
    console.error('Error Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Google authentication failed'
    });
  }
  console.log('=== GOOGLE AUTH REQUEST ENDED ===\n');
};

// @desc    Complete profile for Google sign-in users
// @route   POST /api/auth/complete-profile
// @access  Private (requires token)
exports.completeProfile = async (req, res) => {
  console.log('\n=== COMPLETE PROFILE REQUEST STARTED ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('User ID from token:', req.user?._id);
  
  try {
    const userId = req.user._id;
    const { 
      therapyType,
      patientType,
      // Speech therapy - child fields
      childFirstName,
      childLastName,
      childDateOfBirth,
      childGender,
      // Speech therapy - parent fields
      parentFirstName,
      parentLastName,
      parentEmail,
      parentPhone,
      relationshipWithChild,
      // Physical therapy - patient fields
      patientFirstName,
      patientLastName,
      patientGender,
      patientPhone
    } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('📝 Updating user profile...');

    // Update therapy and patient type
    user.therapyType = therapyType;
    user.patientType = patientType;

    // Add conditional fields based on therapy type and patient type
    if (therapyType === 'speech' && patientType === 'child') {
      user.childInfo = {
        firstName: childFirstName,
        lastName: childLastName,
        dateOfBirth: childDateOfBirth,
        gender: childGender
      };
      user.parentInfo = {
        firstName: parentFirstName,
        lastName: parentLastName,
        email: parentEmail,
        phone: parentPhone,
        relationship: relationshipWithChild
      };
      console.log('📝 Added child and parent info');
    }

    if (therapyType === 'speech' && patientType === 'myself') {
      user.patientInfo = {
        firstName: user.firstName,
        lastName: user.lastName,
        gender: patientGender,
        phone: patientPhone
      };
      console.log('📝 Added patient info for myself (speech therapy)');
    }

    if (therapyType === 'speech' && patientType === 'dependent') {
      user.patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        dateOfBirth: childDateOfBirth,
        gender: childGender,
        phone: patientPhone
      };
      user.parentInfo = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: patientPhone,
        relationship: relationshipWithChild
      };
      console.log('📝 Added dependent patient info and guardian info');
    }

    if (therapyType === 'physical') {
      user.patientInfo = {
        firstName: patientFirstName,
        lastName: patientLastName,
        gender: patientGender,
        phone: patientPhone
      };
      console.log('📝 Added patient info (physical therapy)');
    }

    await user.save();
    console.log('✅ Profile completed successfully');

    // Generate a fresh token to include in response
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        therapyType: user.therapyType,
        patientType: user.patientType,
        childInfo: user.childInfo,
        parentInfo: user.parentInfo,
        patientInfo: user.patientInfo,
        isVerified: user.isVerified,
        hasInitialDiagnostic: user.hasInitialDiagnostic,
        token: token
      }
    });
  } catch (error) {
    console.error('❌ COMPLETE PROFILE ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete profile'
    });
  }
  console.log('=== COMPLETE PROFILE REQUEST ENDED ===\n');
};
