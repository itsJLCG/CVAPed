import React from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './TherapyPage.css';

function PhysicalTherapy({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="therapy-page">
      {/* Header */}
      <header className="therapy-page-header">
        <div className="therapy-page-header-container">
          <div className="therapy-page-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="therapy-page-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="therapy-page-header-text" />
          </div>
          <div className="therapy-page-nav">
            <button onClick={() => navigate('/therapy-selection')} className="therapy-page-nav-btn">
              Change Therapy
            </button>
            <button onClick={handleLogout} className="therapy-page-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="therapy-page-main">
        <div className="therapy-page-container">
          <div className="therapy-page-header-section">
            <div className="therapy-page-icon">🏃</div>
            <h1 className="therapy-page-title">Physical Therapy</h1>
            <p className="therapy-page-subtitle">
              Restore movement, reduce pain, and improve your physical function
            </p>
          </div>

          <div className="therapy-page-content">
            <div className="therapy-page-card">
              <h2>Welcome to Physical Therapy Services</h2>
              <p>
                Our physical therapy program is designed to help you recover from injuries, 
                manage chronic conditions, and enhance your overall mobility and quality of life.
              </p>
            </div>

            <div className="therapy-page-features">
              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">💪</div>
                <h3>Strength Building</h3>
                <p>Targeted exercises to rebuild muscle strength and endurance</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">🎯</div>
                <h3>Pain Management</h3>
                <p>Techniques to reduce and manage chronic or acute pain</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">🔄</div>
                <h3>Mobility Restoration</h3>
                <p>Improve range of motion and functional movement</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">⚡</div>
                <h3>Injury Recovery</h3>
                <p>Comprehensive rehabilitation programs for faster recovery</p>
              </div>
            </div>

            <div className="therapy-page-cta">
              <button className="therapy-page-cta-btn">Schedule an Appointment</button>
              <button className="therapy-page-cta-btn secondary">View My Sessions</button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="therapy-page-footer">
        <div className="therapy-page-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default PhysicalTherapy;
