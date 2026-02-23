import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTherapyCategory } from './TherapyCategoryContext';
import { images } from '../assets/images';
import './Header.css';
import audioManager from '../services/audioManager';
import { authService } from '../services/api';

function Header({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCategory } = useTherapyCategory();

  const handleLogout = async () => {
    audioManager.stopAll();
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    onLogout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Show Prediction and Prescription only when a category is selected
  const showPredictionPrescription = selectedCategory !== null;

  return (
    <header className="app-header">
      <div className="app-header-container">
        <div className="app-logo-group">
          <img src={images.logo} alt="CVAPed Logo" className="app-header-logo" />
          <img src={images.cvacareText} alt="CVAPed" className="app-header-text" />
        </div>
        
        <nav className="app-nav">
          <button 
            onClick={() => navigate('/therapy-selection')} 
            className={`nav-btn ${isActive('/therapy-selection') ? 'active' : ''}`}
          >
            Therapies
          </button>
          <button 
            onClick={() => navigate('/health-logs')} 
            className={`nav-btn ${isActive('/health-logs') ? 'active' : ''}`}
          >
            Health Logs
          </button>
          <button 
            onClick={() => navigate('/appointments')} 
            className={`nav-btn ${isActive('/appointments') ? 'active' : ''}`}
          >
            Appointments
          </button>
          {showPredictionPrescription && (
            <>
              <button 
                onClick={() => navigate('/prediction')} 
                className={`nav-btn ${isActive('/prediction') ? 'active' : ''}`}
              >
                Prediction
              </button>
              <button 
                onClick={() => navigate('/prescription')} 
                className={`nav-btn ${isActive('/prescription') ? 'active' : ''}`}
              >
                Prescription
              </button>
            </>
          )}
          <button 
            onClick={() => navigate('/profile')} 
            className={`nav-btn ${isActive('/profile') ? 'active' : ''}`}
          >
            My Profile
          </button>
          <button onClick={handleLogout} className="nav-btn logout-btn">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
