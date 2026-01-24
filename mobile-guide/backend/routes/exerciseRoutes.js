const express = require('express');
const router = express.Router();
const ExercisePlan = require('../models/ExercisePlan');
const GaitProgress = require('../models/GaitProgress');
const axios = require('axios');

// Get Python exercise service URL from environment
const EXERCISE_SERVICE_URL = process.env.THERAPY_URL || 'http://127.0.0.1:5002';

/**
 * GET /api/exercises/can-analyze
 * Check if user can perform gait analysis today
 */
router.get('/can-analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('\n=== CAN ANALYZE CHECK ===');
    console.log('User ID:', userId);
    
    const canAnalyze = await ExercisePlan.canPerformGaitAnalysis(userId);
    
    console.log('Result:', JSON.stringify(canAnalyze, null, 2));
    console.log('=========================\n');
    
    res.json({
      success: true,
      ...canAnalyze
    });
    
  } catch (error) {
    console.error('Error checking gait analysis permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check permission',
      message: error.message
    });
  }
});

/**
 * POST /api/exercises/recommend
 * Generate exercise recommendations based on detected problems
 * 
 * Body: {
 *   user_id,
 *   gait_analysis_id,
 *   detected_problems: [...],
 *   user_profile: {...}
 * }
 */
router.post('/recommend', async (req, res) => {
  try {
    const { user_id, gait_analysis_id, detected_problems, user_profile } = req.body;
    
    console.log('\n' + '='.repeat(50));
    console.log('EXERCISE RECOMMENDATION REQUEST');
    console.log('='.repeat(50));
    console.log('User ID:', user_id);
    console.log('Gait Analysis ID:', gait_analysis_id);
    console.log('Problems detected:', detected_problems.length);
    console.log('User profile:', user_profile ? 'Provided' : 'Not provided');
    
    // Call Python exercise recommender service
    const pythonResponse = await axios.post(
      `${EXERCISE_SERVICE_URL}/api/exercises/recommend`,
      {
        detected_problems,
        user_profile
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    const recommendations = pythonResponse.data;
    
    console.log('\nRecommendation status:', recommendations.status);
    console.log('Total exercises:', recommendations.total_exercises);
    console.log('Daily time commitment:', recommendations.daily_time_commitment?.average_minutes_per_day, 'minutes');
    
    if (recommendations.status === 'no_problems') {
      console.log('✓ No problems detected - no exercise plan needed');
      console.log('='.repeat(50));
      
      return res.json({
        success: true,
        status: 'no_problems',
        message: recommendations.message,
        maintenance_exercises: recommendations.maintenance_exercises
      });
    }
    
    // Save exercise plan to MongoDB
    const today = new Date();
    
    // Mark any existing active plan as completed
    await ExercisePlan.updateMany(
      { user_id, status: 'active' },
      { status: 'completed' }
    );
    
    // Create new exercise plan
    const exercisePlan = new ExercisePlan({
      user_id,
      date: today,
      gait_analysis_id,
      detected_problems,
      exercises: recommendations.recommendations.flatMap(rec => 
        rec.exercises.map(ex => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          description: ex.description,
          target_metric: ex.target_metric,
          problem_targeted: rec.problem,
          duration: ex.duration,
          frequency: ex.frequency,
          sets: ex.sets,
          reps: ex.reps,
          difficulty: ex.difficulty,
          equipment: ex.equipment,
          instructions: ex.instructions,
          precautions: ex.precautions,
          benefits: ex.benefits,
          video_url: ex.video_url,
          expected_improvement: ex.expected_improvement,
          completed: false
        }))
      ),
      total_exercises: recommendations.recommendations.reduce((sum, rec) => sum + rec.exercises.length, 0),
      weekly_schedule: recommendations.weekly_schedule,
      estimated_timeline: recommendations.estimated_timeline,
      daily_time_commitment: recommendations.daily_time_commitment,
      user_profile,
      status: 'active'
    });
    
    await exercisePlan.save();
    
    console.log('✓ Exercise plan created and saved');
    console.log('Plan ID:', exercisePlan._id);
    console.log('='.repeat(50));
    
    res.json({
      success: true,
      status: 'exercises_recommended',
      exercise_plan_id: exercisePlan._id,
      recommendations: recommendations.recommendations,
      weekly_schedule: recommendations.weekly_schedule,
      estimated_timeline: recommendations.estimated_timeline,
      daily_time_commitment: recommendations.daily_time_commitment,
      total_exercises: exercisePlan.total_exercises,
      message: 'Exercise plan created successfully'
    });
    
  } catch (error) {
    console.error('Error generating exercise recommendations:', error.message);
    console.error('Stack:', error.stack);
    console.log('='.repeat(50));
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/exercises/today/:userId
 * Get today's exercise plan for user
 */
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const plan = await ExercisePlan.getTodaysPlan(userId);
    
    if (!plan) {
      return res.json({
        success: true,
        has_plan: false,
        message: 'No exercise plan for today. Complete a gait analysis first.'
      });
    }
    
    res.json({
      success: true,
      has_plan: true,
      plan: {
        _id: plan._id,
        date: plan.date,
        status: plan.status,
        total_exercises: plan.total_exercises,
        exercises_completed: plan.exercises_completed,
        completion_percentage: plan.completion_percentage,
        all_exercises_completed: plan.all_exercises_completed,
        can_retest_gait: plan.can_retest_gait,
        gait_retested: plan.gait_retested,
        exercises: plan.exercises,
        weekly_schedule: plan.weekly_schedule,
        estimated_timeline: plan.estimated_timeline,
        daily_time_commitment: plan.daily_time_commitment,
        detected_problems: plan.detected_problems
      }
    });
    
  } catch (error) {
    console.error('Error fetching today\'s plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan',
      message: error.message
    });
  }
});

