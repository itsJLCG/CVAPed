/**
 * Articulation Progress and Exercise Routes
 * Handles progress tracking and exercise retrieval for articulation therapy
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');
const ArticulationProgress = require('../models/ArticulationProgress');
const User = require('../models/User');

/**
 * GET /api/articulation/progress/all
 * Get all patients' articulation progress (for therapists)
 */
router.get('/progress/all', protect, async (req, res) => {
  try {
    console.log('📊 Fetching all articulation progress for therapist');
    
    const progressRecords = await ArticulationProgress.aggregate([
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
          sounds: { $ifNull: ['$sounds', {}] },
          total_trials: {
            $size: {
              $reduce: {
                input: { $objectToArray: { $ifNull: ['$sounds', {}] } },
                initialValue: [],
                in: {
                  $concatArrays: [
                    '$$value',
                    {
                      $reduce: {
                        input: { $objectToArray: { $ifNull: ['$$this.v.levels', {}] } },
                        initialValue: [],
                        in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
                      }
                    }
                  ]
                }
              }
            }
          },
          completed_trials: {
            $size: {
              $filter: {
                input: {
                  $reduce: {
                    input: { $objectToArray: { $ifNull: ['$sounds', {}] } },
                    initialValue: [],
                    in: {
                      $concatArrays: [
                        '$$value',
                        {
                          $reduce: {
                            input: { $objectToArray: { $ifNull: ['$$this.v.levels', {}] } },
                            initialValue: [],
                            in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
                          }
                        }
                      ]
                    }
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
                    input: { $objectToArray: { $ifNull: ['$sounds', {}] } },
                    initialValue: [],
                    in: {
                      $concatArrays: [
                        '$$value',
                        {
                          $reduce: {
                            input: { $objectToArray: { $ifNull: ['$$this.v.levels', {}] } },
                            initialValue: [],
                            in: { $concatArrays: ['$$value', { $ifNull: ['$$this.v.trials', []] }] }
                          }
                        }
                      ]
                    }
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
      const allTrials = Object.values(record.sounds || {}).reduce((acc, sound) => {
        const soundTrials = Object.values(sound.levels || {}).reduce((trials, level) => {
          return trials.concat(level.trials || []);
        }, []);
        return acc.concat(soundTrials);
      }, []);
      
      const completedTrials = allTrials.filter(t => t.completed && t.score != null);
      const avgScore = completedTrials.length > 0
        ? completedTrials.reduce((sum, t) => sum + t.score, 0) / completedTrials.length
        : 0;

      // Get current level from the highest sound/level combination
      const sounds = Object.keys(record.sounds || {});
      const currentLevel = sounds.length > 0 ? 1 : 0;

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

    console.log(`✅ Found ${progressWithScores.length} articulation progress records`);

    res.json({
      success: true,
      progress: progressWithScores
    });
  } catch (error) {
    console.error('❌ Error fetching all articulation progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

// Base URL for therapy exercises service (Python Flask on port 5002)
const THERAPY_SERVICE_URL = process.env.THERAPY_URL || 'http://192.168.1.33:5002';

/**
 * GET /api/articulation/exercises/active/:soundId
 * Get active exercises for a specific sound from therapy service
 */
router.get('/exercises/active/:soundId', protect, async (req, res) => {
  try {
    const { soundId } = req.params;
    
    console.log(`📚 Fetching exercises for sound: ${soundId}`);
    console.log(`🔗 Therapy service URL: ${THERAPY_SERVICE_URL}`);
    
    // Forward request to therapy-exercises service
    // Note: therapy service has articulation blueprint at /api/articulation-exercises
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/articulation-exercises`;
    console.log(`🎯 Full URL: ${therapyUrl}`);
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Received response from therapy service`);
    
    // The Python service returns: { exercises_by_sound: { s: { sound_name, levels: { 1: {...}, 2: {...} } } } }
    const exercisesBySound = response.data.exercises_by_sound || {};
    console.log(`📦 Available sounds:`, Object.keys(exercisesBySound));
    
    // Get the sound data
    const soundData = exercisesBySound[soundId];
    
    if (!soundData) {
      console.log(`❌ No exercises found for sound '${soundId}'`);
      return res.json({
        success: true,
        sound_id: soundId,
        exercises_by_level: {},
        total: 0
      });
    }
    
    console.log(`📊 Sound '${soundId}' has ${Object.keys(soundData.levels || {}).length} levels`);
    
    // The levels are already grouped, just need to filter active exercises
    const exercisesByLevel = {};
    let totalCount = 0;
    
    for (const [level, levelData] of Object.entries(soundData.levels || {})) {
      const activeExercises = (levelData.exercises || []).filter(ex => ex.is_active !== false);
      
      if (activeExercises.length > 0) {
        exercisesByLevel[level] = {
          level_name: levelData.level_name,
          exercises: activeExercises
        };
        totalCount += activeExercises.length;
        console.log(`   ✓ Level ${level} (${levelData.level_name}): ${activeExercises.length} exercises`);
      }
    }
    
    console.log(`🎯 Total active exercises for sound '${soundId}': ${totalCount}`);
    
    res.json({
      success: true,
      sound_id: soundId,
      exercises_by_level: exercisesByLevel,
      total: totalCount
    });
    
  } catch (error) {
    console.error('❌ Error fetching exercises from therapy service:');
    console.error(`   Sound ID: ${req.params.soundId}`);
    console.error(`   Therapy URL: ${THERAPY_SERVICE_URL}`);
    console.error(`   Error message: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`   ⚠️  Therapy service is not running on ${THERAPY_SERVICE_URL}`);
      return res.status(503).json({
        success: false,
        message: 'Therapy exercises service is not available. Please make sure it is running on port 5002.',
        error: 'THERAPY_SERVICE_UNAVAILABLE'
      });
    }
    
    // Return error response
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data:`, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exercises from therapy service',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/articulation/progress/:soundId
 * Get progress for a specific sound
 */
router.get('/progress/:soundId', protect, async (req, res) => {
  try {
    const { soundId } = req.params;
    const userId = req.user._id;

    console.log(`📊 Fetching progress for user ${userId}, sound '${soundId}'`);

    // Find progress in MongoDB (web version structure)
    const progress = await ArticulationProgress.findOne({
      user_id: userId,
      sound_id: soundId
    });

    if (!progress) {
      console.log('   No progress found - returning defaults');
      return res.json({
        success: true,
        has_progress: false,
        sound_id: soundId,
        current_level: 1,
        current_item: 0,
        levels: {}
      });
    }

    console.log(`   ✅ Found progress from database`);

    // Find current level and item from progress
    let currentLevel = 1;
    let currentItem = 0;
    
    // Find highest incomplete level
    for (let level = 1; level <= 5; level++) {
      const levelKey = level.toString();
      const levelData = progress.levels[levelKey];
      
      if (!levelData || !levelData.is_complete) {
        currentLevel = level;
        
        // Find first incomplete item in this level
        if (levelData && levelData.items) {
          const items = Object.keys(levelData.items).map(k => parseInt(k)).sort((a, b) => a - b);
          for (const itemIdx of items) {
            if (!levelData.items[itemIdx.toString()].completed) {
              currentItem = itemIdx;
              break;
            }
          }
        }
        break;
      }
    }

    console.log(`   Current position: Level ${currentLevel}, Item ${currentItem}`);

    res.json({
      success: true,
      has_progress: true,
      sound_id: soundId,
      current_level: currentLevel,
      current_item: currentItem,
      levels: progress.levels || {}
    });
  } catch (error) {
    console.error('❌ Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
});

/**
 * POST /api/articulation/progress
 * Save progress for articulation therapy
 */
router.post('/progress', protect, async (req, res) => {
  try {
    const {
      sound_id,
      level,
      item_index,
      average_score,
      passed,
      completed,
      trial_details,
      trials,  // Keep for backwards compatibility
      timestamp
    } = req.body;

    const userId = req.user._id;
    const trialData = trial_details || trials || [];

    console.log(`💾 Saving progress for user ${userId}`);
    console.log(`   Sound: ${sound_id}, Level: ${level}, Item: ${item_index}`);
    console.log(`   Average Score: ${(average_score * 100).toFixed(1)}%, Passed: ${passed}`);
    console.log(`   Trial details count: ${trialData.length}`);

    // Find or create progress document (matching web version structure)
    let progress = await ArticulationProgress.findOne({
      user_id: userId,
      sound_id: sound_id
    });

    if (!progress) {
      console.log('   Creating new progress document');
      progress = new ArticulationProgress({
        user_id: userId,
        sound_id: sound_id,
        levels: {},
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Initialize levels object if doesn't exist
    if (!progress.levels) {
      progress.levels = {};
    }

    // Update level progress (levels is an object, not array)
    const levelKey = level.toString();
    if (!progress.levels[levelKey]) {
      progress.levels[levelKey] = {
        items: {},
        is_complete: false,
        completed_items: 0
      };
    }

    // Update item progress (items is also an object)
    const itemKey = item_index.toString();
    progress.levels[levelKey].items[itemKey] = {
      completed: completed !== undefined ? completed : passed,
      average_score: average_score,
      trial_details: trialData,
      last_attempt: new Date()
    };

    // Check if level is complete
    const levelData = progress.levels[levelKey];
    const totalItems = level === 1 ? 1 : level === 2 ? 3 : 2;
    const completedItems = Object.values(levelData.items).filter(item => item.completed).length;
    levelData.is_complete = completedItems >= totalItems;
    levelData.completed_items = completedItems;
    levelData.total_items = totalItems;

    progress.updated_at = new Date();
    progress.markModified('levels'); // Important for nested objects

    await progress.save();

    console.log('   ✅ Progress saved successfully');

    res.json({
      success: true,
      message: 'Progress saved successfully',
      progress: {
        current_level: progress.current_level,
        current_item: progress.current_item,
        overall_progress: progress.overall_progress
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
 * POST /api/articulation/predict-mastery
 * Predict days until mastery for a specific sound using XGBoost ML model
 */
router.post('/predict-mastery', protect, async (req, res) => {
  try {
    const { sound_id } = req.body;
    const userId = req.user._id.toString();

    if (!sound_id) {
      return res.status(400).json({
        success: false,
        error: 'sound_id is required'
      });
    }

    if (!['s', 'r', 'l', 'k', 'th'].includes(sound_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sound_id. Must be one of: s, r, l, k, th'
      });
    }

    console.log(`🔮 Requesting mastery prediction for user ${userId}, sound '${sound_id}'`);

    // Forward request to therapy-exercises service (Python/XGBoost)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/articulation/predict-mastery`;
    
    const response = await axios.post(therapyUrl, {
      user_id: userId,
      sound_id: sound_id
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Prediction received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting mastery prediction:', error.message);
    
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
        message: 'Failed to get mastery prediction',
        error: error.message
      });
    }
  }
});

/**
 * POST /api/articulation/train-model
 * Train/retrain the XGBoost mastery prediction model (Admin only)
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

    console.log(`🤖 Requesting model training (initiated by ${req.user.email})`);

    // Forward request to therapy-exercises service
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/articulation/train-model`;
    
    const response = await axios.post(therapyUrl, {}, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Model training complete`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error training model:', error.message);
    
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
        message: 'Failed to train model',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/articulation/model-status
 * Get status of the mastery prediction model
 */
router.get('/model-status', protect, async (req, res) => {
  try {
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/articulation/model-status`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error checking model status:', error.message);
    
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

/**
 * GET /api/articulation-progress/all
 * Get all articulation progress for all users (Admin endpoint)
 */
router.get('/all', protect, async (req, res) => {
  try {
    const ArticulationProgress = require('../models/ArticulationProgress');
    const User = require('../models/User');

    const progressData = await ArticulationProgress.find({}).lean();

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
        last_score: progress.pronunciation_score || 0,
        last_activity: progress.updated_at || progress.created_at
      };
    }));

    res.json(enrichedData);
  } catch (error) {
    console.error('Error fetching all articulation progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

module.exports = router;
