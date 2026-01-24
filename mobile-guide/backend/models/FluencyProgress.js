const mongoose = require('mongoose');

/**
 * FluencyProgress Model
 * Tracks user's progress through fluency therapy exercises
 * Matches web version's fluency_progress collection
 */
const fluencyProgressSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
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

// Index for efficient queries
fluencyProgressSchema.index({ user_id: 1 }, { unique: true });

// Export with exact collection name matching web version
module.exports = mongoose.model('fluency_progress', fluencyProgressSchema, 'fluency_progress');
