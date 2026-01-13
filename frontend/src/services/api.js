import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (userData) => {
    const response = await api.post('/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Firebase OAuth login
  firebaseAuth: async (firebaseData) => {
    const response = await api.post('/auth/firebase', firebaseData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Complete profile after OAuth login
  completeProfile: async (profileData) => {
    const response = await api.post('/auth/complete-profile', profileData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/user/update', userData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
};

// Articulation Progress API
export const articulationService = {
  saveProgress: async (progressData) => {
    const response = await api.post('/articulation/progress', progressData);
    return response.data;
  },

  getProgress: async (soundId) => {
    const response = await api.get(`/articulation/progress/${soundId}`);
    return response.data;
  },

  getAllProgress: async () => {
    const response = await api.get('/articulation/progress/all');
    return response.data;
  },
};

// Language Therapy Progress API
export const languageService = {
  saveProgress: async (progressData) => {
    const response = await api.post('/language/progress', progressData);
    return response.data;
  },

  getProgress: async (mode) => {
    const response = await api.get(`/language/progress/${mode}`);
    return response.data;
  },

  getAllProgress: async () => {
    const response = await api.get('/language/progress/all');
    return response.data;
  },
};

// Fluency Therapy Progress API
export const fluencyService = {
  saveProgress: async (progressData) => {
    const response = await api.post('/fluency/progress', progressData);
    return response.data;
  },

  getProgress: async () => {
    const response = await api.get('/fluency/progress');
    return response.data;
  },
};

// Admin API
export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAllUsers: async (page = 1, perPage = 10, search = '') => {
    const response = await api.get('/admin/users', {
      params: { page, per_page: perPage, search }
    });
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

// Fluency Exercise CRUD API
export const fluencyExerciseService = {
  // Seed default exercises
  seedDefault: async () => {
    const response = await api.post('/fluency-exercises/seed');
    return response.data;
  },

  // Get all exercises (for therapists - includes inactive)
  getAll: async () => {
    const response = await api.get('/fluency-exercises');
    return response.data;
  },

  // Get only active exercises (for patients)
  getActive: async () => {
    const response = await api.get('/fluency-exercises/active');
    return response.data;
  },

  // Get available orders for a level
  getAvailableOrders: async (level) => {
    const response = await api.get(`/fluency-exercises/available-orders?level=${level}`);
    return response.data;
  },

  // Create new exercise
  create: async (exerciseData) => {
    const response = await api.post('/fluency-exercises', exerciseData);
    return response.data;
  },

  // Update exercise
  update: async (exerciseId, exerciseData) => {
    const response = await api.put(`/fluency-exercises/${exerciseId}`, exerciseData);
    return response.data;
  },

  // Delete exercise
  delete: async (exerciseId) => {
    const response = await api.delete(`/fluency-exercises/${exerciseId}`);
    return response.data;
  },

  // Toggle active status
  toggleActive: async (exerciseId) => {
    const response = await api.patch(`/fluency-exercises/${exerciseId}/toggle-active`);
    return response.data;
  },
};

// Language Exercise CRUD API
export const languageExerciseService = {
  // Seed default exercises
  seedDefault: async () => {
    const response = await api.post('/language-exercises/seed');
    return response.data;
  },

  // Get all exercises for a mode (for therapists - includes inactive)
  getAll: async (mode = 'expressive') => {
    const response = await api.get(`/language-exercises?mode=${mode}`);
    return response.data;
  },

  // Get only active exercises for a mode (for patients)
  getActive: async (mode = 'expressive') => {
    const response = await api.get(`/language-exercises/active?mode=${mode}`);
    return response.data;
  },

  // Create new exercise
  create: async (exerciseData) => {
    const response = await api.post('/language-exercises', exerciseData);
    return response.data;
  },

  // Update exercise
  update: async (exerciseId, exerciseData) => {
    const response = await api.put(`/language-exercises/${exerciseId}`, exerciseData);
    return response.data;
  },

  // Delete exercise
  delete: async (exerciseId) => {
    const response = await api.delete(`/language-exercises/${exerciseId}`);
    return response.data;
  },

  // Toggle active status
  toggleActive: async (exerciseId) => {
    const response = await api.patch(`/language-exercises/${exerciseId}/toggle-active`);
    return response.data;
  },
};

// Receptive Language Exercise Service
export const receptiveExerciseService = {
  // Seed default exercises
  seedDefault: async () => {
    const response = await api.post('/receptive-exercises/seed');
    return response.data;
  },

  // Get all exercises (for therapists - includes inactive)
  getAll: async () => {
    const response = await api.get('/receptive-exercises');
    return response.data;
  },

  // Get only active exercises (for patients)
  getActive: async () => {
    const response = await api.get('/receptive-exercises/active');
    return response.data;
  },

  // Get available orders for a level
  getAvailableOrders: async (level) => {
    const response = await api.get(`/receptive-exercises/available-orders?level=${level}`);
    return response.data;
  },

  // Create new exercise
  create: async (exerciseData) => {
    const response = await api.post('/receptive-exercises', exerciseData);
    return response.data;
  },

  // Update exercise
  update: async (exerciseId, exerciseData) => {
    const response = await api.put(`/receptive-exercises/${exerciseId}`, exerciseData);
    return response.data;
  },

  // Delete exercise
  delete: async (exerciseId) => {
    const response = await api.delete(`/receptive-exercises/${exerciseId}`);
    return response.data;
  },

  // Toggle active status
  toggleActive: async (exerciseId) => {
    const response = await api.patch(`/receptive-exercises/${exerciseId}/toggle-active`);
    return response.data;
  },

  // Delete all exercises
  deleteAll: async () => {
    const response = await api.delete('/receptive-exercises/delete-all');
    return response.data;
  },
};

// Articulation Exercise Service (CRUD for therapist dashboard)
export const articulationExerciseService = {
  seedDefault: async () => {
    const response = await api.post('/articulation/exercises/seed');
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/articulation/exercises/');
    return response.data;
  },
  
  getActive: async (soundId) => {
    const response = await api.get(`/articulation/exercises/active/${soundId}`);
    return response.data;
  },
  
  getAvailableOrders: async (soundId, level) => {
    const response = await api.get(`/articulation/exercises/available-orders?sound_id=${soundId}&level=${level}`);
    return response.data;
  },
  
  create: async (exerciseData) => {
    const response = await api.post('/articulation/exercises/', exerciseData);
    return response.data;
  },
  
  update: async (exerciseId, exerciseData) => {
    const response = await api.put(`/articulation/exercises/${exerciseId}`, exerciseData);
    return response.data;
  },
  
  delete: async (exerciseId) => {
    const response = await api.delete(`/articulation/exercises/${exerciseId}`);
    return response.data;
  },
  
  toggleActive: async (exerciseId) => {
    const response = await api.put(`/articulation/exercises/${exerciseId}/toggle`);
    return response.data;
  },
  
  deleteAll: async () => {
    const response = await api.delete('/articulation/exercises/all');
    return response.data;
  }
};

// Health Service
export const healthService = {
  getLogs: async (limit = 50, all = false) => {
    const params = all ? { all: 'true' } : { limit };
    const response = await api.get('/health/logs', { params });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/health/summary');
    return response.data;
  },

  // Prediction endpoints (from mobile backend - may need to be implemented)
  getArticulationPredictions: async () => {
    try {
      const response = await api.get('/articulation/predict-mastery');
      return response.data;
    } catch (error) {
      console.log('Articulation predictions not available');
      return null;
    }
  },

  getFluencyPrediction: async () => {
    try {
      const response = await api.get('/fluency/predict-mastery');
      return response.data;
    } catch (error) {
      console.log('Fluency prediction not available');
      return null;
    }
  },

  getReceptivePrediction: async () => {
    try {
      const response = await api.get('/receptive/predict-mastery');
      return response.data;
    } catch (error) {
      console.log('Receptive prediction not available');
      return null;
    }
  },

  getExpressivePrediction: async () => {
    try {
      const response = await api.get('/expressive/predict-mastery');
      return response.data;
    } catch (error) {
      console.log('Expressive prediction not available');
      return null;
    }
  },

  getOverallSpeechPrediction: async () => {
    try {
      const response = await api.get('/overall-speech/predict-mastery');
      return response.data;
    } catch (error) {
      console.log('Overall speech prediction not available');
      return null;
    }
  }
};

// Prescriptive Analysis Service
export const prescriptionService = {
  // Get complete prescriptive analysis
  getAnalysis: async () => {
    const response = await api.get('/prescriptive');
    return response.data;
  },

  // Get therapy priorities
  getPriorities: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.priorities;
  },

  // Get weekly schedule
  getSchedule: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.weekly_schedule;
  },

  // Get bottleneck analysis
  getBottlenecks: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.bottleneck_analysis;
  },

  // Get recommendations
  getRecommendations: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.recommendations;
  },

  // Get insights
  getInsights: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.insights;
  }
};

// Prediction Service (XGBoost ML Models)
export const predictionService = {
  // Get all predictions
  getAllPredictions: async () => {
    const response = await api.get('/predictions');
    return response.data;
  },

  // Get articulation prediction for specific sound
  getArticulationPrediction: async (soundId) => {
    const response = await api.get(`/predictions/articulation/${soundId}`);
    return response.data;
  },

  // Get fluency prediction
  getFluencyPrediction: async () => {
    const response = await api.get('/predictions/fluency');
    return response.data;
  },

  // Get receptive language prediction
  getReceptivePrediction: async () => {
    const response = await api.get('/predictions/language/receptive');
    return response.data;
  },

  // Get expressive language prediction
  getExpressivePrediction: async () => {
    const response = await api.get('/predictions/language/expressive');
    return response.data;
  },

  // Get overall speech improvement prediction
  getOverallPrediction: async () => {
    const response = await api.get('/predictions/overall');
    return response.data;
  }
};

export default api;
