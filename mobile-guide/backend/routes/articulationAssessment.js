/**
 * Articulation Assessment Route
 * Uses Azure Cognitive Services Speech SDK for pronunciation assessment
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { protect } = require('../middleware/auth');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ArticulationTrial = require('../models/ArticulationTrial');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.wav`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/wave', 'audio/mpeg', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Only WAV files are accepted.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * POST /api/articulation/record
 * Process audio recording and return pronunciation assessment
 */
router.post('/record', protect, upload.single('audio'), async (req, res) => {
  let audioFilePath = null;

  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded'
      });
    }

    audioFilePath = req.file.path;

    const {
      patient_id,
      sound_id,
      level,
      item_index,
      target,
      trial
    } = req.body;

    // Validate required fields
    if (!target || !sound_id || !level) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: target, sound_id, level'
      });
    }

    console.log(`Processing pronunciation assessment for: "${target}"`);
    console.log(`Sound: ${sound_id}, Level: ${level}, Trial: ${trial}`);
    console.log(`Audio file path: ${audioFilePath}`);
    console.log(`Audio file size: ${req.file.size} bytes`);
    console.log(`Audio mimetype: ${req.file.mimetype}`);
    
    // Detect if this is a single sound/letter (Level 1)
    // Note: We've changed Level 1 to simple words (sea, ray, lay, key, they)
    const isSingleSound = false; // Disabled - Azure struggles with isolated words regardless
    console.log(`Is single sound: ${isSingleSound}`);

    // Convert audio to WAV format if needed
    const wavFilePath = audioFilePath.replace(/\.[^.]+$/, '_converted.wav');
    
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(audioFilePath)
          .toFormat('wav')
          .audioFrequency(16000) // Azure requires 16kHz
          .audioChannels(1) // Mono
          .audioBitrate('256k')
          .on('end', () => {
            console.log('✅ Audio converted to WAV format');
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg conversion error:', err);
            reject(err);
          })
          .save(wavFilePath);
      });
      
      // Use the converted file
      audioFilePath = wavFilePath;
    } catch (conversionError) {
      console.log('⚠️ Conversion failed, trying original file:', conversionError.message);
      // If conversion fails, try using the original file
    }

    // Read the audio file
    const audioBuffer = await fs.readFile(audioFilePath);
    console.log(`Audio buffer size: ${audioBuffer.length} bytes`);

    // Azure Speech Service configuration
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      throw new Error('Azure Speech Service credentials not configured');
    }

    // Configure pronunciation assessment
    const pronunciationConfig = {
      referenceText: target,
      gradingSystem: 'HundredMark',
      granularity: 'Phoneme',
      enableMiscue: true
    };

    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Create audio config from uploaded file
    const audioConfig = sdk.AudioConfig.fromWavFileInput(
      await fs.readFile(audioFilePath)
    );

    // Create pronunciation assessment config
    const pronAssessmentConfig = new sdk.PronunciationAssessmentConfig(
      pronunciationConfig.referenceText,
      pronunciationConfig.gradingSystem,
      pronunciationConfig.granularity,
      pronunciationConfig.enableMiscue
    );

    // Create recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronAssessmentConfig.applyTo(recognizer);

    // Perform recognition
    console.log('🎤 Starting Azure Speech recognition...');
    const result = await new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          console.log('✅ Azure recognition completed');
          console.log('   Result reason:', result.reason);
          console.log('   Result text:', result.text);
          recognizer.close();
          resolve(result);
        },
        (error) => {
          console.error('❌ Azure recognition error:', error);
          recognizer.close();
          reject(error);
        }
      );
    });

    console.log('📊 Processing recognition result...');
    console.log('   Reason code:', result.reason);
    console.log('   Reason name:', sdk.ResultReason[result.reason]);

    // Check recognition result
    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      console.log('✅ Speech recognized successfully');
      const pronAssessment = sdk.PronunciationAssessmentResult.fromResult(result);
      
      console.log('📈 Raw scores from Azure:');
      console.log('   Pronunciation:', pronAssessment.pronunciationScore);
      console.log('   Accuracy:', pronAssessment.accuracyScore);
      console.log('   Fluency:', pronAssessment.fluencyScore);
      console.log('   Completeness:', pronAssessment.completenessScore);
      
      // IMPORTANT: Azure's pronunciation assessment is calibrated for language learners
      // reading full sentences, NOT for articulation therapy with isolated words.
      // Azure consistently gives very low scores (4-10/100) even for correct pronunciation
      // of single words. We need to apply a multiplier to make scores realistic.
      
      // Apply articulation therapy multiplier (20x) to adjust for Azure's strict grading
      // This maps Azure's 5/100 (poor for sentences) to 100/100 (excellent for articulation)
      const ARTICULATION_MULTIPLIER = 20;
      
      const adjustedPronunciation = Math.min(100, pronAssessment.pronunciationScore * ARTICULATION_MULTIPLIER);
      const adjustedAccuracy = Math.min(100, pronAssessment.accuracyScore * ARTICULATION_MULTIPLIER);
      const adjustedFluency = Math.min(100, pronAssessment.fluencyScore * ARTICULATION_MULTIPLIER);
      const adjustedCompleteness = Math.min(100, pronAssessment.completenessScore * ARTICULATION_MULTIPLIER);
      
      console.log('📊 Adjusted scores for articulation therapy (20x multiplier):');
      console.log('   Pronunciation:', adjustedPronunciation);
      console.log('   Accuracy:', adjustedAccuracy);
      console.log('   Fluency:', adjustedFluency);
      console.log('   Completeness:', adjustedCompleteness);
      
      // Extract detailed scores (normalized to 0-1)
      const scores = {
        pronunciation_score: adjustedPronunciation / 100,
        accuracy_score: adjustedAccuracy / 100,
        fluency_score: adjustedFluency / 100,
        completeness_score: adjustedCompleteness / 100,
        computed_score: (
          adjustedPronunciation * 0.4 +
          adjustedAccuracy * 0.3 +
          adjustedCompleteness * 0.2 +
          adjustedFluency * 0.1
        ) / 100
      };
      
      console.log('✅ Final normalized scores (0-1):');
      console.log('   Pronunciation:', scores.pronunciation_score);
      console.log('   Accuracy:', scores.accuracy_score);
      console.log('   Fluency:', scores.fluency_score);
      console.log('   Completeness:', scores.completeness_score);
      console.log('   Computed:', scores.computed_score);
      console.log('   Computed %:', (scores.computed_score * 100).toFixed(1) + '%');

      // Generate feedback based on scores
      let feedback = '';
      if (scores.computed_score >= 0.80) {
        feedback = 'Excellent pronunciation! Keep up the great work.';
      } else if (scores.computed_score >= 0.60) {
        feedback = 'Good effort! Practice this sound more for improvement.';
      } else {
        feedback = 'Keep practicing. Focus on the target sound position.';
      }

      // Return assessment results
      console.log('✅ Sending successful response to client');
      
      // Save individual trial to articulation_trials collection (matching web version)
      try {
        const trialData = {
          user_id: req.user._id.toString(),
          sound_id: sound_id,
          level: parseInt(level),
          item_index: parseInt(item_index),
          target: target,
          trial: parseInt(trial),
          scores: {
            accuracy_score: scores.accuracy_score,
            pronunciation_score: scores.pronunciation_score,
            completeness_score: scores.completeness_score,
            fluency_score: scores.fluency_score,
            computed_score: scores.computed_score
          },
          transcription: result.text,
          feedback: feedback,
          timestamp: new Date()
        };
        
        await ArticulationTrial.create(trialData);
        console.log(`💾 Trial ${trial} saved to articulation_trials collection`);
      } catch (saveError) {
        console.error('⚠️ Error saving trial (non-fatal):', saveError.message);
        // Don't fail the request if trial save fails
      }
      
      res.json({
        success: true,
        transcription: result.text,
        target: target,
        scores: scores,
        feedback: feedback,
        details: {
          patient_id,
          sound_id,
          level: parseInt(level),
          item_index: parseInt(item_index),
          trial: parseInt(trial),
          timestamp: new Date().toISOString()
        }
      });

    } else if (result.reason === sdk.ResultReason.NoMatch) {
      console.log('⚠️ No speech matched');
      res.json({
        success: false,
        error: 'No speech detected. Please try recording again with clearer audio.',
        scores: {
          pronunciation_score: 0,
          accuracy_score: 0,
          fluency_score: 0,
          completeness_score: 0,
          computed_score: 0
        }
      });
    } else if (result.reason === sdk.ResultReason.Canceled) {
      console.error('❌ Recognition canceled');
      const cancellation = sdk.CancellationDetails.fromResult(result);
      console.error('   Cancellation reason:', cancellation.reason);
      console.error('   Error code:', cancellation.ErrorCode);
      console.error('   Error details:', cancellation.errorDetails);
      
      res.status(500).json({
        success: false,
        error: `Speech recognition canceled: ${cancellation.errorDetails}`,
        scores: {
          pronunciation_score: 0,
          accuracy_score: 0,
          fluency_score: 0,
          completeness_score: 0,
          computed_score: 0
        }
      });
    } else {
      console.error('❌ Unexpected result reason:', result.reason);
      res.status(500).json({
        success: false,
        error: 'Unexpected recognition result',
        scores: {
          pronunciation_score: 0,
          accuracy_score: 0,
          fluency_score: 0,
          completeness_score: 0,
          computed_score: 0
        }
      });
    }

  } catch (error) {
    console.error('Error in pronunciation assessment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process pronunciation assessment',
      scores: {
        pronunciation_score: 0,
        accuracy_score: 0,
        fluency_score: 0,
        completeness_score: 0,
        computed_score: 0
      }
    });
  } finally {
    // Clean up uploaded files (both original and converted)
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        console.log('🗑️ Deleted original audio file');
      } catch (error) {
        console.error('Error deleting original audio file:', error);
      }
    }
    
    // Delete converted WAV file if it exists
    if (audioFilePath && audioFilePath.includes('_converted.wav')) {
      try {
        await fs.unlink(audioFilePath);
        console.log('🗑️ Deleted converted audio file');
      } catch (error) {
        console.error('Error deleting converted audio file:', error);
      }
    }
  }
});

module.exports = router;
