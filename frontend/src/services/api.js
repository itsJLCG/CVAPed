import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiGetCache = new Map();

const API_CACHE_TTL = {
  SHORT: 30 * 1000,
  DASHBOARD: 60 * 1000,
  REPORTS: 2 * 60 * 1000,
  ANALYTICS: 5 * 60 * 1000,
  PREDICTIONS: 3 * 60 * 1000,
  STORIES: 10 * 60 * 1000,
};

const getCurrentUserId = () => {
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return 'anonymous';
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?._id || parsedUser?.id || parsedUser?.email || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const serializeCacheParams = (params = {}) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(entries);
};

const buildCacheKey = ({ scope = 'user', endpoint, params = {} }) => {
  const scopeKey = scope === 'public' ? 'public' : `user:${getCurrentUserId()}`;
  return `${scopeKey}:${endpoint}:${serializeCacheParams(params)}`;
};

const invalidateApiCache = (predicate) => {
  Array.from(apiGetCache.keys()).forEach((key) => {
    if (predicate(key)) {
      apiGetCache.delete(key);
    }
  });
};

const invalidateApiCacheByEndpoints = (endpoints = [], scope = 'all') => {
  invalidateApiCache((key) => {
    const scopeMatches = scope === 'all' || key.startsWith(`${scope}:`);
    return scopeMatches && endpoints.some((endpoint) => key.includes(`:${endpoint}:`));
  });
};

const clearAllApiCache = () => {
  apiGetCache.clear();
};

const cachedGet = async (endpoint, { params = {}, ttlMs = API_CACHE_TTL.SHORT, scope = 'user' } = {}) => {
  const cacheKey = buildCacheKey({ scope, endpoint, params });
  const now = Date.now();
  const existingEntry = apiGetCache.get(cacheKey);

  if (existingEntry?.data && existingEntry.expiresAt > now) {
    return existingEntry.data;
  }

  if (existingEntry?.promise) {
    return existingEntry.promise;
  }

  const requestPromise = api.get(endpoint, { params })
    .then((response) => {
      const data = response.data;
      apiGetCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    })
    .catch((error) => {
      apiGetCache.delete(cacheKey);
      throw error;
    });

  apiGetCache.set(cacheKey, {
    promise: requestPromise,
    expiresAt: now + ttlMs,
  });

  return requestPromise;
};

export const clearStoredAuth = async () => {
  clearAllApiCache();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('therapistToken');
  localStorage.removeItem('therapistUser');
  localStorage.removeItem('facilityMode');

  try {
    const { firebaseSignOut } = await import('./firebase');
    await firebaseSignOut();
  } catch (error) {
    console.error('Error signing out from Firebase:', error);
  }
};

