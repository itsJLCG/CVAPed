const mongoose = require('mongoose');

const GaitProgressSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  session_id: {
    type: String,
    required: true
  },
  metrics: {
    step_count: {
      type: Number,
      default: 0
    },
    cadence: {
      type: Number,
      default: 0,
      comment: 'Steps per minute'
    },
    stride_length: {
      type: Number,
      default: 0,
      comment: 'Meters'
    },
    velocity: {
      type: Number,
      default: 0,
      comment: 'Walking speed in m/s'
    },
    gait_symmetry: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      comment: 'Symmetry score (0-1)'
    },
    stability_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      comment: 'Balance/stability metric (0-1)'
    },
    step_regularity: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      comment: 'Step consistency score (0-1)'
    },
    vertical_oscillation: {
      type: Number,
      default: 0,
      comment: 'Vertical bounce in meters'
    },
    heading_variation: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      comment: 'Walking path straightness (0 = straight, 1 = curved)'
    },
    elevation_change: {
      type: Number,
      default: 0,
      comment: 'Total elevation change in meters'
    },
    pedometer_steps: {
      type: Number,
      default: 0,
      comment: 'Steps counted by device pedometer'
    }
  },
  sensors_used: {
    accelerometer: { type: Boolean, default: false },
    gyroscope: { type: Boolean, default: false },
    magnetometer: { type: Boolean, default: false },
    barometer: { type: Boolean, default: false },
    deviceMotion: { type: Boolean, default: false },
    pedometer: { type: Boolean, default: false }
  },
  gait_phases: [{
    step_number: Number,
    start_index: Number,
    end_index: Number,
    duration: Number,
    phase: {
      type: String,
      enum: ['stance', 'swing']
    }
  }],
  analysis_duration: {
    type: Number,
    default: 0,
    comment: 'Duration of analysis in seconds'
  },
  data_quality: {
    type: String,
    enum: ['poor', 'fair', 'good', 'excellent'],
    default: 'fair'
  },
  detected_problems: [{
    problem: String,
    severity: {
      type: String,
      enum: ['severe', 'moderate', 'mild']
    },
    category: String,
    description: String,
    recommendations: [String]
  }],
  problem_summary: {
    overall_status: String,
    risk_level: String,
    total_problems: Number,
    severe_count: Number,
    moderate_count: Number
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

// Update the updated_at timestamp before saving
GaitProgressSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Compound index for efficient user queries
GaitProgressSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('GaitProgress', GaitProgressSchema);
