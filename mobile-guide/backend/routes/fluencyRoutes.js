/**
 * Fluency Therapy Routes
 * Handles fluency assessment and progress tracking
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');
const FluencyProgress = require('../models/FluencyProgress');
const FluencyTrial = require('../models/FluencyTrial');
const User = require('../models/User');

const THERAPY_SERVICE_URL = process.env.THERAPY_URL || 'http://192.168.1.33:5002';

/**
 * GET /api/fluency/progress/all
 * Get all patients' fluency progress (for therapists)
 */
router.get('/progress/all', protect, async (req, res) => {
  try {
    console.log('📊 Fetching all fluency progress for therapist');
    
    // Get all progress records with user details
    const progressRecords = await FluencyProgress.aggregate([
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
          levels: { $ifNull: ['$levels', {}] },
          total_trials: {
            $size: {
              $reduce: {
                input: { $objectToArray: { $ifNull: ['$levels', {}] } },
                initialValue: [],
                in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
              }
            }
          },
          completed_trials: {
            $size: {
              $filter: {
                input: {
                  $reduce: {
                    input: { $objectToArray: { $ifNull: ['$levels', {}] } },
                    initialValue: [],
                    in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
                  }
                },
                as: 'trial',
                cond: { $eq: ['$$trial.completed', true] }
              }
            }
          },
          last_trial_date: {
            $max: {
              $map: {
                input: {
                  $reduce: {
                    input: { $objectToArray: { $ifNull: ['$levels', {}] } },
                    initialValue: [],
                    in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
                  }
                },
                as: 'trial',
                in: '$$trial.timestamp'
              }
            }
          }
        }
      }
    ]);

    // Calculate average scores
    const progressWithScores = progressRecords.map(record => {
      const allTrials = Object.values(record.levels || {}).reduce((acc, level) => {
        return acc.concat(level.trials || []);
      }, []);
      
      const completedTrials = allTrials.filter(t => t.completed && t.score != null);
      const avgScore = completedTrials.length > 0
        ? completedTrials.reduce((sum, t) => sum + t.score, 0) / completedTrials.length
        : 0;

      // Get current level from the highest unlocked level
      const levels = Object.keys(record.levels || {}).map(Number).sort((a, b) => b - a);
      const currentLevel = levels[0] || 1;

      return {
        user_id: record.user_id,
        user_name: record.user_name,
        user_email: record.user_email,
        total_trials: record.total_trials,
        completed_trials: record.completed_trials,
        last_trial_date: record.last_trial_date,
        average_score: avgScore,
        current_level: currentLevel
      };
    });

    console.log(`✅ Found ${progressWithScores.length} progress records`);

    res.json({
      success: true,
      progress: progressWithScores
    });
  } catch (error) {
    console.error('❌ Error fetching all fluency progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

/**
 * GET /api/fluency/exercises
 * Get all fluency exercises for patient
 */
router.get('/exercises', protect, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const exercises = await db.collection('fluency_exercises')
      .find({ is_active: true })
      .sort({ level: 1, order: 1 })
      .toArray();

    console.log(`📚 Found ${exercises.length} active fluency exercises`);

    // Group by level
    const levels = {};
    exercises.forEach(ex => {
      if (!levels[ex.level]) {
        levels[ex.level] = {
          level: ex.level,
          name: ex.level_name,
          color: ex.level_color,
          exercises: []
        };
      }
      levels[ex.level].exercises.push(ex);
    });

    res.json({
      success: true,
      levels: levels,
      total_exercises: exercises.length
    });
  } catch (error) {
    console.error('❌ Error fetching fluency exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercises'
    });
  }
});

/**
 * GET /api/fluency/progress
 * Get user's fluency progress
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    console.log(`📈 Loading fluency progress for user: ${userId}`);
    
    const progress = await FluencyProgress.findOne({ user_id: userId });

    if (!progress) {
      console.log('   No progress found - returning defaults');
      return res.json({
        success: true,
        has_progress: false,
        current_level: 1,
        current_exercise: 0,
        levels: {}
      });
    }

    // Find current level and exercise
    let currentLevel = 1;
    let currentExercise = 0;

    // Get total exercises per level from database
    const allExercises = await req.app.locals.db.collection('fluency_exercises')
      .find({ is_active: true })
      .sort({ level: 1, order: 1 })
      .toArray();

    // Group by level to get counts
    const levelCounts = {};
    allExercises.forEach(ex => {
      levelCounts[ex.level] = (levelCounts[ex.level] || 0) + 1;
    });

    console.log('   Level exercise counts:', levelCounts);

    for (let level = 1; level <= 5; level++) {
      const levelKey = level.toString();
      const levelData = progress.levels[levelKey];
      const maxExercisesInLevel = levelCounts[level] || 0;
      
      if (!levelData || !levelData.exercises) {
        currentLevel = level;
        currentExercise = 0;
        break;
      }

      // Find incomplete exercise
      const exercises = levelData.exercises;
      let levelComplete = true;
      
      for (let exIdx = 0; exIdx < maxExercisesInLevel; exIdx++) {
        const exKey = exIdx.toString();
        if (!exercises[exKey]) {
          currentLevel = level;
          currentExercise = exIdx;
          levelComplete = false;
          break;
        }
      }

      if (!levelComplete) break;
      
      // If this level is complete and it's not the last level, move to next level
      if (level < 5) {
        currentLevel = level + 1;
        currentExercise = 0;
      } else {
        // All levels complete
        currentLevel = 5;
        currentExercise = maxExercisesInLevel;
      }
    }

    console.log(`   Current position: Level ${currentLevel}, Exercise ${currentExercise}`);

    // Calculate level completion status
    const levelCompletion = {};
    for (let level = 1; level <= 5; level++) {
      const levelKey = level.toString();
      const levelData = progress.levels[levelKey];
      const maxExercisesInLevel = levelCounts[level] || 0;
      
      if (levelData && levelData.exercises) {
        const completedCount = Object.keys(levelData.exercises).length;
        levelCompletion[level] = completedCount >= maxExercisesInLevel;
      } else {
        levelCompletion[level] = false;
      }
    }

    res.json({
      success: true,
      has_progress: true,
      current_level: currentLevel,
      current_exercise: currentExercise,
      levels: progress.levels || {},
      level_completion: levelCompletion
    });
  } catch (error) {
    console.error('❌ Error fetching fluency progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
});

/**
 * POST /api/fluency/progress
 * Save fluency progress
 */
