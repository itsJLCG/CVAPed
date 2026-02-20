const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required']
  },
  therapist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  therapy_type: {
    type: String,
    required: [true, 'Therapy type is required'],
    enum: ['articulation', 'language', 'fluency', 'physical']
  },
  appointment_date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  duration: {
    type: Number,
    default: 60 // Default 60 minutes
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  approved: {
    type: Boolean,
    default: false
  },
  approved_at: {
    type: Date,
    default: null
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  session_summary: {
    type: String,
    default: ''
  },
  cancellation_reason: {
    type: String,
    default: ''
  },
  patient_name: {
    type: String,
    default: ''
  },
  patient_email: {
    type: String,
    default: ''
  },
  therapist_name: {
    type: String,
    default: null
  },
  therapist_email: {
    type: String,
    default: null
  },
  reminder_sent: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field on save
appointmentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
appointmentSchema.index({ patient_id: 1, appointment_date: 1 });
appointmentSchema.index({ therapist_id: 1, appointment_date: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
