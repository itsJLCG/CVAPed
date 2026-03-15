import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
      
      // Handle Firebase token errors
      if (errorCode?.includes('auth/') || 
          errorMessage === 'TOKEN_EXPIRED' || 
          errorMessage === 'TOKEN_INVALID' ||
          errorMessage === 'TOKEN_REVOKED') {
        
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Sign out from Firebase
        try {
          const { firebaseSignOut } = await import('./firebase');
          await firebaseSignOut();
        } catch (err) {
          console.error('Error signing out from Firebase:', err);
        }
        
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

  facilityLogin: async (credentials) => {
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

  logout: async () => {
    // Clear localStorage first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any cached Firebase tokens
    try {
      const { firebaseSignOut } = await import('./firebase');
      await firebaseSignOut();
    } catch (error) {
      console.error('Error signing out from Firebase:', error);
    }
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
    const response = await api.put('/user/update', userData);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  updateDiagnosticStatus: async (hasInitialDiagnostic) => {
    const response = await api.put('/user/diagnostic-status', { hasInitialDiagnostic });
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  saveDiagnosticData: async (diagnosticData) => {
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

// Therapist API
export const therapistService = {
  getStats: async (days = 30) => {
    const response = await api.get('/therapist/stats', {
      params: { days: days === 'all' ? 'all' : days }
    });
    return response.data;
  },

  getPhysicalPatients: async () => {
    const response = await api.get('/therapist/physical/patients');
    return response.data;
  },

  getReports: async () => {
    const response = await api.get('/therapist/reports');
    return response.data;
  },

  getArticulationAnalytics: async (days = 30) => {
    const response = await api.get('/therapist/analytics/articulation', {
      params: { days: days === 'all' ? 'all' : days }
    });
    return response.data;
  },

  getFluencyAnalytics: async (days = 30) => {
    const response = await api.get('/therapist/analytics/fluency', {
      params: { days: days === 'all' ? 'all' : days }
    });
    return response.data;
  },

  getLanguageAnalytics: async (days = 30) => {
    const response = await api.get('/therapist/analytics/language', {
      params: { days: days === 'all' ? 'all' : days }
    });
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
  },

  // Gait analysis endpoints
  getGaitHistory: async (limit = 50) => {
    try {
      const response = await api.get('/hardware/gait/history', { 
        params: { limit } 
      });
      return response.data;
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
    const response = await api.get('/prescriptive');
    return response.data;
  },

  // Get complete gait prescriptive analysis (Physical Therapy)
  getGaitAnalysis: async () => {
    const response = await api.get('/prescriptive/gait');
    return response.data;
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

// Success Stories Service
export const successStoryService = {
  // Get all success stories
  getAll: async () => {
    const response = await api.get('/success-stories');
    return response.data;
  },

  // Create a new success story
  create: async (formData) => {
    const response = await api.post('/success-stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update an existing success story
  update: async (storyId, formData) => {
    const response = await api.put(`/success-stories/${storyId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete a success story
  delete: async (storyId) => {
    const response = await api.delete(`/success-stories/${storyId}`);
    return response.data;
  },

  // Remove an image from a success story
  removeImage: async (storyId, imagePath) => {
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
      
      const response = await api.get(`/therapist/appointments?${params.toString()}`);
      return response.data;
    },

    // Get unassigned appointments
    getUnassignedAppointments: async (therapyType = null) => {
      const params = therapyType ? `?therapy_type=${therapyType}` : '';
      const response = await api.get(`/therapist/appointments/unassigned${params}`);
      return response.data;
    },

    // Assign therapist to appointment
    assignToAppointment: async (appointmentId) => {
      const response = await api.put(`/therapist/appointments/${appointmentId}/assign`);
      return response.data;
    },

    // Create a new appointment
    createAppointment: async (appointmentData) => {
      const response = await api.post('/therapist/appointments', appointmentData);
      return response.data;
    },

    // Update an appointment
    updateAppointment: async (appointmentId, updateData) => {
      const response = await api.put(`/therapist/appointments/${appointmentId}`, updateData);
      return response.data;
    },

    // Cancel/delete an appointment
    cancelAppointment: async (appointmentId) => {
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
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/patient/appointments${params}`);
      return response.data;
    },

    // Book a new appointment
    bookAppointment: async (appointmentData) => {
      const response = await api.post('/patient/appointments/book', appointmentData);
      return response.data;
    },

    // Cancel an appointment
    cancelAppointment: async (appointmentId, reason = '') => {
      const response = await api.put(`/patient/appointments/${appointmentId}/cancel`, { reason });
      return response.data;
    },
  },

  // Shared Endpoints
  getAvailableTherapists: async (therapyType = null) => {
    const params = therapyType ? `?therapy_type=${therapyType}` : '';
    const response = await api.get(`/therapists/available${params}`);
    return response.data;
  },

  checkAvailability: async (therapistId, date) => {
    const response = await api.get(`/appointments/availability?therapist_id=${therapistId}&date=${date}`);
    return response.data;
  },
};

// Diagnostic Comparison Service
export const diagnosticComparisonService = {
  // Therapist: Create a facility diagnostic for a patient
  createDiagnostic: async (diagnosticData) => {
    const response = await api.post('/therapist/diagnostics', diagnosticData);
    return response.data;
  },

  // Therapist: Get all facility diagnostics for a patient
  getDiagnostics: async (userId) => {
    const response = await api.get(`/therapist/diagnostics/${userId}`);
    return response.data;
  },

  // Therapist: Update a facility diagnostic
  updateDiagnostic: async (diagnosticId, updateData) => {
    const response = await api.put(`/therapist/diagnostics/${diagnosticId}`, updateData);
    return response.data;
  },

  // Therapist: Delete a facility diagnostic
  deleteDiagnostic: async (diagnosticId) => {
    const response = await api.delete(`/therapist/diagnostics/${diagnosticId}`);
    return response.data;
  },

  // Therapist: Get comparison data (facility vs home) for a patient
  getComparison: async (userId, diagnosticId = null) => {
    const params = diagnosticId ? `?diagnostic_id=${diagnosticId}` : '';
    const response = await api.get(`/therapist/diagnostics/${userId}/comparison${params}`);
    return response.data;
  },

  // Therapist: Get comparison history (all diagnostics with scores for trend chart)
  getComparisonHistory: async (userId) => {
    const response = await api.get(`/therapist/diagnostics/${userId}/comparison-history`);
    return response.data;
  },

  // Patient: Get own comparison (read-only)
  getMyComparison: async () => {
    const response = await api.get('/diagnostic-comparison');
    return response.data;
  },

  // Therapist: Get patient's self-reported diagnostic wizard data
  getPatientSelfReport: async (userId) => {
    const response = await api.get(`/therapist/patients/${userId}/self-report`);
    return response.data;
  },

  // Therapist: Get all patients who completed the pre-evaluation wizard
  getAllCompletedEvaluations: async () => {
    const response = await api.get('/therapist/patients/completed-evaluation');
    return response.data;
  },
};

export default api;
