const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');
const LanguageProgress = require('../models/LanguageProgress');
const LanguageTrial = require('../models/LanguageTrial');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const THERAPY_SERVICE_URL = process.env.THERAPY_URL || 'http://192.168.1.33:5002';

/**
 * GET /api/expressive/progress/all
 * Get all patients' expressive language progress (for therapists)
 */
router.get('/progress/all', protect, async (req, res) => {
  try {
    console.log('📊 Fetching all expressive language progress for therapist');
    
    const progressRecords = await LanguageProgress.aggregate([
      { $match: { mode: 'expressive' } },
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

    console.log(`✅ Found ${progressWithStats.length} expressive language progress records`);

    res.json({
      success: true,
      progress: progressWithStats
    });
  } catch (error) {
    console.error('❌ Error fetching all expressive language progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

// Configure multer for audio file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /m4a|mp3|wav|webm|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('audio');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Audio files only!');
    }
  }
});

/**
 * GET /api/expressive/exercises
 * Get all expressive language exercises grouped by level
 */
router.get('/exercises', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    console.log(`📚 Loading expressive exercises for user: ${userId}`);

    const db = req.app.locals.db;
    const exercisesCollection = db.collection('language_exercises');

    // Get all active expressive exercises
    const exercises = await exercisesCollection
      .find({ 
        mode: 'expressive',
        is_active: true 
      })
      .sort({ level: 1, order: 1 })
      .toArray();

    // Group exercises by level
    const exercisesByLevel = {};
    exercises.forEach(ex => {
      const level = ex.level;
      if (!exercisesByLevel[level]) {
        exercisesByLevel[level] = {
          level: level,
          level_name: ex.level_name || `Level ${level}`,
          level_color: ex.level_color || '#8b5cf6',
          exercises: []
        };
      }

      exercisesByLevel[level].exercises.push({
        exercise_id: ex.exercise_id,
        type: ex.type,
        level: ex.level,
        instruction: ex.instruction,
        prompt: ex.prompt,
        expected_keywords: ex.expected_keywords || [],
        min_words: ex.min_words || 5,
        story: ex.story || '',
        order: ex.order || 1
      });
    });

    console.log(`✅ Found ${exercises.length} expressive exercises in ${Object.keys(exercisesByLevel).length} levels`);

    res.json({
      success: true,
      exercises_by_level: exercisesByLevel,
      total_exercises: exercises.length
    });

  } catch (error) {
    console.error('❌ Error loading expressive exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load exercises',
      error: error.message
    });
  }
});

/**
 * GET /api/expressive/progress
 * Get user's expressive therapy progress
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    console.log(`📊 Loading expressive progress for user: ${userId}`);

    const LanguageProgress = require('../models/LanguageProgress');
    
    const progress = await LanguageProgress.findOne({
      user_id: userId,
      mode: 'expressive'
    });

    if (!progress) {
      return res.json({
        success: true,
        has_progress: false,
        current_exercise: 0
      });
    }

    // Use the saved current_exercise value directly
    const currentExercise = progress.current_exercise || 0;
    
    console.log('📊 Expressive Progress data:');
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
    console.error('❌ Error loading expressive progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load progress',
      error: error.message
    });
  }
});

/**
 * POST /api/expressive/progress
 * Save user's expressive therapy progress
 */
router.post('/progress', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      exercise_index,
      exercise_id,
      is_correct,
      score,
      transcription
    } = req.body;

    console.log('💾 Saving expressive progress:', {
      userId,
      exercise_index,
      exercise_id,
      is_correct,
      score
    });

    const LanguageProgress = require('../models/LanguageProgress');
    const LanguageTrial = require('../models/LanguageTrial');

    // Find or create progress document
    let progress = await LanguageProgress.findOne({
      user_id: userId,
      mode: 'expressive'
    });

    if (!progress) {
      progress = new LanguageProgress({
        user_id: userId,
        mode: 'expressive',
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
      transcription: transcription || '',
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
      mode: 'expressive',
      exercise_index,
      exercise_id,
      is_correct,
      score: score || (is_correct ? 1.0 : 0.0),
      transcription: transcription || '',
      timestamp: new Date()
    });

    await trial.save();

    console.log('✅ Expressive progress saved successfully');

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
    console.error('❌ Error saving expressive progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: error.message
    });
  }
});

/**
 * POST /api/expressive/assess
 * Assess expressive language response using Azure Speech-to-Text
 */
