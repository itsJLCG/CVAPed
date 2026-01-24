const User = require('../models/User');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getAdminStats = async (req, res) => {
  console.log('\n=== GET ADMIN STATS REQUEST STARTED ===');
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ User is not an admin');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    console.log('📊 Calculating admin statistics...');

    // Total users count
    const total_users = await User.countDocuments({});
    
    // Count by therapy type
    const speech_users = await User.countDocuments({ therapyType: 'speech' });
    const physical_users = await User.countDocuments({ therapyType: 'physical' });
    
    // Count by role
    const admin_users = await User.countDocuments({ role: 'admin' });
    const patient_users = await User.countDocuments({ role: 'patient' });
    const therapist_users = await User.countDocuments({ role: 'therapist' });
    
    // Count verified vs unverified
    const verified_users = await User.countDocuments({ isVerified: true });
    const unverified_users = await User.countDocuments({ isVerified: false });

    // Get recent users (last 10)
    const recent_users = await User.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email therapyType createdAt');

    console.log('✅ Admin statistics calculated successfully');

    res.status(200).json({
      success: true,
      stats: {
        total_users,
        admin_users,
        patient_users,
        therapist_users,
        verified_users,
        unverified_users,
        speech_users,
        physical_users,
        // Placeholder values for therapy-specific stats (to be implemented when therapy modules are added)
        total_sessions: 0,
        total_completions: 0,
        average_score: 0
      },
      therapy_distribution: {
        speech: speech_users,
        physical: physical_users
      },
      recent_users: recent_users.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        therapyType: user.therapyType,
        joinedAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ GET ADMIN STATS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin statistics',
      error: error.message
    });
  }
  console.log('=== GET ADMIN STATS REQUEST ENDED ===\n');
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  console.log('\n=== GET ALL USERS REQUEST STARTED ===');
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ User is not an admin');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    console.log('📋 Fetching all users...');

    // Get all users
    const users = await User.find({})
      .select('-password -otp -otpExpiry')
      .sort({ createdAt: -1 });

    const user_list = users.map(user => ({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone || user.parentInfo?.phone || user.patientInfo?.phone || 'N/A',
      therapyType: user.therapyType || 'N/A',
      patientType: user.patientType || 'N/A',
      isVerified: user.isVerified,
      googleId: user.googleId || null,
      picture: user.picture || null,
      childInfo: user.childInfo || null,
      parentInfo: user.parentInfo || null,
      patientInfo: user.patientInfo || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt || user.createdAt,
      // Placeholder for session counts (to be implemented)
      total_sessions: 0,
      active_therapies: 0
    }));

    console.log(`✅ Retrieved ${user_list.length} users`);

    res.status(200).json({
      success: true,
      users: user_list,
      total_count: user_list.length
    });
  } catch (error) {
    console.error('❌ GET ALL USERS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
  console.log('=== GET ALL USERS REQUEST ENDED ===\n');
};

// @desc    Update user
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  console.log('\n=== UPDATE USER REQUEST STARTED ===');
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ User is not an admin');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    const { userId } = req.params;
    const updates = req.body;

    console.log('📝 Updating user:', userId);
    console.log('Updates:', updates);

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User updated successfully');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        therapyType: user.therapyType,
        patientType: user.patientType,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('❌ UPDATE USER ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
  console.log('=== UPDATE USER REQUEST ENDED ===\n');
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  console.log('\n=== DELETE USER REQUEST STARTED ===');
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ User is not an admin');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }

    const { userId } = req.params;

    console.log('🗑️ Deleting user:', userId);

    // Prevent deleting admin users
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    console.log('✅ User deleted successfully');

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ DELETE USER ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
  console.log('=== DELETE USER REQUEST ENDED ===\n');
};
