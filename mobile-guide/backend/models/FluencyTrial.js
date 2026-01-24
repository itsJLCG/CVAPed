const mongoose = require('mongoose');

/**
 * FluencyTrial Model
 * Stores individual fluency assessment data
 * Matches web version's fluency_trials collection
 */
const fluencyTrialSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  exercise_index: {
    type: Number,
    required: true
  },
  exercise_id: {
    type: String,
    required: true
  },
  speaking_rate: {
    type: Number,
    default: 0
  },
  fluency_score: {
    type: Number,
    default: 0
  },
  pause_count: {
    type: Number,
    default: 0
  },
  disfluencies: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'fluency_trials',
  timestamps: false 
});

// Index for efficient queries
fluencyTrialSchema.index({ user_id: 1, level: 1, exercise_index: 1 });

module.exports = mongoose.model('fluency_trial', fluencyTrialSchema, 'fluency_trials');
