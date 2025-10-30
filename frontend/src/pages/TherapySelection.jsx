import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './TherapySelection.css';

function TherapySelection({ onLogout }) {
  const [hoveredTherapy, setHoveredTherapy] = useState(null);
  const navigate = useNavigate();

  const handleTherapyClick = (therapyType) => {
    if (therapyType === 'physical') {
      navigate('/physical-therapy');
    } else if (therapyType === 'speech') {
      navigate('/speech-therapy');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="therapy-selection-page">
      {/* Header */}
      <header className="therapy-header">
        <div className="therapy-header-container">
          <div className="therapy-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="therapy-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="therapy-header-text" />
          </div>
          <button onClick={handleLogout} className="therapy-logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="therapy-main">
        <div className="therapy-container">
          <h1 className="therapy-title">Choose Your Therapy Type</h1>
          <p className="therapy-subtitle">Select the therapy service you need</p>

          <div className="therapy-options">
            {/* Physical Therapy Option */}
            <div
              className={`therapy-option ${hoveredTherapy === 'physical' ? 'active' : ''} ${hoveredTherapy === 'speech' ? 'hidden' : ''}`}
              onMouseEnter={() => setHoveredTherapy('physical')}
              onMouseLeave={() => setHoveredTherapy(null)}
            >
              <div className="therapy-image-wrapper" onClick={() => handleTherapyClick('physical')}>
                <img 
                  src={images.physicalTherapy} 
                  alt="Physical Therapy" 
                  className="therapy-image"
                />
                <div className="therapy-overlay">
                  <h2 className="therapy-name">Physical Therapy</h2>
                </div>
              </div>
              
              <div className="therapy-details">
                <div className="therapy-description">
                  <p>
                    Specialized treatment to restore movement, reduce pain, and improve physical function. 
                    Our expert therapists help you recover from injuries, manage chronic conditions, and enhance your overall mobility.
                  </p>
                  <ul className="therapy-features">
                    <li>✓ Movement Restoration</li>
                    <li>✓ Pain Management</li>
                    <li>✓ Injury Recovery</li>
                    <li>✓ Strength Building</li>
                  </ul>
                </div>
                <button className="therapy-btn" onClick={() => handleTherapyClick('physical')}>
                  Select Physical Therapy
                </button>
              </div>
            </div>

            {/* Speech Therapy Option */}
            <div
              className={`therapy-option ${hoveredTherapy === 'speech' ? 'active' : ''} ${hoveredTherapy === 'physical' ? 'hidden' : ''}`}
              onMouseEnter={() => setHoveredTherapy('speech')}
              onMouseLeave={() => setHoveredTherapy(null)}
            >
              <div className="therapy-image-wrapper" onClick={() => handleTherapyClick('speech')}>
                <img 
                  src={images.speechTherapy} 
                  alt="Speech Therapy" 
                  className="therapy-image"
                />
                <div className="therapy-overlay">
                  <h2 className="therapy-name">Speech Therapy</h2>
                </div>
              </div>
              
              <div className="therapy-details">
                <div className="therapy-description">
                  <p>
                    Professional services to improve communication skills, treat speech disorders, and enhance language development. 
                    Our certified speech therapists provide personalized care for all ages.
                  </p>
                  <ul className="therapy-features">
                    <li>✓ Speech Improvement</li>
                    <li>✓ Language Development</li>
                    <li>✓ Swallowing Disorders</li>
                    <li>✓ Voice Therapy</li>
                  </ul>
                </div>
                <button className="therapy-btn" onClick={() => handleTherapyClick('speech')}>
                  Select Speech Therapy
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="therapy-footer">
        <div className="therapy-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default TherapySelection;