/**
 * GET /api/exercises/plan/:planId
 * Get specific exercise plan by ID
 */
router.get('/plan/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await ExercisePlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Exercise plan not found'
      });
    }
    
    res.json({
      success: true,
      plan: {
        _id: plan._id,
        date: plan.date,
        status: plan.status,
        total_exercises: plan.total_exercises,
        exercises_completed: plan.exercises_completed,
        completion_percentage: plan.completion_percentage,
        all_exercises_completed: plan.all_exercises_completed,
        can_retest_gait: plan.can_retest_gait,
        gait_retested: plan.gait_retested,
        exercises: plan.exercises,
        weekly_schedule: plan.weekly_schedule,
        estimated_timeline: plan.estimated_timeline,
        daily_time_commitment: plan.daily_time_commitment,
        detected_problems: plan.detected_problems
      }
    });
    
  } catch (error) {
    console.error('Error fetching plan by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan',
      message: error.message
    });
  }
});

/**
 * POST /api/exercises/complete/:planId/:exerciseId
 * Mark a specific exercise as complete
 * 
 * Body: {
 *   difficulty_rating: 1-5,
 *   notes: string
 * }
 */
router.post('/complete/:planId/:exerciseId', async (req, res) => {
  try {
    const { planId, exerciseId } = req.params;
    const { difficulty_rating, notes } = req.body;
    
    const plan = await ExercisePlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Exercise plan not found'
      });
    }
    
    const success = plan.markExerciseComplete(exerciseId, difficulty_rating, notes);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Exercise not found or already completed'
      });
    }
    
    await plan.save();
    
    console.log(`✓ Exercise ${exerciseId} marked complete`);
    console.log(`  Progress: ${plan.exercises_completed}/${plan.total_exercises} (${plan.completion_percentage.toFixed(1)}%)`);
    
    if (plan.all_exercises_completed) {
      console.log('  🎉 All exercises completed! Gait retest unlocked.');
    }
    
    res.json({
      success: true,
      message: 'Exercise marked as complete',
      exercises_completed: plan.exercises_completed,
      total_exercises: plan.total_exercises,
      completion_percentage: plan.completion_percentage,
      all_exercises_completed: plan.all_exercises_completed,
      can_retest_gait: plan.can_retest_gait
    });
    
  } catch (error) {
    console.error('Error marking exercise complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark exercise complete',
      message: error.message
    });
  }
});

/**
 * POST /api/exercises/undo/:planId/:exerciseId
 * Undo exercise completion (mark as incomplete)
 */
router.post('/undo/:planId/:exerciseId', async (req, res) => {
  try {
    const { planId, exerciseId } = req.params;
    
    const plan = await ExercisePlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Exercise plan not found'
      });
    }
    
    const exercise = plan.exercises.find(ex => ex.exercise_id === exerciseId);
    
    if (!exercise) {
      return res.status(400).json({
        success: false,
        error: 'Exercise not found'
      });
    }
    
    if (!exercise.completed) {
      return res.status(400).json({
        success: false,
        error: 'Exercise is not completed'
      });
    }
    
    // Mark as incomplete
    exercise.completed = false;
    exercise.completed_at = null;
    exercise.difficulty_rating = null;
    exercise.notes = null;
    
    // Recalculate completion stats
    plan.exercises_completed = plan.exercises.filter(ex => ex.completed).length;
    plan.completion_percentage = (plan.exercises_completed / plan.total_exercises) * 100;
    plan.all_exercises_completed = plan.exercises_completed === plan.total_exercises;
    plan.can_retest_gait = plan.all_exercises_completed && !plan.gait_retested;
    
    await plan.save();
    
    console.log(`✓ Exercise ${exerciseId} marked incomplete`);
    console.log(`  Progress: ${plan.exercises_completed}/${plan.total_exercises} (${plan.completion_percentage.toFixed(1)}%)`);
    
    res.json({
      success: true,
      message: 'Exercise marked as incomplete',
      exercises_completed: plan.exercises_completed,
      total_exercises: plan.total_exercises,
      completion_percentage: plan.completion_percentage,
      all_exercises_completed: plan.all_exercises_completed,
      can_retest_gait: plan.can_retest_gait
    });
    
  } catch (error) {
    console.error('Error undoing exercise completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to undo exercise completion',
      message: error.message
    });
  }
});

/**
 * POST /api/exercises/complete-all/:planId
 * Mark all exercises as complete (for testing/demo)
 */
router.post('/complete-all/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await ExercisePlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Exercise plan not found'
      });
    }
    
    plan.markAllComplete();
    await plan.save();
    
    console.log('✓ All exercises marked complete (demo mode)');
    console.log('  Gait retest unlocked');
    
    res.json({
      success: true,
      message: 'All exercises marked as complete',
      exercises_completed: plan.exercises_completed,
      total_exercises: plan.total_exercises,
      completion_percentage: 100,
      all_exercises_completed: true,
      can_retest_gait: true
    });
    
  } catch (error) {
    console.error('Error marking all exercises complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all exercises complete',
      message: error.message
    });
  }
});

/**
 * GET /api/exercises/history/:userId
 * Get exercise history for user (last 30 days)
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    
    const plans = await ExercisePlan.find({
      user_id: userId,
      date: { $gte: since }
    })
    .sort({ date: -1 })
    .select('date status total_exercises exercises_completed completion_percentage estimated_timeline')
    .lean();
    
    res.json({
      success: true,
      history: plans
    });
    
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

module.exports = router;
