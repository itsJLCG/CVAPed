/**
 * Fluency Assessment Route
 * Uses Azure Cognitive Services Speech-to-Text for fluency analysis
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
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

/**
 * POST /api/fluency/assess
 * Assess fluency using Azure Speech-to-Text with word-level timing
 */
router.post('/assess', protect, upload.single('audio'), async (req, res) => {
  try {
    console.log('\n🎤 Processing fluency assessment...');
    
    const { target_text, expected_duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    const audioFilePath = req.file.path;
    console.log('Audio file path:', audioFilePath);
    console.log('Target text:', target_text);
    console.log('Expected duration:', expected_duration);

    // Always re-encode audio to ensure Azure-compatible WAV format
    const ext = path.extname(audioFilePath).toLowerCase();
    const wavPath = audioFilePath.replace(ext, '-converted.wav');
    
    console.log('🔄 Re-encoding audio for Azure compatibility...');
    
    await new Promise((resolve, reject) => {
      ffmpeg(audioFilePath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => {
          console.log('✅ Audio re-encoded to Azure-compatible format');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err);
          reject(err);
        })
        .save(wavPath);
    });

    // Azure Speech Config
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';
    speechConfig.requestWordLevelTimestamps();

    // Create audio config from WAV file
    const audioConfig = sdk.AudioConfig.fromWavFileInput(await fs.readFile(wavPath));
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    console.log('🎤 Starting Azure Speech recognition...');

    recognizer.recognizeOnceAsync(
      async (result) => {
        console.log('✅ Azure recognition completed');
        console.log('   Result reason:', result.reason);

        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          const transcription = result.text;
          console.log('   Transcription:', transcription);

          // Parse detailed results for word timing
          const detailResult = result.properties.getProperty(
            sdk.PropertyId.SpeechServiceResponse_JsonResult
          );
          
          const jsonResult = JSON.parse(detailResult);
          const words = [];
          const pauses = [];
          let disfluencies = 0;

          if (jsonResult.NBest && jsonResult.NBest.length > 0) {
            const nbest = jsonResult.NBest[0];
            if (nbest.Words) {
              let prevEndTime = 0;
              let prevWord = null;

              nbest.Words.forEach((wordInfo, i) => {
                const word = wordInfo.Word;
                const offset = wordInfo.Offset / 10000000; // Convert to seconds
                const duration = wordInfo.Duration / 10000000;

                words.push({
                  word: word,
                  offset: offset,
                  duration: duration
                });

                // Detect pauses (silence > 300ms)
                if (i > 0) {
                  const pauseDuration = offset - prevEndTime;
                  if (pauseDuration > 0.3) {
                    pauses.push({
                      position: i,
                      duration: pauseDuration
                    });
                  }
                }

                // Detect repetitions
                if (prevWord && word.toLowerCase() === prevWord.toLowerCase()) {
                  disfluencies++;
                }

                // Detect prolongations (word takes too long)
                const expectedDuration = word.length * 0.1;
                if (duration > expectedDuration * 1.5) {
                  disfluencies++;
                }

                prevEndTime = offset + duration;
                prevWord = word;
              });
            }
          }

          // Calculate metrics
          const totalWords = words.length || transcription.split(' ').length;
          const totalDuration = words.length > 0 
            ? words[words.length - 1].offset + words[words.length - 1].duration
            : parseFloat(expected_duration || 5);

          // Speaking rate (WPM)
          const speakingRate = Math.round((totalWords / totalDuration) * 60);

          // Pause count
          const pauseCount = pauses.length;

          // Calculate fluency score (0-100)
          let rateScore = 100;
          if (speakingRate < 80 || speakingRate > 180) {
            rateScore = Math.max(0, 100 - Math.abs(speakingRate - 120));
          }

          const pausePenalty = Math.min(30, pauseCount * 5);
          const disfluencyPenalty = Math.min(40, disfluencies * 10);

          const fluencyScore = Math.max(0, Math.min(100, rateScore - pausePenalty - disfluencyPenalty));

          // Generate feedback
          let feedback;
          if (fluencyScore >= 90) {
            feedback = 'Excellent fluency! Your speech was smooth and natural.';
          } else if (fluencyScore >= 75) {
            feedback = 'Good fluency! Keep practicing to improve smoothness.';
          } else if (fluencyScore >= 60) {
            feedback = 'Fair fluency. Try to reduce pauses and speak more steadily.';
          } else {
            feedback = 'Keep practicing. Focus on breathing and speaking slowly.';
          }

          console.log('📊 Fluency Assessment Results:');
          console.log('   Speaking Rate:', speakingRate, 'WPM');
          console.log('   Fluency Score:', fluencyScore);
          console.log('   Pauses:', pauseCount);
          console.log('   Disfluencies:', disfluencies);

          // Clean up files
          try {
            await fs.unlink(audioFilePath);
            await fs.unlink(wavPath);
            console.log('🗑️ Deleted audio files');
          } catch (cleanupErr) {
            console.warn('⚠️ Cleanup warning:', cleanupErr.message);
          }

          res.json({
            success: true,
            transcription: transcription,
            speaking_rate: speakingRate,
            fluency_score: fluencyScore,
            pause_count: pauseCount,
            disfluencies: disfluencies,
            duration: parseFloat(totalDuration.toFixed(1)),
            word_count: totalWords,
            feedback: feedback,
            pauses: pauses.slice(0, 5),
            words: words.slice(0, 20)
          });

        } else if (result.reason === sdk.ResultReason.NoMatch) {
          console.log('⚠️ No speech matched');
          
          try {
            if (audioFilePath !== wavPath && await fs.access(audioFilePath).then(() => true).catch(() => false)) {
              await fs.unlink(audioFilePath);
            }
            if (await fs.access(wavPath).then(() => true).catch(() => false)) {
              await fs.unlink(wavPath);
            }
          } catch (cleanupErr) {
            console.warn('⚠️ Cleanup warning:', cleanupErr.message);
          }

          res.json({
            success: false,
            error: 'No speech detected. Please try recording again with clearer audio.'
          });

        } else {
          console.error('❌ Recognition failed');
          
          try {
            if (audioFilePath !== wavPath && await fs.access(audioFilePath).then(() => true).catch(() => false)) {
              await fs.unlink(audioFilePath);
            }
            if (await fs.access(wavPath).then(() => true).catch(() => false)) {
              await fs.unlink(wavPath);
            }
          } catch (cleanupErr) {
            console.warn('⚠️ Cleanup warning:', cleanupErr.message);
          }

          res.json({
            success: false,
            error: 'Speech recognition failed. Please try again.'
          });
        }

        recognizer.close();
      },
      async (error) => {
        console.error('❌ Recognition error:', error);
        
        try {
          await fs.unlink(audioFilePath);
          await fs.unlink(wavPath);
        } catch (cleanupErr) {
          console.warn('⚠️ Cleanup warning:', cleanupErr.message);
        }
        
        recognizer.close();
        
        res.status(500).json({
          success: false,
          message: 'Assessment failed',
          error: error.toString()
        });
      }
    );

  } catch (error) {
    console.error('❌ Error in fluency assessment:', error);
    
    res.status(500).json({
      success: false,
      message: 'Assessment failed',
      error: error.message
    });
  }
});

module.exports = router;
