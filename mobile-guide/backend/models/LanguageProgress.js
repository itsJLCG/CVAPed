const mongoose = require('mongoose');

const languageProgressSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['receptive', 'expressive']
  },
  exercises: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  total_exercises: {
    type: Number,
    default: 0
  },
  completed_exercises: {
    type: Number,
    default: 0
  },
  correct_exercises: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  current_exercise: {
    type: Number,
    default: 0
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

// Compound index for user_id and mode
languageProgressSchema.index({ user_id: 1, mode: 1 }, { unique: true });

module.exports = mongoose.model('LanguageProgress', languageProgressSchema, 'language_progress');
