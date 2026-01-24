const express = require('express');
const router = express.Router();
const { getUserHealthLogs, getUserHealthSummary } = require('../controllers/healthController');
const { protect } = require('../middleware/auth');

/**
 * Health Routes
 * All routes require authentication
 */

// @route   GET /api/health/logs
// @desc    Get all therapy progress logs for authenticated user
// @access  Private
router.get('/logs', protect, getUserHealthLogs);

// @route   GET /api/health/summary
// @desc    Get health summary statistics for authenticated user
// @access  Private
router.get('/summary', protect, getUserHealthSummary);

module.exports = router;