router.post('/assess', protect, upload.single('audio'), async (req, res) => {
  let tempFilePath = null;

  try {
    const {
      exercise_id,
      exercise_type,
      expected_keywords,
      min_words
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    tempFilePath = req.file.path;
    console.log('🎤 Received audio file:', {
      filename: req.file.originalname,
      size: req.file.size,
      path: tempFilePath
    });

    // Parse expected keywords
    const keywords = JSON.parse(expected_keywords || '[]');
    const minWordCount = parseInt(min_words || '5');

    // Convert M4A to WAV for Azure
    const ffmpeg = require('fluent-ffmpeg');
    const wavFilePath = tempFilePath + '.wav';

    console.log('🔄 Converting audio to WAV format...');

    await new Promise((resolve, reject) => {
      ffmpeg(tempFilePath)
        .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('end', () => {
          console.log('✅ Audio conversion complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Audio conversion error:', err);
          reject(err);
        })
        .save(wavFilePath);
    });

    // Azure Speech-to-Text Integration
    const sdk = require('microsoft-cognitiveservices-speech-sdk');
    
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !serviceRegion) {
      console.error('❌ Azure credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Azure Speech service not configured'
      });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Create audio config from WAV file
    const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(wavFilePath));
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Perform speech recognition
    const recognitionPromise = new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        result => {
          recognizer.close();
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            resolve(result.text);
          } else if (result.reason === sdk.ResultReason.NoMatch) {
            reject(new Error('No speech recognized'));
          } else {
            reject(new Error('Speech recognition failed'));
          }
        },
        error => {
          recognizer.close();
          reject(error);
        }
      );
    });

    try {
      const transcription = await recognitionPromise;
      
      console.log('🎯 Transcription:', transcription);

      // Analyze transcription
      const words = transcription.toLowerCase().split(/\s+/);
      const wordCount = words.length;

      // Check for expected keywords
      const keywordsFound = [];
      for (const keyword of keywords) {
        if (transcription.toLowerCase().includes(keyword.toLowerCase())) {
          keywordsFound.push(keyword);
        }
      }

      // Calculate score
      const keywordScore = keywords.length > 0 ? keywordsFound.length / keywords.length : 0.5;
      const wordCountScore = Math.min(wordCount / minWordCount, 1.0);
      
      // Overall score (weighted average: 70% keywords, 30% word count)
      const overallScore = (keywordScore * 0.7) + (wordCountScore * 0.3);

      console.log('📊 Assessment:', {
        transcription,
        wordCount,
        keywordsFound: keywordsFound.length,
        totalKeywords: keywords.length,
        keywordScore: keywordScore.toFixed(2),
        wordCountScore: wordCountScore.toFixed(2),
        overallScore: overallScore.toFixed(2)
      });

      // Generate feedback based on score
      let feedback = '';
      if (overallScore >= 0.9) {
        feedback = `Excellent! Your response was complete and covered all expected points. (${keywordsFound.length}/${keywords.length} keywords found)`;
      } else if (overallScore >= 0.7) {
        feedback = `Good job! Your response was mostly complete. (${keywordsFound.length}/${keywords.length} keywords found)`;
      } else if (overallScore >= 0.5) {
        feedback = `Fair response. Try to include more details. (${keywordsFound.length}/${keywords.length} keywords found)`;
      } else {
        feedback = `Your response needs improvement. Try to include more relevant information. (${keywordsFound.length}/${keywords.length} keywords found)`;
      }

      res.json({
        success: true,
        transcription: transcription,
        key_phrases: keywordsFound,
        word_count: wordCount,
        score: overallScore,
        feedback: feedback
      });

    } catch (recognitionError) {
      console.error('❌ Azure recognition error:', recognitionError);
      
      // Fallback to mock response if Azure fails
      const mockTranscription = `[Audio received but could not be transcribed: ${recognitionError.message}]`;
      res.json({
        success: true,
        transcription: mockTranscription,
        key_phrases: [],
        word_count: 0,
        score: 0.5,
        feedback: 'Could not transcribe audio. Please try speaking more clearly.'
      });
    }

    // Clean up temp files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      setTimeout(() => {
        try {
          fs.unlinkSync(tempFilePath);
          if (fs.existsSync(wavFilePath)) {
            fs.unlinkSync(wavFilePath);
          }
        } catch (err) {
          console.error('Error deleting temp files:', err);
        }
      }, 1000);
    }

  } catch (error) {
    console.error('❌ Error assessing audio:', error);
    
    // Clean up temp files on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        const wavFilePath = tempFilePath + '.wav';
        if (fs.existsSync(wavFilePath)) {
          fs.unlinkSync(wavFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assess audio',
      error: error.message
    });
  }
});

/**
 * GET /api/language-progress/all
 * Get all users' expressive language progress (Admin endpoint)
 */
router.get('/all', protect, async (req, res) => {
  try {
    const LanguageProgress = require('../models/LanguageProgress');
    const User = require('../models/User');

    // Get all expressive language progress from all users
    const progressData = await LanguageProgress.find({ mode: 'expressive' }).lean();

    // Enrich with user information
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
    console.error('Error fetching all expressive progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data'
    });
  }
});

/**
 * POST /api/expressive/predict-mastery
 * Predict days until expressive language mastery using XGBoost ML model
 */
router.post('/predict-mastery', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    console.log(`🔮 Requesting expressive language mastery prediction for user ${userId}`);

    // Forward request to therapy-exercises service (Python/XGBoost)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/predict-mastery`;
    
    const response = await axios.post(therapyUrl, {
      user_id: userId,
      mode: 'expressive'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Expressive language prediction received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting expressive language mastery prediction:', error.message);
    
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
        message: 'Failed to get expressive language mastery prediction',
        error: error.message
      });
    }
  }
});

/**
 * POST /api/expressive/train-model
 * Train/retrain the XGBoost expressive language mastery prediction model (Admin only)
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

    console.log(`🤖 Requesting expressive language model training (initiated by ${req.user.email})`);

    // Forward request to therapy-exercises service
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/train-model`;
    
    const response = await axios.post(therapyUrl, {
      mode: 'expressive'
    }, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Expressive language model training complete`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error training expressive language model:', error.message);
    
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
        message: 'Failed to train expressive language model',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/expressive/model-status
 * Get status of the expressive language mastery prediction model
 */
router.get('/model-status', protect, async (req, res) => {
  try {
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/language/model-status`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    // Return only expressive status
    res.json(response.data.expressive || response.data);

  } catch (error) {
    console.error('❌ Error checking expressive language model status:', error.message);
    
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
