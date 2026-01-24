const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const axios = require('axios');

const THERAPY_SERVICE_URL = process.env.THERAPY_URL || 'http://192.168.1.33:5002';

/**
 * POST /api/speech/predict-overall-improvement
 * Predict overall speech therapy improvement combining all therapy types
 */
router.post('/predict-overall-improvement', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    console.log(`🎯 Requesting overall speech improvement prediction for user ${userId}`);

    // Forward request to therapy-exercises service (Python/XGBoost)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/speech/predict-overall-improvement`;
    
    const response = await axios.post(therapyUrl, {
      user_id: userId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Overall speech improvement prediction received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting overall speech improvement prediction:', error.message);
    
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
        message: 'Failed to get overall speech improvement prediction',
        error: error.message
      });
    }
  }
});

/**
 * POST /api/speech/train-overall-model
 * Train/retrain the overall speech improvement prediction model (Admin only)
 */
router.post('/train-overall-model', protect, async (req, res) => {
  try {
    // Check if user is admin or therapist
    if (!['admin', 'therapist'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Admin or therapist access required.'
      });
    }

    console.log(`🤖 Requesting overall speech model training (initiated by ${req.user.email})`);

    // Forward request to therapy-exercises service
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/speech/train-overall-model`;
    
    const response = await axios.post(therapyUrl, {}, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Overall speech model training complete`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error training overall speech model:', error.message);
    
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
        message: 'Failed to train overall speech model',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/speech/overall-model-status
 * Get status of the overall speech improvement prediction model
 */
router.get('/overall-model-status', protect, async (req, res) => {
  try {
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/speech/overall-model-status`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error checking overall speech model status:', error.message);
    
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
 * GET /api/speech/prescriptive/:userId
 * Get intelligent therapy prioritization and sequencing recommendations
 * Uses Decision Rules + Graph-Based Recommendations
 */
router.get('/prescriptive/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Verify user can only access their own data unless admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Can only access your own therapy prioritization.'
      });
    }

    console.log(`🎯 Requesting prescriptive analysis for user ${userId}`);

    // Forward request to therapy-exercises service (Python Decision Rules + Graph-Based)
    const therapyUrl = `${THERAPY_SERVICE_URL}/api/therapy/prescriptive/${userId}`;
    
    const response = await axios.get(therapyUrl, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    console.log(`✅ Prescriptive analysis received from therapy service`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error requesting prescriptive analysis:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Prescriptive analysis service is not available. Please make sure therapy service is running on port 5002.',
        error: 'PRESCRIPTIVE_SERVICE_UNAVAILABLE'
      });
    }

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get prescriptive analysis',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/speech/prescriptive/priorities/:userId
 * Get just the priority list without full analysis
 */
router.get('/prescriptive/priorities/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const therapyUrl = `${THERAPY_SERVICE_URL}/api/therapy/prescriptive/priorities/${userId}`;
    const response = await axios.get(therapyUrl);
    
    res.json(response.data);

  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * GET /api/speech/prescriptive/schedule/:userId
 * Get weekly practice schedule
 */
router.get('/prescriptive/schedule/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const therapyUrl = `${THERAPY_SERVICE_URL}/api/therapy/prescriptive/schedule/${userId}`;
    const response = await axios.get(therapyUrl);
    
    res.json(response.data);

  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * GET /api/speech/prescriptive/insights/:userId
 * Get recommendations and insights only
 */
router.get('/prescriptive/insights/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const therapyUrl = `${THERAPY_SERVICE_URL}/api/therapy/prescriptive/insights/${userId}`;
    const response = await axios.get(therapyUrl);
    
    res.json(response.data);

  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * GET /api/speech/prescriptive/bottlenecks/:userId
 * Get bottleneck analysis (which therapy is blocking others)
 */
router.get('/prescriptive/bottlenecks/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const therapyUrl = `${THERAPY_SERVICE_URL}/api/therapy/prescriptive/bottlenecks/${userId}`;
    const response = await axios.get(therapyUrl);
    
    res.json(response.data);

  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = router;