export const wakeBackend = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
    });
  } catch (error) {
    // Keep this silent because warm-up failure should not block app usage.
  }
};

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

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to token expiration or invalid token
    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.error;
      const serverMessage = error.response?.data?.message;
      
      // Handle session expiration (our new 3-hour expiry)
      if (errorCode === 'session/expired' || serverMessage?.includes('Session expired')) {
        await clearStoredAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      // Handle Firebase token errors
      if (errorCode?.includes('auth/') || 
          errorMessage === 'TOKEN_EXPIRED' || 
          errorMessage === 'TOKEN_INVALID' ||
          errorMessage === 'TOKEN_REVOKED' ||
          errorCode === 'session/invalid' ||
          errorCode === 'session/missing' ||
          serverMessage === 'Token is invalid!' ||
          serverMessage === 'Token validation failed!' ||
          serverMessage === 'Token is missing!') {
        await clearStoredAuth();

        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (userData) => {
    clearAllApiCache();
    const response = await api.post('/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (credentials) => {
    clearAllApiCache();
    const response = await api.post('/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  facilityLogin: async (credentials) => {
    clearAllApiCache();
    const therapistToken = localStorage.getItem('therapistToken');
    const response = await api.post('/facility-login', {
      ...credentials,
      therapistToken,
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  facilityFirebaseAuth: async (firebaseData) => {
    clearAllApiCache();
    const therapistToken = localStorage.getItem('therapistToken');
    const response = await api.post('/facility-firebase-auth', {
      ...firebaseData,
      therapistToken,
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Firebase OAuth login
  firebaseAuth: async (firebaseData) => {
    clearAllApiCache();
    const response = await api.post('/auth/firebase', firebaseData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Complete profile after OAuth login
  completeProfile: async (profileData) => {
    clearAllApiCache();
    const response = await api.post('/auth/complete-profile', profileData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await clearStoredAuth();
  },

  getCurrentUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/user');
    return { data: response.data.user };
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  updateProfile: async (userData) => {
    invalidateApiCacheByEndpoints(['/user'], 'user');
    const response = await api.put('/user/update', userData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  updateDiagnosticStatus: async (hasInitialDiagnostic) => {
    invalidateApiCacheByEndpoints(['/user', '/diagnostic-comparison'], 'user');
    const response = await api.put('/user/diagnostic-status', { hasInitialDiagnostic });
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  saveDiagnosticData: async (diagnosticData) => {
    invalidateApiCacheByEndpoints(['/user', '/diagnostic-comparison'], 'user');
    const response = await api.put('/user/diagnostic-data', diagnosticData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
};

// Articulation Progress API
export const articulationService = {
  saveProgress: async (progressData) => {
    invalidateApiCacheByEndpoints(['/health/logs', '/health/summary', '/predictions', '/prescriptive'], 'user');
    const response = await api.post('/articulation/progress', progressData);
    return response.data;
  },

  getProgress: async (soundId) => {
    return cachedGet(`/articulation/progress/${soundId}`, { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  getAllProgress: async () => {
    return cachedGet('/articulation/progress/all', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },
};

// Language Therapy Progress API
export const languageService = {
  saveProgress: async (progressData) => {
    invalidateApiCacheByEndpoints(['/health/logs', '/health/summary', '/predictions', '/prescriptive'], 'user');
    const response = await api.post('/language/progress', progressData);
    return response.data;
  },

  getProgress: async (mode) => {
    return cachedGet(`/language/progress/${mode}`, { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  getAllProgress: async () => {
    return cachedGet('/language/progress/all', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },
};

// Fluency Therapy Progress API
export const fluencyService = {
  saveProgress: async (progressData) => {
    invalidateApiCacheByEndpoints(['/health/logs', '/health/summary', '/predictions', '/prescriptive'], 'user');
    const response = await api.post('/fluency/progress', progressData);
    return response.data;
  },

  getProgress: async () => {
    return cachedGet('/fluency/progress', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },
};

// Admin API
export const adminService = {
  getStats: async () => {
    return cachedGet('/admin/stats', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  getAllUsers: async (page = 1, perPage = 10, search = '') => {
    return cachedGet('/admin/users', {
      params: { page, per_page: perPage, search },
      ttlMs: API_CACHE_TTL.SHORT,
    });
  },

  updateUserRole: async (userId, role) => {
    invalidateApiCacheByEndpoints(['/admin/stats', '/admin/users'], 'user');
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId) => {
    invalidateApiCacheByEndpoints(['/admin/stats', '/admin/users'], 'user');
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

// Therapist API
export const therapistService = {
  getStats: async (days = 30) => {
    return cachedGet('/therapist/stats', {
      params: { days: days === 'all' ? 'all' : days },
      ttlMs: API_CACHE_TTL.DASHBOARD,
    });
  },

  getPhysicalPatients: async () => {
    return cachedGet('/therapist/physical/patients', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  getRecommendedExercises: async () => {
    return cachedGet('/therapist/physical/recommended-exercises', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  updateRecommendedExercise: async (planId, updateData) => {
    invalidateApiCacheByEndpoints(['/therapist/physical/recommended-exercises', '/therapist/physical/patients', '/therapist/stats'], 'user');
    const response = await api.patch(`/therapist/physical/recommended-exercises/${planId}`, updateData);
    return response.data;
  },

  updateRecommendedExercisesVisibility: async (visibility, planIds = []) => {
    invalidateApiCacheByEndpoints(['/therapist/physical/recommended-exercises', '/therapist/physical/patients', '/therapist/stats'], 'user');
    const response = await api.patch('/therapist/physical/recommended-exercises/visibility', {
      visibility,
      plan_ids: planIds,
    });
    return response.data;
  },

  getReports: async () => {
    return cachedGet('/therapist/reports', { ttlMs: API_CACHE_TTL.REPORTS });
  },

  getArticulationAnalytics: async (days = 30) => {
    return cachedGet('/therapist/analytics/articulation', {
      params: { days: days === 'all' ? 'all' : days },
      ttlMs: API_CACHE_TTL.ANALYTICS,
    });
  },

  getFluencyAnalytics: async (days = 30) => {
    return cachedGet('/therapist/analytics/fluency', {
      params: { days: days === 'all' ? 'all' : days },
      ttlMs: API_CACHE_TTL.ANALYTICS,
    });
  },

  getLanguageAnalytics: async (days = 30) => {
    return cachedGet('/therapist/analytics/language', {
      params: { days: days === 'all' ? 'all' : days },
      ttlMs: API_CACHE_TTL.ANALYTICS,
    });
  },

  getSpeechEntries: async (days = 30, limit = 500) => {
    return cachedGet('/therapist/speech/entries', {
      params: {
        days: days === 'all' ? 'all' : days,
        limit,
      },
      ttlMs: API_CACHE_TTL.DASHBOARD,
    });
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
    return cachedGet('/health/logs', { params, ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  getSummary: async () => {
    return cachedGet('/health/summary', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  // Prediction endpoints
  getArticulationPredictions: async () => {
    try {
      const response = await predictionService.getAllPredictions();
      return response?.predictions?.articulation || null;
    } catch (error) {
      console.log('Articulation predictions not available');
      return null;
    }
  },

  getFluencyPrediction: async () => {
    try {
      const response = await predictionService.getAllPredictions();
      return response?.predictions?.fluency || null;
    } catch (error) {
      console.log('Fluency prediction not available');
      return null;
    }
  },

  getReceptivePrediction: async () => {
    try {
      const response = await predictionService.getAllPredictions();
      return response?.predictions?.receptive || null;
    } catch (error) {
      console.log('Receptive prediction not available');
      return null;
    }
  },

  getExpressivePrediction: async () => {
    try {
      const response = await predictionService.getAllPredictions();
      return response?.predictions?.expressive || null;
    } catch (error) {
      console.log('Expressive prediction not available');
      return null;
    }
  },

  getOverallSpeechPrediction: async () => {
    try {
      const response = await predictionService.getAllPredictions();
      return response?.predictions?.overall || null;
    } catch (error) {
      console.log('Overall speech prediction not available');
      return null;
    }
  },

  // Gait analysis endpoints
  getGaitHistory: async (limit = 50) => {
    try {
      return cachedGet('/hardware/gait/history', {
        params: { limit },
        ttlMs: API_CACHE_TTL.DASHBOARD,
      });
    } catch (error) {
      console.log('Gait history not available');
      return null;
    }
  }
};

// Prescriptive Analysis Service
export const prescriptionService = {
  // Get complete prescriptive analysis (Speech Therapy)
  getAnalysis: async () => {
    return cachedGet('/prescriptive', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get complete gait prescriptive analysis (Physical Therapy)
  getGaitAnalysis: async () => {
    return cachedGet('/prescriptive/gait', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get therapy priorities
  getPriorities: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.priorities;
  },

  // Get gait priorities
  getGaitPriorities: async () => {
    const data = await prescriptionService.getGaitAnalysis();
    return data.analysis.priorities;
  },

  // Get weekly schedule
  getSchedule: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.weekly_schedule;
  },

  // Get gait weekly schedule
  getGaitSchedule: async () => {
    const data = await prescriptionService.getGaitAnalysis();
    return data.analysis.weekly_schedule;
  },

  // Get bottleneck analysis
  getBottlenecks: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.bottleneck_analysis;
  },

  // Get gait bottleneck analysis
  getGaitBottlenecks: async () => {
    const data = await prescriptionService.getGaitAnalysis();
    return data.analysis.bottleneck_analysis;
  },

  // Get recommendations
  getRecommendations: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.recommendations;
  },

  // Get gait recommendations
  getGaitRecommendations: async () => {
    const data = await prescriptionService.getGaitAnalysis();
    return data.analysis.recommendations;
  },

  // Get insights
  getInsights: async () => {
    const data = await prescriptionService.getAnalysis();
    return data.analysis.insights;
  },

  // Get gait insights
  getGaitInsights: async () => {
    const data = await prescriptionService.getGaitAnalysis();
    return data.analysis.insights;
  }
};

// Prediction Service (XGBoost ML Models)
export const predictionService = {
  // Get all predictions
  getAllPredictions: async () => {
    return cachedGet('/predictions', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get articulation prediction for specific sound
  getArticulationPrediction: async (soundId) => {
    return cachedGet(`/predictions/articulation/${soundId}`, { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get fluency prediction
  getFluencyPrediction: async () => {
    return cachedGet('/predictions/fluency', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get receptive language prediction
  getReceptivePrediction: async () => {
    return cachedGet('/predictions/language/receptive', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get expressive language prediction
  getExpressivePrediction: async () => {
    return cachedGet('/predictions/language/expressive', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  },

  // Get overall speech improvement prediction
  getOverallPrediction: async () => {
    return cachedGet('/predictions/overall', { ttlMs: API_CACHE_TTL.PREDICTIONS });
  }
};

// Success Stories Service
export const successStoryService = {
  // Get all success stories
  getAll: async () => {
    return cachedGet('/success-stories', { ttlMs: API_CACHE_TTL.STORIES, scope: 'public' });
  },

  // Create a new success story
  create: async (formData) => {
    invalidateApiCacheByEndpoints(['/success-stories'], 'public');
    const response = await api.post('/success-stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update an existing success story
  update: async (storyId, formData) => {
    invalidateApiCacheByEndpoints(['/success-stories'], 'public');
    const response = await api.put(`/success-stories/${storyId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete a success story
  delete: async (storyId) => {
    invalidateApiCacheByEndpoints(['/success-stories'], 'public');
    const response = await api.delete(`/success-stories/${storyId}`);
    return response.data;
  },

  // Remove an image from a success story
  removeImage: async (storyId, imagePath) => {
    invalidateApiCacheByEndpoints(['/success-stories'], 'public');
    const response = await api.post(`/success-stories/${storyId}/remove-image`, {
      imagePath,
    });
    return response.data;
  },
};

// Appointment Service
export const appointmentService = {
  // Therapist Endpoints
  therapist: {
    // Get all appointments for therapist
    getAppointments: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.status) params.append('status', filters.status);
      if (filters.therapy_type) params.append('therapy_type', filters.therapy_type);
      
      return cachedGet('/therapist/appointments', {
        params: Object.fromEntries(params.entries()),
        ttlMs: API_CACHE_TTL.DASHBOARD,
      });
    },

    // Get unassigned appointments
    getUnassignedAppointments: async (therapyType = null) => {
      return cachedGet('/therapist/appointments/unassigned', {
        params: therapyType ? { therapy_type: therapyType } : {},
        ttlMs: API_CACHE_TTL.DASHBOARD,
      });
    },

    // Assign therapist to appointment
    assignToAppointment: async (appointmentId) => {
      invalidateApiCacheByEndpoints(['/therapist/appointments', '/therapist/appointments/unassigned', '/therapist/stats'], 'user');
      const response = await api.put(`/therapist/appointments/${appointmentId}/assign`);
      return response.data;
    },

    // Create a new appointment
    createAppointment: async (appointmentData) => {
      invalidateApiCacheByEndpoints(['/therapist/appointments', '/therapist/appointments/unassigned', '/therapist/stats'], 'user');
      const response = await api.post('/therapist/appointments', appointmentData);
      return response.data;
    },

    // Update an appointment
    updateAppointment: async (appointmentId, updateData) => {
      invalidateApiCacheByEndpoints(['/therapist/appointments', '/therapist/appointments/unassigned', '/therapist/stats'], 'user');
      const response = await api.put(`/therapist/appointments/${appointmentId}`, updateData);
      return response.data;
    },

    // Cancel/delete an appointment
    cancelAppointment: async (appointmentId) => {
      invalidateApiCacheByEndpoints(['/therapist/appointments', '/therapist/appointments/unassigned', '/therapist/stats'], 'user');
      const response = await api.delete(`/therapist/appointments/${appointmentId}`);
      return response.data;
    },

    // Search patients by name
    searchPatients: async (query, limit = 10, signal) => {
      const config = signal ? { signal } : {};
      const response = await api.get(`/therapist/patients/search?query=${encodeURIComponent(query)}&limit=${limit}`, config);
      return response.data;
    },
  },

  // Patient Endpoints
  patient: {
    // Get all appointments for patient
    getAppointments: async (status = null) => {
      return cachedGet('/patient/appointments', {
        params: status ? { status } : {},
        ttlMs: API_CACHE_TTL.DASHBOARD,
      });
    },

    // Book a new appointment
    bookAppointment: async (appointmentData) => {
      invalidateApiCacheByEndpoints(['/patient/appointments', '/appointments/availability'], 'user');
      const response = await api.post('/patient/appointments/book', appointmentData);
      return response.data;
    },

    // Cancel an appointment
    cancelAppointment: async (appointmentId, reason = '') => {
      invalidateApiCacheByEndpoints(['/patient/appointments', '/appointments/availability'], 'user');
      const response = await api.put(`/patient/appointments/${appointmentId}/cancel`, { reason });
      return response.data;
    },
  },

  // Shared Endpoints
  getAvailableTherapists: async (therapyType = null) => {
    return cachedGet('/therapists/available', {
      params: therapyType ? { therapy_type: therapyType } : {},
      ttlMs: API_CACHE_TTL.DASHBOARD,
    });
  },

  checkAvailability: async (therapistId, date) => {
    return cachedGet('/appointments/availability', {
      params: { therapist_id: therapistId, date },
      ttlMs: API_CACHE_TTL.SHORT,
    });
  },
};

// Diagnostic Comparison Service
export const diagnosticComparisonService = {
  // Therapist: Create a facility diagnostic for a patient
  createDiagnostic: async (diagnosticData) => {
    invalidateApiCacheByEndpoints(['/therapist/diagnostics', '/diagnostic-comparison'], 'user');
    const response = await api.post('/therapist/diagnostics', diagnosticData);
    return response.data;
  },

  // Therapist: Get all facility diagnostics for a patient
  getDiagnostics: async (userId) => {
    return cachedGet(`/therapist/diagnostics/${userId}`, { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  // Therapist: Update a facility diagnostic
  updateDiagnostic: async (diagnosticId, updateData) => {
    invalidateApiCacheByEndpoints(['/therapist/diagnostics', '/diagnostic-comparison'], 'user');
    const response = await api.put(`/therapist/diagnostics/${diagnosticId}`, updateData);
    return response.data;
  },

  // Therapist: Delete a facility diagnostic
  deleteDiagnostic: async (diagnosticId) => {
    invalidateApiCacheByEndpoints(['/therapist/diagnostics', '/diagnostic-comparison'], 'user');
    const response = await api.delete(`/therapist/diagnostics/${diagnosticId}`);
    return response.data;
  },

  // Therapist: Get comparison data (facility vs home) for a patient
  getComparison: async (userId, diagnosticId = null) => {
    return cachedGet(`/therapist/diagnostics/${userId}/comparison`, {
      params: diagnosticId ? { diagnostic_id: diagnosticId } : {},
      ttlMs: API_CACHE_TTL.DASHBOARD,
    });
  },

  // Therapist: Get comparison history (all diagnostics with scores for trend chart)
  getComparisonHistory: async (userId) => {
    return cachedGet(`/therapist/diagnostics/${userId}/comparison-history`, { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  // Patient: Get own comparison (read-only)
  getMyComparison: async () => {
    return cachedGet('/diagnostic-comparison', { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  // Therapist: Get patient's self-reported diagnostic wizard data
  getPatientSelfReport: async (userId) => {
    return cachedGet(`/therapist/patients/${userId}/self-report`, { ttlMs: API_CACHE_TTL.DASHBOARD });
  },

  // Therapist: Get all patients who completed the pre-evaluation wizard
  getAllCompletedEvaluations: async () => {
    return cachedGet('/therapist/patients/completed-evaluation', { ttlMs: API_CACHE_TTL.REPORTS });
  },
};

export const detectionProblemsService = {
  getAll: async () => {
    const response = await api.get('/physical/detection-problems');
    return response.data;
  },
  create: async (data) => {
    invalidateApiCacheByEndpoints(['/physical/detection-problems'], 'user');
    const response = await api.post('/physical/detection-problems', data);
    return response.data;
  },
  update: async (id, data) => {
    invalidateApiCacheByEndpoints(['/physical/detection-problems'], 'user');
    const response = await api.put(`/physical/detection-problems/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    invalidateApiCacheByEndpoints(['/physical/detection-problems'], 'user');
    const response = await api.delete(`/physical/detection-problems/${id}`);
    return response.data;
  },
  toggle: async (id) => {
    invalidateApiCacheByEndpoints(['/physical/detection-problems'], 'user');
    const response = await api.patch(`/physical/detection-problems/${id}/toggle`);
    return response.data;
  },
  seed: async () => {
    invalidateApiCacheByEndpoints(['/physical/detection-problems'], 'user');
    const response = await api.post('/physical/detection-problems/seed');
    return response.data;
  },
};

export const exerciseRecommendationsService = {
  getAll: async () => {
    const response = await api.get('/physical/exercise-recommendations');
    return response.data;
  },
  create: async (data) => {
    invalidateApiCacheByEndpoints(['/physical/exercise-recommendations'], 'user');
    const response = await api.post('/physical/exercise-recommendations', data);
    return response.data;
  },
  update: async (id, data) => {
    invalidateApiCacheByEndpoints(['/physical/exercise-recommendations'], 'user');
    const response = await api.put(`/physical/exercise-recommendations/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    invalidateApiCacheByEndpoints(['/physical/exercise-recommendations'], 'user');
    const response = await api.delete(`/physical/exercise-recommendations/${id}`);
    return response.data;
  },
  toggle: async (id) => {
    invalidateApiCacheByEndpoints(['/physical/exercise-recommendations'], 'user');
    const response = await api.patch(`/physical/exercise-recommendations/${id}/toggle`);
    return response.data;
  },
  seed: async () => {
    invalidateApiCacheByEndpoints(['/physical/exercise-recommendations'], 'user');
    const response = await api.post('/physical/exercise-recommendations/seed');
    return response.data;
  },
};

export default api;
