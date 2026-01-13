import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { images } from '../assets/images';
import './Header.css';

function Header({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

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
