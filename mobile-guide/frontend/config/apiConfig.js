const BASE_IP = '192.168.0.47'; // Your network IP for physical device

// Port Configuration (matches backend .env)
const PORTS = {
  MAIN_API: 5000,        // Node.js backend (auth, users)
  GAIT_ANALYSIS: 5001,   // Python Flask - Gait Analysis
  THERAPY: 5002,         // Python Flask - Therapy Exercises
};

// Constructed API URLs
export const API_CONFIG = {
  BASE_IP,
  
  // Main Node.js backend
  MAIN_API_URL: `http://${BASE_IP}:${PORTS.MAIN_API}/api`,
  
  // Gait Analysis service
  GAIT_API_URL: `http://${BASE_IP}:${PORTS.GAIT_ANALYSIS}`,
  
  // Therapy Exercises service
  THERAPY_API_URL: `http://${BASE_IP}:${PORTS.THERAPY}`,
};

// Export individual URLs for convenience
export const API_URL = `http://${BASE_IP}:${PORTS.MAIN_API}/api`;
export const GAIT_API_URL = `http://${BASE_IP}:${PORTS.GAIT_ANALYSIS}`;
export const THERAPY_API_URL = `http://${BASE_IP}:${PORTS.THERAPY}`;

// For debugging - log the current configuration
console.log('📡 API Configuration:', {
  'Main API': API_CONFIG.MAIN_API_URL,
  'Gait Analysis': API_CONFIG.GAIT_API_URL,
  'Therapy Exercises': API_CONFIG.THERAPY_API_URL,
});

export default API_CONFIG;
