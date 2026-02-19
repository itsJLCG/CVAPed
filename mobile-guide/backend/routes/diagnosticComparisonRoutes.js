const express = require('express');
const router = express.Router();
const { protect, therapistOnly } = require('../middleware/auth');
const {
  createFacilityDiagnostic,
  getFacilityDiagnostics,
  updateFacilityDiagnostic,
  deleteFacilityDiagnostic,
  getDiagnosticComparison,
  getComparisonHistory,
  getPatientOwnComparison
} = require('../controllers/diagnosticComparisonController');

/**
 * Diagnostic Comparison Routes
 * Mirrors web backend endpoints for Compare / Validate feature.
 *
 * Therapist routes (require therapist role):
 *   POST   /api/therapist/diagnostics
 *   GET    /api/therapist/diagnostics/:userId
 *   PUT    /api/therapist/diagnostics/:diagnosticId
 *   DELETE /api/therapist/diagnostics/:diagnosticId
 *   GET    /api/therapist/diagnostics/:userId/comparison
 *   GET    /api/therapist/diagnostics/:userId/comparison-history
 *
 * Patient route (any authenticated user):
 *   GET    /api/diagnostic-comparison
 */

// ── Therapist CRUD ──
router.post('/therapist/diagnostics', protect, therapistOnly, createFacilityDiagnostic);
router.get('/therapist/diagnostics/:userId', protect, therapistOnly, getFacilityDiagnostics);
router.put('/therapist/diagnostics/:diagnosticId', protect, therapistOnly, updateFacilityDiagnostic);
router.delete('/therapist/diagnostics/:diagnosticId', protect, therapistOnly, deleteFacilityDiagnostic);

// ── Therapist comparison ──
router.get('/therapist/diagnostics/:userId/comparison', protect, therapistOnly, getDiagnosticComparison);
router.get('/therapist/diagnostics/:userId/comparison-history', protect, therapistOnly, getComparisonHistory);

// ── Patient own comparison (read-only) ──
router.get('/diagnostic-comparison', protect, getPatientOwnComparison);

module.exports = router;
