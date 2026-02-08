const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getReports
} = require('../controllers/therapistController');

// All therapist routes require authentication
router.use(protect);

// Therapist analytics/reports
router.get('/reports', getReports);

module.exports = router;