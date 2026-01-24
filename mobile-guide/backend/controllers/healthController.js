const ArticulationProgress = require('../models/ArticulationProgress');
const ArticulationTrial = require('../models/ArticulationTrial');
const FluencyProgress = require('../models/FluencyProgress');
const FluencyTrial = require('../models/FluencyTrial');
const LanguageProgress = require('../models/LanguageProgress');
const LanguageTrial = require('../models/LanguageTrial');
const GaitProgress = require('../models/GaitProgress');
const ExercisePlan = require('../models/ExercisePlan');

/**
 * Get all therapy progress logs for a user
 * Fetches individual trials from trial collections for real-time activity logs
 */
exports.getUserHealthLogs = async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert ObjectId to string for matching
    const logs = [];
    const fetchAll = req.query.all === 'true'; // Check if user wants all logs

    // Fetch Articulation Trials from BOTH sources:
    // 1. Standalone ArticulationTrial collection
    const articulationTrials = await ArticulationTrial.find({ user_id: userId })
      .sort({ timestamp: -1 });
    
    // 2. Nested trials within ArticulationProgress (for s, k, l, r, th sounds)
    const articulationProgress = await ArticulationProgress.find({ user_id: userId });
    
    // Add standalone trials
    articulationTrials.forEach(trial => {
      logs.push({
        id: `articulation_${trial._id}`,
        type: 'articulation',
        therapyName: 'Articulation Therapy',
        soundId: trial.sound_id ? trial.sound_id.toUpperCase() : 'N/A',
        level: trial.level,
        target: trial.target,
        trialNumber: trial.trial,
        score: trial.scores?.computed_score || 0,
        details: {
          pronunciation: trial.scores?.pronunciation_score || 0,
          accuracy: trial.scores?.accuracy_score || 0,
          completeness: trial.scores?.completeness_score || 0,
          fluency: trial.scores?.fluency_score || 0,
          transcription: trial.transcription || ''
        },
        timestamp: trial.timestamp,
        createdAt: trial.timestamp
      });
    });

    // Add trials from ArticulationProgress nested structure
    articulationProgress.forEach(progress => {
      const soundId = progress.sound_id;
      const levels = progress.levels || {};
      
      Object.keys(levels).forEach(levelKey => {
        const level = levels[levelKey];
        const items = level.items || {};
        
        // Items are stored as object with numeric keys
        Object.keys(items).forEach(itemKey => {
          const item = items[itemKey];
          const trialDetails = item.trial_details || [];
          
          trialDetails.forEach((trial, index) => {
            logs.push({
              id: `articulation_nested_${progress._id}_${levelKey}_${itemKey}_${index}`,
              type: 'articulation',
              therapyName: 'Articulation Therapy',
              soundId: soundId ? soundId.toUpperCase() : 'N/A',
              level: parseInt(levelKey),
              target: trial.transcription || 'N/A',
              trialNumber: trial.trial || index + 1,
              score: trial.computed_score || 0,
              details: {
                pronunciation: trial.pronunciation_score || 0,
                accuracy: trial.accuracy_score || 0,
                completeness: trial.completeness_score || 0,
                fluency: trial.fluency_score || 0,
                transcription: trial.transcription || ''
              },
              timestamp: item.last_attempt || progress.updated_at,
              createdAt: progress.created_at
            });
          });
        });
      });
    });

    // Fetch Fluency Trials (individual attempts)
    const fluencyTrials = await FluencyTrial.find({ user_id: userId })
      .sort({ timestamp: -1 });
    
    fluencyTrials.forEach(trial => {
      logs.push({
        id: `fluency_${trial._id}`,
        type: 'fluency',
        therapyName: 'Fluency Therapy',
        level: trial.level,
        exerciseName: `Exercise ${trial.exercise_index}`,
        exerciseId: trial.exercise_id,
        attemptNumber: trial.exercise_index,
        score: trial.fluency_score || 0,
        completed: trial.passed || false,
        details: {
          speakingRate: trial.speaking_rate || 0,
          pauseCount: trial.pause_count || 0,
          disfluencies: trial.disfluencies || 0,
          passed: trial.passed || false
        },
        timestamp: trial.timestamp,
        createdAt: trial.timestamp
      });
    });

    // Fetch Receptive Language Trials
    const receptiveTrials = await LanguageTrial.find({ 
      user_id: userId, 
      mode: 'receptive' 
    })
      .sort({ timestamp: -1 });
    
    receptiveTrials.forEach(trial => {
      logs.push({
        id: `receptive_${trial._id}`,
        type: 'receptive',
        therapyName: 'Receptive Language',
        exerciseId: trial.exercise_id,
        exerciseIndex: trial.exercise_index,
        correct: trial.is_correct || false,
        attempts: 1,
        score: trial.score || (trial.is_correct ? 100 : 0),
        details: {
          userAnswer: trial.user_answer || '',
          transcription: trial.transcription || ''
        },
        timestamp: trial.timestamp,
        createdAt: trial.timestamp
      });
    });

    // Fetch Expressive Language Trials
    const expressiveTrials = await LanguageTrial.find({ 
      user_id: userId, 
      mode: 'expressive' 
    })
      .sort({ timestamp: -1 });
    
    expressiveTrials.forEach(trial => {
      logs.push({
        id: `expressive_${trial._id}`,
        type: 'expressive',
        therapyName: 'Expressive Language',
        exerciseId: trial.exercise_id,
        exerciseIndex: trial.exercise_index,
        correct: trial.is_correct || false,
        attempts: 1,
        score: trial.score || (trial.is_correct ? 100 : 0),
        details: {
          userAnswer: trial.user_answer || '',
          transcription: trial.transcription || ''
        },
        timestamp: trial.timestamp,
        createdAt: trial.timestamp
      });
    });

    // Fetch Gait/Physical Therapy Progress with associated exercise plans
    const gaitProgress = await GaitProgress.find({ user_id: userId })
      .sort({ created_at: -1 });
    
    // Get all exercise plans for this user to match with gait analyses
    const exercisePlans = await ExercisePlan.find({ user_id: userId })
      .select('gait_analysis_id exercises status date total_exercises exercises_completed')
      .lean();
    
    gaitProgress.forEach(progress => {
      // Calculate overall score from multiple metrics (0-100 scale)
      const metrics = progress.metrics || {};
      const gaitScore = (
        (metrics.gait_symmetry || 0) * 30 +
        (metrics.stability_score || 0) * 30 +
        (metrics.step_regularity || 0) * 20 +
        (metrics.data_quality === 'excellent' ? 20 : 
         metrics.data_quality === 'good' ? 15 :
         metrics.data_quality === 'fair' ? 10 : 5)
      );
      
      // Find associated exercise plan for this gait analysis
      const associatedPlan = exercisePlans.find(plan => 
        plan.gait_analysis_id && plan.gait_analysis_id.toString() === progress._id.toString()
      );
      
      logs.push({
        id: `gait_${progress._id}`,
        type: 'gait',
        therapyName: 'Physical Therapy - Gait Analysis',
        sessionId: progress.session_id,
        score: Math.round(gaitScore),
        metrics: {
          stepCount: metrics.step_count || 0,
          cadence: metrics.cadence || 0,
          strideLength: metrics.stride_length || 0,
          velocity: metrics.velocity || 0,
          gaitSymmetry: metrics.gait_symmetry || 0,
          stabilityScore: metrics.stability_score || 0,
          stepRegularity: metrics.step_regularity || 0,
          verticalOscillation: metrics.vertical_oscillation || 0
        },
        analysisDuration: progress.analysis_duration || 0,
        dataQuality: progress.data_quality || 'fair',
        gaitPhases: progress.gait_phases || [],
        exercisePlan: associatedPlan ? {
          planId: associatedPlan._id,
          status: associatedPlan.status,
          totalExercises: associatedPlan.total_exercises,
          completedExercises: associatedPlan.exercises_completed,
          exercises: associatedPlan.exercises,
          createdAt: associatedPlan.date
        } : null,
        timestamp: progress.created_at,
        createdAt: progress.created_at
      });
    });

    // Sort logs chronologically (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return limited or all logs based on query parameter
    const recentLogs = fetchAll ? logs : logs.slice(0, 10);
    const allLogsCount = logs.length;

    // Calculate summary statistics PER THERAPY TYPE (not combined)
    const articulationLogs = logs.filter(l => l.type === 'articulation');
    const fluencyLogs = logs.filter(l => l.type === 'fluency');
    const receptiveLogs = logs.filter(l => l.type === 'receptive');
    const expressiveLogs = logs.filter(l => l.type === 'expressive');
    const gaitLogs = logs.filter(l => l.type === 'gait');

    const summary = {
      articulation: {
        sessions: articulationLogs.length,
        averageScore: articulationLogs.length > 0
          ? (articulationLogs.reduce((sum, log) => sum + (log.score || 0), 0) / articulationLogs.length).toFixed(1)
          : '0',
        lastActivity: articulationLogs.length > 0 ? articulationLogs[0].timestamp : null
      },
      fluency: {
        sessions: fluencyLogs.length,
        averageScore: fluencyLogs.length > 0
          ? (fluencyLogs.reduce((sum, log) => sum + (log.score || 0), 0) / fluencyLogs.length).toFixed(1)
          : '0',
        lastActivity: fluencyLogs.length > 0 ? fluencyLogs[0].timestamp : null
      },
      receptive: {
        sessions: receptiveLogs.length,
        averageScore: receptiveLogs.length > 0
          ? (receptiveLogs.reduce((sum, log) => sum + (log.score || 0), 0) / receptiveLogs.length).toFixed(1)
          : '0',
        lastActivity: receptiveLogs.length > 0 ? receptiveLogs[0].timestamp : null
      },
      expressive: {
        sessions: expressiveLogs.length,
        averageScore: expressiveLogs.length > 0
          ? (expressiveLogs.reduce((sum, log) => sum + (log.score || 0), 0) / expressiveLogs.length).toFixed(1)
          : '0',
        lastActivity: expressiveLogs.length > 0 ? expressiveLogs[0].timestamp : null
      },
      gait: {
        sessions: gaitLogs.length,
        averageScore: gaitLogs.length > 0
          ? (gaitLogs.reduce((sum, log) => sum + (log.score || 0), 0) / gaitLogs.length).toFixed(1)
          : '0',
        lastActivity: gaitLogs.length > 0 ? gaitLogs[0].timestamp : null
      }
    };

    res.status(200).json({
      success: true,
      data: {
        logs: recentLogs,
        summary,
        total: allLogsCount,
        hasMore: allLogsCount > 10
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health logs',
      error: error.message
    });
  }
};

