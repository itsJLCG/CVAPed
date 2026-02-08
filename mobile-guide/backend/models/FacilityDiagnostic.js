const mongoose = require('mongoose');

/**
 * FacilityDiagnostic Model
 * Stores facility-based diagnostic assessments entered by therapists.
 * Used for Compare / Validate feature (facility vs at-home comparison).
 * Matches web version's facility_diagnostics collection.
 */
const facilityDiagnosticSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  assessed_by: {
    type: String,
    required: true
  },
  assessment_date: {
    type: Date,
    required: true
  },
  assessment_type: {
    type: String,
    default: 'initial',
    enum: ['initial', 'follow-up', 'discharge']
  },
  articulation_scores: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fluency_score: {
    type: Number,
    default: null
  },
  receptive_score: {
    type: Number,
    default: null
  },
  expressive_score: {
    type: Number,
    default: null
  },
  gait_scores: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String,
    default: ''
  },
  severity_level: {
    type: String,
    default: ''
  },
  recommended_focus: {
    type: [String],
    default: []
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

// Compound index for efficient queries
facilityDiagnosticSchema.index({ user_id: 1, assessment_date: -1 });

// Update timestamp on save
facilityDiagnosticSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('FacilityDiagnostic', facilityDiagnosticSchema, 'facility_diagnostics');
