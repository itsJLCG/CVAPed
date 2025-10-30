import React from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './TherapyPage.css';

function SpeechTherapy({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="therapy-page speech">
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
            <div className="therapy-page-icon">💬</div>
            <h1 className="therapy-page-title">Speech Therapy</h1>
            <p className="therapy-page-subtitle">
              Improve communication skills and treat speech disorders
            </p>
          </div>

          <div className="therapy-page-content">
            <div className="therapy-page-card">
              <h2>Welcome to Speech Therapy Services</h2>
              <p>
                Our speech therapy program provides professional services to improve communication skills, 
                treat speech disorders, and enhance language development for patients of all ages.
              </p>
            </div>

            <div className="therapy-page-features">
              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">🗣️</div>
                <h3>Speech Improvement</h3>
                <p>Enhance articulation, pronunciation, and verbal expression</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">📚</div>
                <h3>Language Development</h3>
                <p>Build vocabulary, grammar, and comprehension skills</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">🎵</div>
                <h3>Voice Therapy</h3>
                <p>Improve vocal quality, pitch, and resonance</p>
              </div>

              <div className="therapy-feature-card">
                <div className="therapy-feature-icon">🍽️</div>
                <h3>Swallowing Disorders</h3>
                <p>Treatment for dysphagia and related conditions</p>
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

export default SpeechTherapy;