router.post('/progress', protect, async (req, res) => {
  try {
    const {
      level,
      exercise_index,
      exercise_id,
      speaking_rate,
      fluency_score,
      pause_count,
      disfluencies,
      passed
    } = req.body;

    const userId = req.user._id.toString();

    console.log(`💾 Saving fluency progress for user ${userId}`);
    console.log(`   Level: ${level}, Exercise: ${exercise_index}`);
    console.log(`   Fluency Score: ${fluency_score}, Passed: ${passed}`);

    // Find or create progress document
    let progress = await FluencyProgress.findOne({ user_id: userId });

    if (!progress) {
      console.log('   Creating new progress document');
      progress = new FluencyProgress({
        user_id: userId,
        levels: {},
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Initialize levels object
    if (!progress.levels) {
      progress.levels = {};
    }

    // Update level progress
    const levelKey = level.toString();
    if (!progress.levels[levelKey]) {
      progress.levels[levelKey] = {
        exercises: {}
      };
    }

    // Update exercise progress
    const exerciseKey = exercise_index.toString();
    progress.levels[levelKey].exercises[exerciseKey] = {
      exercise_id: exercise_id,
      completed: true,
      speaking_rate: speaking_rate,
      fluency_score: fluency_score,
      pause_count: pause_count,
      disfluencies: disfluencies,
      passed: passed,
      last_attempt: new Date()
    };

    progress.updated_at = new Date();
    progress.markModified('levels');

    await progress.save();

    // Save trial data to fluency_trials collection
    const trialData = {
      user_id: userId,
      level: level,
      exercise_index: exercise_index,
      exercise_id: exercise_id,
      speaking_rate: speaking_rate,
      fluency_score: fluency_score,
      pause_count: pause_count,
      disfluencies: disfluencies,
      passed: passed,
      timestamp: new Date()
    };

    await FluencyTrial.create(trialData);

    console.log('   ✅ Progress saved to both collections');

    res.json({
      success: true,
      message: 'Progress saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving fluency progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
});

/**
 * GET /api/fluency-progress/all
 * Get all users' fluency progress (Admin endpoint)
 */
router.get('/all', protect, async (req, res) => {
  try {
    const FluencyProgress = require('../models/FluencyProgress');
    const User = require('../models/User');

    const progressData = await FluencyProgress.find({}).lean();

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
        last_score: progress.fluency_score || 0,
        last_activity: progress.updated_at || progress.created_at
      };
    }));

    res.json(enrichedData);
  } catch (error) {
    console.error('Error fetching all fluency progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

/**
 * POST /api/fluency/predict-mastery
 * Predict days until fluency mastery using XGBoost ML model
 */
router.post('/predict-mastery', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    console.log(`🔮 Requesting fluency mastery prediction for user ${userId}`);

    // Forward request to therapy-exercises service (Python/XGBoost)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/fluency/predict-mastery`;
    
    const response = await axios.post(therapyUrl, {
      user_id: userId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Fluency prediction received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting fluency mastery prediction:', error.message);
    
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
        message: 'Failed to get fluency mastery prediction',
        error: error.message
      });
    }
  }
});

/**
 * POST /api/fluency/train-model
 * Train/retrain the XGBoost fluency mastery prediction model (Admin only)
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

    console.log(`🤖 Requesting fluency model training (initiated by ${req.user.email})`);

    // Forward request to therapy-exercises service
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/fluency/train-model`;
    
    const response = await axios.post(therapyUrl, {}, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Fluency model training complete`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error training fluency model:', error.message);
    
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
        message: 'Failed to train fluency model',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/fluency/model-status
 * Get status of the fluency mastery prediction model
 */
router.get('/model-status', protect, async (req, res) => {
  try {
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/fluency/model-status`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error checking fluency model status:', error.message);
    
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
