const mongoose = require('mongoose');

const languageTrialSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['receptive', 'expressive']
  },
  exercise_index: {
    type: Number,
    required: true
  },
  exercise_id: {
    type: String,
    required: true
  },
  is_correct: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  user_answer: {
    type: String
  },
  transcription: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for querying trials by user and mode
languageTrialSchema.index({ user_id: 1, mode: 1, timestamp: -1 });

module.exports = mongoose.model('LanguageTrial', languageTrialSchema, 'language_trials');
