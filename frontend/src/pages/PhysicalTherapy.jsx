import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './TherapyPage.css';

function PhysicalTherapy({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="therapy-page">
      {/* Header */}
      <Header onLogout={onLogout} />

      {/* Main Content */}
      <main className="therapy-page-main">
        <div className="therapy-page-container">
          <div className="therapy-page-header-section">
            <div className="therapy-page-icon">🚶</div>
            <h1 className="therapy-page-title">Physical Therapy</h1>
            <p className="therapy-page-subtitle">
              Stroke Rehabilitation - Restore mobility and independence through proper exercises
            </p>
          </div>

          <div className="therapy-page-content">

            {/* Gait Analysis Section */}
            <div className="therapy-page-card" style={{ marginTop: '2rem' }}>
              <h2>🚶 Gait Analysis</h2>
              <p style={{ marginBottom: '2rem' }}>
                Start your rehabilitation journey with a comprehensive gait analysis to assess your walking 
                patterns, balance, and movement. Choose your preferred method:
              </p>

              <div className="therapy-page-features" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Hardware Wearable Option */}
                <div className="therapy-feature-card" style={{ 
                  cursor: 'pointer', 
                  border: '2px solid #4CAF50',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div className="therapy-feature-icon" style={{ fontSize: '3rem' }}>👟</div>
                  <h3>Use Wearable Device</h3>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Get accurate gait analysis using our foot wearable sensor device. This method provides 
                    the most precise measurements for your rehabilitation progress.
                  </p>
                  <button 
                    className="therapy-page-cta-btn" 
                    style={{ width: '100%', padding: '0.75rem' }}
                    onClick={() => navigate('/gait-analysis')}
                  >
                    Start with Hardware
                  </button>
                </div>

                {/* Mobile App Option (Locked) */}
                <div className="therapy-feature-card" style={{ 
                  opacity: 0.6,
                  position: 'relative',
                  border: '2px solid #999'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    fontSize: '1.5rem' 
                  }}>🔒</div>
                  <div className="therapy-feature-icon" style={{ fontSize: '3rem' }}>📱</div>
                  <h3>Use Mobile App</h3>
                  <p style={{ marginBottom: '1.5rem' }}>
                    If hardware is not available, download our mobile version to perform gait analysis 
                    using your phone's built-in gyroscope and magnetometer sensors.
                  </p>
                  <button 
                    className="therapy-page-cta-btn secondary" 
                    style={{ width: '100%', padding: '0.75rem' }}
                    disabled
                  >
                    Hardware Not Available
                  </button>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                    Download the mobile app when hardware is unavailable
                  </p>
                </div>
              </div>
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
