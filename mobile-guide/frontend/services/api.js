import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/apiConfig';

// Base URLs from centralized configuration
const API_URL = API_CONFIG.MAIN_API_URL;
const THERAPY_API_URL = API_CONFIG.THERAPY_API_URL;

// Create axios instance for main API
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for therapy exercises API
const therapyApi = axios.create({
  baseURL: THERAPY_API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add token to therapy API requests
therapyApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Therapy API Interceptor - Token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Authorization header set');
      } else {
        console.log('❌ No token found in AsyncStorage');
      }
    } catch (error) {
      console.error('❌ Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify OTP
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Resend OTP
  resendOTP: async (email) => {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get current user
  getMe: async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Google Sign In
  googleSignIn: async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Complete Profile (for Google sign-in users)
  completeProfile: async (token, profileData) => {
    try {
      const response = await api.post('/auth/complete-profile', profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update Profile
  updateProfile: async (token, profileData) => {
    try {
      console.log('API: Updating profile with token:', token ? 'Token exists' : 'No token');
      console.log('API: Profile data:', profileData);
      
      const response = await api.put('/auth/updateprofile', profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('API: Update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Update error:', error.response?.data || error);
      throw error.response?.data || { message: error.message || 'Unknown error' };
    }
  },

  // Update Diagnostic Status
  updateDiagnosticStatus: async (hasInitialDiagnostic) => {
    try {
      const response = await api.put('/auth/diagnostic-status', { hasInitialDiagnostic });
      if (response.data.data) {
        // Update stored user data with new diagnostic status
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          userData.hasInitialDiagnostic = response.data.data.hasInitialDiagnostic;
          userData.diagnosticStatusUpdatedAt = response.data.data.diagnosticStatusUpdatedAt;
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        }
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message || 'Unknown error' };
    }
  },
};

// Admin API endpoints
export const adminAPI = {
  // Get admin statistics
  getStats: async (token) => {
    try {
      const response = await api.get('/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all users
  getAllUsers: async (token) => {
    try {
      const response = await api.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user
  updateUser: async (token, userId, updates) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete user
  deleteUser: async (token, userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Therapy Exercises API endpoints
export const therapyAPI = {
  // Fluency Exercises
  fluency: {
    getAll: async () => {
      try {
        const response = await therapyApi.get('/api/fluency-exercises');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    getAllProgress: async () => {
      try {
        const response = await api.get('/fluency/progress/all');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    seed: async () => {
      try {
        const response = await therapyApi.post('/api/fluency-exercises/seed', {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    create: async (exerciseData) => {
      try {
        const response = await therapyApi.post('/api/fluency-exercises', exerciseData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    update: async (exerciseId, updates) => {
      try {
        const response = await therapyApi.put(`/api/fluency-exercises/${exerciseId}`, updates);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    delete: async (exerciseId) => {
      try {
        const response = await therapyApi.delete(`/api/fluency-exercises/${exerciseId}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    toggleActive: async (exerciseId) => {
      try {
        const response = await therapyApi.patch(`/api/fluency-exercises/${exerciseId}/toggle-active`, {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },

  // Language Exercises (Expressive)
  language: {
    getAll: async () => {
      try {
        const response = await therapyApi.get('/api/language-exercises');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    getAllProgress: async () => {
      try {
        const response = await api.get('/expressive/progress/all');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    seed: async () => {
      try {
        const response = await therapyApi.post('/api/language-exercises/seed', {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    create: async (exerciseData) => {
      try {
        const response = await therapyApi.post('/api/language-exercises', exerciseData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    update: async (exerciseId, updates) => {
      try {
        const response = await therapyApi.put(`/api/language-exercises/${exerciseId}`, updates);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    delete: async (exerciseId) => {
      try {
        const response = await therapyApi.delete(`/api/language-exercises/${exerciseId}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    toggleActive: async (exerciseId) => {
      try {
        const response = await therapyApi.patch(`/api/language-exercises/${exerciseId}/toggle-active`, {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },

  // Receptive Exercises
  receptive: {
    getAll: async () => {
      try {
        const response = await therapyApi.get('/api/receptive-exercises');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    getAllProgress: async () => {
      try {
        const response = await api.get('/receptive/progress/all');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    seed: async () => {
      try {
        const response = await therapyApi.post('/api/receptive-exercises/seed', {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    create: async (exerciseData) => {
      try {
        const response = await therapyApi.post('/api/receptive-exercises', exerciseData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    update: async (exerciseId, updates) => {
      try {
        const response = await therapyApi.put(`/api/receptive-exercises/${exerciseId}`, updates);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    delete: async (exerciseId) => {
      try {
        const response = await therapyApi.delete(`/api/receptive-exercises/${exerciseId}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    toggleActive: async (exerciseId) => {
      try {
        const response = await therapyApi.patch(`/api/receptive-exercises/${exerciseId}/toggle-active`, {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },

  // Articulation Exercises
  articulation: {
    getAll: async () => {
      try {
        const response = await therapyApi.get('/api/articulation-exercises');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    getAllProgress: async () => {
      try {
        const response = await api.get('/articulation/progress/all');
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    seed: async () => {
      try {
        const response = await therapyApi.post('/api/articulation-exercises/seed', {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    create: async (exerciseData) => {
      try {
        const response = await therapyApi.post('/api/articulation-exercises', exerciseData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    update: async (exerciseId, updates) => {
      try {
        const response = await therapyApi.put(`/api/articulation-exercises/${exerciseId}`, updates);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    delete: async (exerciseId) => {
      try {
        const response = await therapyApi.delete(`/api/articulation-exercises/${exerciseId}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
    toggleActive: async (exerciseId) => {
      try {
        const response = await therapyApi.patch(`/api/articulation-exercises/${exerciseId}/toggle-active`, {});
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },
};

// Health API endpoints
export const healthAPI = {
  // Get all health logs for user
  getLogs: async () => {
    try {
      const response = await api.get('/health/logs');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all health logs (full history)
  getLogsAll: async () => {
    try {
      const response = await api.get('/health/logs?all=true');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get health summary
  getSummary: async () => {
    try {
      const response = await api.get('/health/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Gait Exercise API endpoints
export const exerciseApi = {
  // Check if user can perform gait analysis today
  canAnalyze: async (userId) => {
    try {
      const response = await api.get(`/exercises/can-analyze/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get today's exercise plan
  getTodaysPlan: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(userStr);
      const userId = userData.user?._id || userData._id;
      
      const response = await api.get(`/exercises/today/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get specific exercise plan by ID
  getPlanById: async (planId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await api.get(`/exercises/plan/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark single exercise as complete
  markExerciseComplete: async (planId, exerciseId, difficultyRating, notes) => {
    try {
      const response = await api.post(`/exercises/complete/${planId}/${exerciseId}`, {
        difficulty_rating: difficultyRating,
        notes: notes
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark all exercises as complete (demo mode)
  markAllExercisesComplete: async (planId) => {
    try {
      const response = await api.post(`/exercises/complete-all/${planId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Undo exercise completion
  undoExerciseComplete: async (planId, exerciseId) => {
    try {
      const response = await api.post(`/exercises/undo/${planId}/${exerciseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get exercise history
  getHistory: async (days = 30) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(userStr);
      const userId = userData.user?._id || userData._id;
      
      const response = await api.get(`/exercises/history/${userId}?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Success Story API endpoints
export const successStoryAPI = {
  // Get all success stories (public)
  getAll: async () => {
    try {
      const response = await api.get('/success-stories');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create success story (therapist only)
  create: async (formData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      console.log('📤 Sending to:', `${API_URL}/success-stories`);
      console.log('📦 FormData has images:', formData._parts ? formData._parts.length : 'unknown');
      
      const response = await api.post('/success-stories', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for image uploads
      });
      return response.data;
    } catch (error) {
      console.error('❌ API Error:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error code:', error.code);
      throw error.response?.data || error.message;
    }
  },

  // Update success story (therapist only)
  update: async (storyId, formData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.put(`/success-stories/${storyId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for image uploads
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete success story (therapist only)
  delete: async (storyId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.delete(`/success-stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Remove image from success story (therapist only)
  removeImage: async (storyId, imagePath) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.post(`/success-stories/${storyId}/remove-image`, 
        { imagePath },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Therapist API
export const therapistAPI = {
  // Get reports data
  getReports: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/therapist/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Appointment Service - matches web's appointmentService structure
export const appointmentAPI = {
  // ==================== THERAPIST ENDPOINTS ====================
  therapist: {
    // Get all appointments for therapist
    getAppointments: async (filters = {}) => {
      try {
        const params = new URLSearchParams();
        if (filters.date) params.append('date', filters.date);
        if (filters.status) params.append('status', filters.status);
        if (filters.therapy_type) params.append('therapy_type', filters.therapy_type);

        const response = await api.get(`/therapist/appointments?${params.toString()}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Get unassigned appointments
    getUnassignedAppointments: async (therapyType = null) => {
      try {
        const params = therapyType ? `?therapy_type=${therapyType}` : '';
        const response = await api.get(`/therapist/appointments/unassigned${params}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Assign therapist to appointment
    assignToAppointment: async (appointmentId) => {
      try {
        const response = await api.put(`/therapist/appointments/${appointmentId}/assign`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Create a new appointment
    createAppointment: async (appointmentData) => {
      try {
        const response = await api.post('/therapist/appointments', appointmentData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Update an appointment
    updateAppointment: async (appointmentId, updateData) => {
      try {
        const response = await api.put(`/therapist/appointments/${appointmentId}`, updateData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Cancel/delete an appointment
    cancelAppointment: async (appointmentId) => {
      try {
        const response = await api.delete(`/therapist/appointments/${appointmentId}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Search patients by name
    searchPatients: async (query, limit = 10) => {
      try {
        const response = await api.get(`/therapist/patients/search?query=${encodeURIComponent(query)}&limit=${limit}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },

  // ==================== PATIENT ENDPOINTS ====================
  patient: {
    // Get all appointments for patient
    getAppointments: async (status = null) => {
      try {
        const params = status ? `?status=${status}` : '';
        const response = await api.get(`/patient/appointments${params}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Book a new appointment
    bookAppointment: async (appointmentData) => {
      try {
        const response = await api.post('/patient/appointments/book', appointmentData);
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },

    // Cancel an appointment
    cancelAppointment: async (appointmentId, reason = '') => {
      try {
        const response = await api.put(`/patient/appointments/${appointmentId}/cancel`, { reason });
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    },
  },

  // ==================== SHARED ENDPOINTS ====================
  getAvailableTherapists: async (therapyType = null) => {
    try {
      const params = therapyType ? `?therapy_type=${therapyType}` : '';
      const response = await api.get(`/therapists/available${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Diagnostic Comparison Service
// Mirrors web's diagnosticComparisonService (facility vs at-home comparison)
export const diagnosticComparisonAPI = {
  // Therapist: Create a facility diagnostic for a patient
  createDiagnostic: async (diagnosticData) => {
    try {
      const response = await api.post('/therapist/diagnostics', diagnosticData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Therapist: Get all facility diagnostics for a patient
  getDiagnostics: async (userId) => {
    try {
      const response = await api.get(`/therapist/diagnostics/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Therapist: Update a facility diagnostic
  updateDiagnostic: async (diagnosticId, updateData) => {
    try {
      const response = await api.put(`/therapist/diagnostics/${diagnosticId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Therapist: Delete a facility diagnostic
  deleteDiagnostic: async (diagnosticId) => {
    try {
      const response = await api.delete(`/therapist/diagnostics/${diagnosticId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Therapist: Get comparison data (facility vs home) for a patient
  getComparison: async (userId, diagnosticId = null) => {
    try {
      const params = diagnosticId ? `?diagnostic_id=${diagnosticId}` : '';
      const response = await api.get(`/therapist/diagnostics/${userId}/comparison${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Therapist: Get comparison history (all diagnostics with scores for trend chart)
  getComparisonHistory: async (userId) => {
    try {
      const response = await api.get(`/therapist/diagnostics/${userId}/comparison-history`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Patient: Get own comparison (read-only)
  getMyComparison: async () => {
    try {
      const response = await api.get('/diagnostic-comparison');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default {
  ...api,
  baseURL: THERAPY_API_URL, // Export base URL for manual fetch calls
  therapyAPI,
  adminAPI,
  authAPI,
  healthAPI,
  exerciseApi,
  successStoryAPI,
  therapistAPI,
  appointmentAPI,
  diagnosticComparisonAPI
};
