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

  getAllUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Therapy data endpoints
  getArticulationData: async () => {
    const response = await api.get('/admin/therapies/articulation');
    return response.data;
  },

  getLanguageData: async (mode) => {
    const response = await api.get(`/admin/therapies/language/${mode}`);
    return response.data;
  },

  getFluencyData: async () => {
    const response = await api.get('/admin/therapies/fluency');
    return response.data;
  },

  getPhysicalData: async () => {
    const response = await api.get('/admin/therapies/physical');
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

export default api;
