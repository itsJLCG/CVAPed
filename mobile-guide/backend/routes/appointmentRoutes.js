const express = require('express');
const router = express.Router();
const { protect, therapistOnly } = require('../middleware/auth');
const {
  getTherapistAppointments,
  getUnassignedAppointments,
  assignToAppointment,
  createTherapistAppointment,
  updateTherapistAppointment,
  deleteTherapistAppointment,
  searchPatients,
  getPatientAppointments,
  bookPatientAppointment,
  cancelPatientAppointment,
  getAvailableTherapists
} = require('../controllers/appointmentController');

// ==================== THERAPIST ROUTES ====================
// All therapist appointment routes require authentication + therapist role

// GET  /api/therapist/appointments           - Get therapist's appointments
// GET  /api/therapist/appointments/unassigned - Get unassigned appointments
// POST /api/therapist/appointments            - Create appointment (therapist side)
// PUT  /api/therapist/appointments/:id        - Update appointment
// PUT  /api/therapist/appointments/:id/assign - Assign therapist to appointment
// DELETE /api/therapist/appointments/:id      - Cancel appointment
// GET  /api/therapist/patients/search         - Search patients

router.get('/therapist/appointments/unassigned', protect, therapistOnly, getUnassignedAppointments);
router.get('/therapist/appointments', protect, therapistOnly, getTherapistAppointments);
router.post('/therapist/appointments', protect, therapistOnly, createTherapistAppointment);
router.put('/therapist/appointments/:id/assign', protect, therapistOnly, assignToAppointment);
router.put('/therapist/appointments/:id', protect, therapistOnly, updateTherapistAppointment);
router.delete('/therapist/appointments/:id', protect, therapistOnly, deleteTherapistAppointment);
router.get('/therapist/patients/search', protect, therapistOnly, searchPatients);

// ==================== PATIENT ROUTES ====================
// All patient appointment routes require authentication

// GET  /api/patient/appointments              - Get patient's appointments
// POST /api/patient/appointments/book         - Book appointment (patient side)
// PUT  /api/patient/appointments/:id/cancel   - Cancel appointment

router.get('/patient/appointments', protect, getPatientAppointments);
router.post('/patient/appointments/book', protect, bookPatientAppointment);
router.put('/patient/appointments/:id/cancel', protect, cancelPatientAppointment);

// ==================== SHARED ROUTES ====================
// GET /api/therapists/available - Get available therapists

router.get('/therapists/available', protect, getAvailableTherapists);

module.exports = router;
