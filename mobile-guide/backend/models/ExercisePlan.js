const mongoose = require('mongoose');

/**
 * Exercise Plan Schema
 * Tracks exercise recommendations and completion for each user.
 * Users work through plans at their own pace - not restricted to daily completion.
 * New plan created after completing gait analysis.
 */
const ExercisePlanSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Date this plan was created
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Reference to the gait analysis that triggered this plan
  gait_analysis_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GaitProgress',
    required: true
  },
  
  // Problems detected from gait analysis
  detected_problems: [{
    problem: String,          // 'slow_cadence', 'short_stride', etc.
    severity: String,         // 'severe', 'moderate', 'mild'
    current_value: Number,
    normal_range: String,
    percentile: Number,
    target_improvement: {
      target_value: Number,
      current_value: Number,
      improvement_needed: Number,
      unit: String
    }
  }],
  
  // Recommended exercises
  exercises: [{
    exercise_id: String,      // Unique exercise ID from library
    exercise_name: String,
    description: String,
    target_metric: String,    // Which gait metric this improves
    problem_targeted: String, // Which problem this addresses
    
    // Exercise details
    duration: String,         // '15 minutes'
    frequency: String,        // '5 times per week'
    sets: Number,
    reps: mongoose.Schema.Types.Mixed, // Can be number or string like '30 seconds'
    difficulty: String,       // 'beginner', 'intermediate', 'advanced'
    equipment: String,
    
    // Instructions and guidance
    instructions: [String],
    precautions: [String],
    benefits: [String],
    video_url: String,
    
    // Expected outcomes
    expected_improvement: String,
    
    // Completion tracking for this specific exercise
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: Date,
    
    // User feedback
    difficulty_rating: {     // User's subjective difficulty (1-5)
      type: Number,
      min: 1,
      max: 5
    },
    notes: String            // User notes about exercise
  }],
  
  // Weekly schedule
  weekly_schedule: {
    Monday: [mongoose.Schema.Types.Mixed],
    Tuesday: [mongoose.Schema.Types.Mixed],
    Wednesday: [mongoose.Schema.Types.Mixed],
    Thursday: [mongoose.Schema.Types.Mixed],
    Friday: [mongoose.Schema.Types.Mixed],
    Saturday: [mongoose.Schema.Types.Mixed],
    Sunday: [mongoose.Schema.Types.Mixed]
  },
  
  // Overall plan status
  status: {
    type: String,
    enum: ['active', 'completed', 'skipped', 'expired'],
    default: 'active'
  },
  
  // Completion tracking
  total_exercises: {
    type: Number,
    required: true
  },
  exercises_completed: {
    type: Number,
    default: 0
  },
  completion_percentage: {
    type: Number,
    default: 0
  },
  all_exercises_completed: {
    type: Boolean,
    default: false
  },
  completed_at: Date,
  
  // Unlock gait analysis flag
  can_retest_gait: {
    type: Boolean,
    default: false
  },
  gait_retested: {
    type: Boolean,
    default: false
  },
  retest_gait_analysis_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GaitProgress'
  },
  
  // Time estimates
  estimated_timeline: {
    estimated_weeks: Number,
    milestones: mongoose.Schema.Types.Mixed,
    confidence: String,
    note: String
  },
  daily_time_commitment: {
    average_minutes_per_day: Number,
    range: String,
    note: String
  },
  
  // User profile snapshot (for reference)
  user_profile: {
    age: Number,
    fitness_level: String,
    equipment_available: [String],
    time_available_per_day: Number,
    stroke_side: String,
    months_post_stroke: Number
  },
  
  // Metadata
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for finding user's plan for specific date
ExercisePlanSchema.index({ user_id: 1, date: 1 }, { unique: true });

// Index for finding active plans
ExercisePlanSchema.index({ user_id: 1, status: 1 });

// Update completion percentage when exercises are marked complete
ExercisePlanSchema.methods.updateCompletionStatus = function() {
  const completedCount = this.exercises.filter(ex => ex.completed).length;
  this.exercises_completed = completedCount;
  this.completion_percentage = (completedCount / this.total_exercises) * 100;
  this.all_exercises_completed = completedCount === this.total_exercises;
  
  if (this.all_exercises_completed && !this.completed_at) {
    this.completed_at = new Date();
    this.status = 'completed';
    this.can_retest_gait = true; // Unlock gait analysis
  }
  
  this.updated_at = new Date();
};

// Mark a specific exercise as complete
ExercisePlanSchema.methods.markExerciseComplete = function(exerciseId, difficultyRating = null, notes = null) {
  const exercise = this.exercises.find(ex => ex.exercise_id === exerciseId);
  
  if (exercise && !exercise.completed) {
    exercise.completed = true;
    exercise.completed_at = new Date();
    
    if (difficultyRating) {
      exercise.difficulty_rating = difficultyRating;
    }
    
    if (notes) {
      exercise.notes = notes;
    }
    
    this.updateCompletionStatus();
    return true;
  }
  
  return false;
};

// Mark all exercises as complete (for testing/demo purposes)
ExercisePlanSchema.methods.markAllComplete = function() {
  this.exercises.forEach(exercise => {
    if (!exercise.completed) {
      exercise.completed = true;
      exercise.completed_at = new Date();
    }
  });
  
  this.updateCompletionStatus();
};

// Check if user can perform gait analysis
ExercisePlanSchema.statics.canPerformGaitAnalysis = async function(userId) {
  // Find the most recent active plan (not completed)
  const activePlan = await this.findOne({
    user_id: userId,
    status: 'active'
  }).sort({ date: -1 });
  
  if (!activePlan) {
    // No active plan = first gait analysis or all previous plans completed
    return {
      allowed: true,
      reason: 'no_active_plan'
    };
  }
  
  if (activePlan.all_exercises_completed) {
    // Exercises completed, retest allowed
    return {
      allowed: true,
      reason: 'exercises_completed'
    };
  }
  
  // Exercises not yet completed
  return {
    allowed: false,
    reason: 'exercises_not_completed',
    message: 'Please complete your recommended exercises before performing another gait analysis.',
    exercises_remaining: activePlan.total_exercises - activePlan.exercises_completed,
    completion_percentage: activePlan.completion_percentage
  };
};

// Get latest active exercise plan for user
ExercisePlanSchema.statics.getTodaysPlan = async function(userId) {
  // Get the most recent active plan (status = 'active')
  return await this.findOne({
    user_id: userId,
    status: 'active'
  })
  .sort({ date: -1 })
  .populate('gait_analysis_id');
};

// Update timestamps on save
ExercisePlanSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('ExercisePlan', ExercisePlanSchema);
