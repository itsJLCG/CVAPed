const mongoose = require('mongoose');

/**
 * ArticulationTrial Model
 * Stores individual trial data for each pronunciation attempt
 * Matches web version's articulation_trials collection
 */
const articulationTrialSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  sound_id: {
    type: String,
    required: true,
    enum: ['s', 'r', 'l', 'k', 'th']
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  item_index: {
    type: Number,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  trial: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  scores: {
    accuracy_score: Number,
    pronunciation_score: Number,
    completeness_score: Number,
    fluency_score: Number,
    computed_score: Number
  },
  transcription: String,
  feedback: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'articulation_trials',
  timestamps: false 
});

// Index for efficient queries
articulationTrialSchema.index({ user_id: 1, sound_id: 1, level: 1, item_index: 1, trial: 1 });

module.exports = mongoose.model('articulation_trial', articulationTrialSchema, 'articulation_trials');
