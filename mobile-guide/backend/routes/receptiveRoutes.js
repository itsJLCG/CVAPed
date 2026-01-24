const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');
const mongoose = require('mongoose');
const LanguageProgress = require('../models/LanguageProgress');
const User = require('../models/User');

const THERAPY_SERVICE_URL = process.env.THERAPY_URL || 'http://192.168.1.33:5002';

/**
 * GET /api/receptive/progress/all
 * Get all patients' receptive language progress (for therapists)
 */
router.get('/progress/all', protect, async (req, res) => {
  try {
    console.log('📊 Fetching all receptive language progress for therapist');
    
    const progressRecords = await LanguageProgress.aggregate([
      { $match: { mode: 'receptive' } },
      {
        $addFields: {
          userObjectId: { $toObjectId: '$user_id' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user_id: 1,
          user_name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          user_email: '$user.email',
          current_level: 1,
          total_exercises: 1,
          completed_exercises: 1,
          correct_exercises: 1,
          accuracy: 1,
          current_exercise: 1,
          updated_at: 1
        }
      }
    ]);

    const progressWithStats = progressRecords.map(record => ({
      ...record,
      total_trials: record.total_exercises || 0,
      completed_trials: record.completed_exercises || 0,
      average_score: record.accuracy || 0,
      last_trial_date: record.updated_at
    }));

    console.log(`✅ Found ${progressWithStats.length} receptive language progress records`);

    res.json({
      success: true,
      progress: progressWithStats
    });
  } catch (error) {
    console.error('❌ Error fetching all receptive language progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

// Get receptive exercises collection
const getReceptiveExercises = () => {
  return mongoose.connection.db.collection('receptive_exercises');
};

/**
 * GET /api/receptive/exercises
 * Get all active receptive exercises grouped by level
 */
router.get('/exercises', protect, async (req, res) => {
  try {
    console.log('📚 Loading receptive exercises...');
    
    const receptiveExercises = getReceptiveExercises();
    
    // Get all active exercises sorted by level and order
    const exercises = await receptiveExercises
      .find({ is_active: true })
      .sort({ level: 1, order: 1 })
      .toArray();

    console.log(`✅ Found ${exercises.length} receptive exercises`);
    
    // Log first exercise to verify data structure
    if (exercises.length > 0) {
      console.log('Sample exercise:', JSON.stringify(exercises[0], null, 2));
    }

    // Group by level
    const exercisesByLevel = {};
    exercises.forEach(ex => {
      const level = ex.level;
      if (!exercisesByLevel[level]) {
        exercisesByLevel[level] = {
          level: level,
          exercises: []
        };
      }
      
      exercisesByLevel[level].exercises.push({
        exercise_id: ex.exercise_id,
        type: ex.type,
        level: ex.level,
        instruction: ex.instruction,
        target: ex.target,
        options: ex.options || [],
        order: ex.order
      });
    });

    res.json({
      success: true,
      exercises_by_level: exercisesByLevel,
      total_exercises: exercises.length
    });

  } catch (error) {
    console.error('❌ Error loading receptive exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load exercises',
      error: error.message
    });
  }
});

/**
 * GET /api/receptive/progress
 * Get user's receptive therapy progress
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    console.log('📊 Loading receptive progress for user:', userId);

    const LanguageProgress = require('../models/LanguageProgress');
    
    const progress = await LanguageProgress.findOne({
      user_id: userId,
      mode: 'receptive'
    });

    if (!progress) {
      return res.json({
        success: true,
        has_progress: false,
        current_exercise: 0
      });
    }

    // Use the saved current_exercise value directly
    // This is the most reliable since it's saved on every progress update
    const currentExercise = progress.current_exercise || 0;
    
    console.log('📊 Progress data:');
    console.log('   Current exercise (from DB):', currentExercise);
    console.log('   Completed exercises:', progress.completed_exercises);
    console.log('   Total exercises:', progress.total_exercises);

    res.json({
      success: true,
      has_progress: true,
      current_exercise: currentExercise,
      total_exercises: progress.total_exercises,
      completed_exercises: progress.completed_exercises,
      correct_exercises: progress.correct_exercises,
      accuracy: progress.accuracy,
      exercises: progress.exercises || {}
    });

  } catch (error) {
    console.error('❌ Error loading progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load progress',
      error: error.message
    });
  }
});

/**
 * POST /api/receptive/progress
 * Save user's receptive therapy progress
 */
router.post('/progress', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      exercise_index,
      exercise_id,
      is_correct,
      score,
      user_answer
    } = req.body;

    console.log('💾 Saving receptive progress:', {
      userId,
      exercise_index,
      exercise_id,
      is_correct
    });

    const LanguageProgress = require('../models/LanguageProgress');
    const LanguageTrial = require('../models/LanguageTrial');

    // Find or create progress document
    let progress = await LanguageProgress.findOne({
      user_id: userId,
      mode: 'receptive'
    });

    if (!progress) {
      progress = new LanguageProgress({
        user_id: userId,
        mode: 'receptive',
        exercises: {}
      });
    }

    // Update exercise progress
    const exerciseKey = exercise_index.toString();
    if (!progress.exercises) {
      progress.exercises = {};
    }
    
    progress.exercises[exerciseKey] = {
      exercise_id,
      completed: true,
      is_correct,
      score: score || (is_correct ? 1.0 : 0.0),
      user_answer,
      last_attempt: new Date()
    };

    // Calculate overall progress
    const exercises = progress.exercises;
    const exerciseKeys = Object.keys(exercises);
    const totalExercises = exerciseKeys.length;
    const completedExercises = exerciseKeys.filter(k => exercises[k]?.completed).length;
    const correctExercises = exerciseKeys.filter(k => exercises[k]?.is_correct).length;

    progress.total_exercises = totalExercises;
    progress.completed_exercises = completedExercises;
    progress.correct_exercises = correctExercises;
    progress.accuracy = completedExercises > 0 ? correctExercises / completedExercises : 0;
    progress.current_exercise = exercise_index + 1;
    progress.updated_at = new Date();

    await progress.save();

    // Save trial data
    const trial = new LanguageTrial({
      user_id: userId,
      mode: 'receptive',
      exercise_index,
      exercise_id,
      is_correct,
      score: score || (is_correct ? 1.0 : 0.0),
      user_answer,
      timestamp: new Date()
    });

    await trial.save();

    console.log('✅ Progress saved successfully');

    res.json({
      success: true,
      message: 'Progress saved successfully',
      progress: {
        completed_exercises: completedExercises,
        total_exercises: totalExercises,
        accuracy: progress.accuracy,
        current_exercise: progress.current_exercise
      }
    });

  } catch (error) {
    console.error('❌ Error saving progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
});

/**
 * GET /api/receptive-progress/all
 * Get all users' receptive language progress (Admin endpoint)
 */
router.get('/all', protect, async (req, res) => {
  try {
    const LanguageProgress = require('../models/LanguageProgress');
    const User = require('../models/User');

    const progressData = await LanguageProgress.find({ mode: 'receptive' }).lean();

    const enrichedData = await Promise.all(progressData.map(async (progress) => {
      const user = await User.findById(progress.user_id).select('name email');
      return {
        _id: progress._id,
        user_id: progress.user_id,
        user_name: user?.name || 'Unknown',
        email: user?.email || '',
        current_exercise: progress.current_exercise || 0,
        current_level: progress.current_level || 1,
        total_trials: progress.completed_exercises || 0,
        last_score: progress.accuracy || 0,
        last_activity: progress.updated_at || progress.created_at
      };
    }));

    res.json(enrichedData);
  } catch (error) {
    console.error('Error fetching all receptive progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

/**
 * POST /api/receptive/predict-mastery
 * Predict days until receptive language mastery using XGBoost ML model
 */
router.post('/predict-mastery', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    console.log(`🔮 Requesting receptive language mastery prediction for user ${userId}`);

    // Forward request to therapy-exercises service (Python/XGBoost)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/predict-mastery`;
    
    const response = await axios.post(therapyUrl, {
      user_id: userId,
      mode: 'receptive'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Receptive language prediction received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting receptive language mastery prediction:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Prediction service is not available. Please make sure therapy service is running on port 5002.',
        error: 'PREDICTION_SERVICE_UNAVAILABLE'
      });
    }

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get receptive language mastery prediction',
        error: error.message
      });
    }
  }
});

/**
 * POST /api/receptive/train-model
 * Train/retrain the XGBoost receptive language mastery prediction model (Admin only)
 */
router.post('/train-model', protect, async (req, res) => {
  try {
    // Check if user is admin or therapist
    if (!['admin', 'therapist'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Admin or therapist access required.'
      });
    }

    console.log(`🤖 Requesting receptive language model training (initiated by ${req.user.email})`);

    // Forward request to therapy-exercises service
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/train-model`;
    
    const response = await axios.post(therapyUrl, {
      mode: 'receptive'
    }, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Receptive language model training complete`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error training receptive language model:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Prediction service is not available.',
        error: 'PREDICTION_SERVICE_UNAVAILABLE'
      });
    }

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to train receptive language model',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/receptive/model-status
 * Get status of the receptive language mastery prediction model
 */
router.get('/model-status', protect, async (req, res) => {
  try {
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/model-status`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    // Return only receptive status
    res.json(response.data.receptive || response.data);

  } catch (error) {
    console.error('❌ Error checking receptive language model status:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        available: false,
        message: 'Prediction service is not available.'
      });
    }

    res.status(500).json({
      available: false,
      error: error.message
    });
  }
});

module.exports = router;
