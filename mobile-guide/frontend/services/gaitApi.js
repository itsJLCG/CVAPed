import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/apiConfig';

const API_URL = API_CONFIG.MAIN_API_URL;

// Create axios instance for gait analysis
const gaitApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for analysis
});

// Add token to requests if available
gaitApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from AsyncStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gait Analysis API endpoints
export const gaitAnalysisAPI = {
  /**
   * Health check for gait analysis service
   */
  healthCheck: async () => {
    try {
      const response = await gaitApi.get('/gait/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Analyze complete gait session
   * @param {Object} data - Sensor data
   * @param {Array} data.accelerometer - Array of {x, y, z, timestamp} readings
   * @param {Array} data.gyroscope - Array of {x, y, z, timestamp} readings
   * @param {string} data.sessionId - Session ID (optional)
   */
  analyzeGait: async (data) => {
    try {
      const response = await gaitApi.post('/gait/analyze', {
        accelerometer: data.accelerometer,
        gyroscope: data.gyroscope,
        session_id: data.sessionId || `session_${Date.now()}`,
      });
      return response.data;
    } catch (error) {
      console.error('Gait analysis failed:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Real-time gait analysis for streaming data
   * @param {Object} data - Single sensor reading
   * @param {Object} data.accelerometer - Single {x, y, z, timestamp} reading
   * @param {Object} data.gyroscope - Single {x, y, z, timestamp} reading
   */
  realtimeAnalysis: async (data) => {
    try {
      const response = await gaitApi.post('/gait/realtime', {
        accelerometer: data.accelerometer,
        gyroscope: data.gyroscope,
      });
      return response.data;
    } catch (error) {
      console.error('Real-time analysis failed:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get user's gait analysis history
   * @param {number} limit - Number of records to fetch (default: 10)
   */
  getUserHistory: async (limit = 10) => {
    try {
      const response = await gaitApi.get('/gait/history', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch history:', error);
      throw error.response?.data || error.message;
    }
  },
};

export default gaitAnalysisAPI;