/**
 * Get health summary statistics for a user
 * Provides quick overview of user's therapy activity across all types
 */
exports.getUserHealthSummary = async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert ObjectId to string for matching

    // Fetch trial counts from all therapy types
    const [articulationCount, fluencyCount, receptiveCount, expressiveCount, gaitCount] = await Promise.all([
      ArticulationTrial.countDocuments({ user_id: userId }),
      FluencyTrial.countDocuments({ user_id: userId }),
      LanguageTrial.countDocuments({ user_id: userId, mode: 'receptive' }),
      LanguageTrial.countDocuments({ user_id: userId, mode: 'expressive' }),
      GaitProgress.countDocuments({ user_id: userId })
    ]);

    // Get latest activity dates
    const [latestArticulation, latestFluency, latestReceptive, latestExpressive, latestGait] = await Promise.all([
      ArticulationTrial.findOne({ user_id: userId }).sort({ timestamp: -1 }).select('timestamp'),
      FluencyTrial.findOne({ user_id: userId }).sort({ timestamp: -1 }).select('timestamp'),
      LanguageTrial.findOne({ user_id: userId, mode: 'receptive' }).sort({ timestamp: -1 }).select('timestamp'),
      LanguageTrial.findOne({ user_id: userId, mode: 'expressive' }).sort({ timestamp: -1 }).select('timestamp'),
      GaitProgress.findOne({ user_id: userId }).sort({ created_at: -1 }).select('created_at')
    ]);

    // Calculate average scores per therapy type
    const articulationTrials = await ArticulationTrial.find({ user_id: userId }).select('scores');
    const articulationAvg = articulationTrials.length > 0
      ? (articulationTrials.reduce((sum, t) => sum + (t.scores?.computed_score || 0), 0) / articulationTrials.length).toFixed(2)
      : 0;

    const fluencyTrials = await FluencyTrial.find({ user_id: userId }).select('fluency_score');
    const fluencyAvg = fluencyTrials.length > 0
      ? (fluencyTrials.reduce((sum, t) => sum + (t.fluency_score || 0), 0) / fluencyTrials.length).toFixed(2)
      : 0;

    const receptiveTrials = await LanguageTrial.find({ user_id: userId, mode: 'receptive' }).select('score is_correct');
    const receptiveAvg = receptiveTrials.length > 0
      ? (receptiveTrials.reduce((sum, t) => sum + (t.score || (t.is_correct ? 100 : 0)), 0) / receptiveTrials.length).toFixed(2)
      : 0;

    const expressiveTrials = await LanguageTrial.find({ user_id: userId, mode: 'expressive' }).select('score is_correct');
    const expressiveAvg = expressiveTrials.length > 0
      ? (expressiveTrials.reduce((sum, t) => sum + (t.score || (t.is_correct ? 100 : 0)), 0) / expressiveTrials.length).toFixed(2)
      : 0;

    const summary = {
      articulation: {
        total: articulationCount,
        averageScore: articulationAvg,
        lastUpdated: latestArticulation?.timestamp || null
      },
      fluency: {
        total: fluencyCount,
        averageScore: fluencyAvg,
        lastUpdated: latestFluency?.timestamp || null
      },
      receptive: {
        total: receptiveCount,
        averageScore: receptiveAvg,
        lastUpdated: latestReceptive?.timestamp || null
      },
      expressive: {
        total: expressiveCount,
        averageScore: expressiveAvg,
        lastUpdated: latestExpressive?.timestamp || null
      },
      gait: {
        total: gaitCount,
        lastUpdated: latestGait?.created_at || null
      },
      totalSessions: articulationCount + fluencyCount + receptiveCount + expressiveCount + gaitCount
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health summary',
      error: error.message
    });
  }
};
