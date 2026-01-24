const mongoose = require('mongoose');

const trialSchema = new mongoose.Schema({
  trial_number: {
    type: Number,
    required: true
  },
  computed_score: {
    type: Number,
    required: true
  },
  pronunciation_score: Number,
  accuracy_score: Number,
  completeness_score: Number,
  fluency_score: Number,
  transcription: String,
  recorded_at: {
    type: Date,
    default: Date.now
  }
});

const itemProgressSchema = new mongoose.Schema({
  item_index: {
    type: Number,
    required: true
  },
  target: String,
  average_score: Number,
  passed: Boolean,
  trials: [trialSchema],
  completed_at: Date
});

const levelProgressSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true
  },
  is_complete: {
    type: Boolean,
    default: false
  },
  items: [itemProgressSchema],
  started_at: Date,
  completed_at: Date
});

const articulationProgressSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  sound_id: {
    type: String,
    required: true,
    enum: ['s', 'r', 'l', 'k', 'th']
  },
  levels: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { strict: false });

// Compound index for efficient queries (matching web version)
articulationProgressSchema.index({ user_id: 1, sound_id: 1 }, { unique: true });

// Update timestamp on save
articulationProgressSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Export with exact collection name matching web version
module.exports = mongoose.model('articulation_progress', articulationProgressSchema, 'articulation_progress');
