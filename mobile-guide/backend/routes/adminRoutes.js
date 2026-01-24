const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAdminStats,
  getAllUsers,
  updateUser,
  deleteUser
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(protect);

// Admin statistics
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

module.exports = router;
