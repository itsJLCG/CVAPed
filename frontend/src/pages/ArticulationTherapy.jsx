import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './ArticulationTherapy.css';

function ArticulationTherapy({ onLogout }) {
  const [selectedSound, setSelectedSound] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const targetSounds = [
    {
      id: 's',
      symbol: '/s/',
      name: 'S Sound',
      description: 'Practice the "s" sound as in "sun", "sock", and "sea"',
      color: '#ce3630',
      examples: ['sun', 'sock', 'sip'],
      icon: '🌞'
    },
    {
      id: 'r',
      symbol: '/r/',
      name: 'R Sound',
      description: 'Practice the "r" sound as in "rabbit", "red", and "run"',
      color: '#479ac3',
      examples: ['rabbit', 'red', 'run'],
      icon: '🐰'
    },
    {
      id: 'l',
      symbol: '/l/',
      name: 'L Sound',
      description: 'Practice the "l" sound as in "lion", "leaf", and "lamp"',
      color: '#e8b04e',
      examples: ['lion', 'leaf', 'lamp'],
      icon: '🦁'
    },
    {
      id: 'k',
      symbol: '/k/',
      name: 'K Sound',
      description: 'Practice the "k" sound as in "kite", "cat", and "car"',
      color: '#8e44ad',
      examples: ['kite', 'cat', 'car'],
      icon: '🪁'
    },
    {
      id: 'th',
      symbol: '/th/',
      name: 'TH Sound',
      description: 'Practice the "th" sound as in "think", "this", and "thumb"',
      color: '#27ae60',
      examples: ['think', 'this', 'thumb'],
      icon: '👍'
    }
  ];

  const handleSoundSelect = (soundId) => {
    setSelectedSound(soundId);
    // Navigate to exercise page for this sound
    navigate(`/articulation/${soundId}`);
  };

  return (
    <div className="articulation-therapy-page">
      {/* Header */}
      <header className="articulation-header">
        <div className="articulation-header-container">
          <div className="articulation-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="articulation-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="articulation-header-text" />
          </div>
          <div className="articulation-nav">
            <button onClick={() => navigate('/speech-therapy')} className="articulation-nav-btn">
              Back to Speech Therapy
            </button>
            <button onClick={handleLogout} className="articulation-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="articulation-main">
        <div className="articulation-container">
          <div className="articulation-header-section">
            <div className="articulation-icon">🗣️</div>
            <h1 className="articulation-title">Articulation Therapy</h1>
            <p className="articulation-subtitle">Sound Production Practice</p>
            <p className="articulation-description">
              Choose a target sound to practice. Each sound has 5 progressive levels: 
              Sound → Syllable → Word → Phrase → Sentence
            </p>
          </div>

          {/* Sound Selection Grid */}
          <div className="sounds-grid">
            {targetSounds.map((sound) => (
              <div
                key={sound.id}
                className={`sound-card ${selectedSound === sound.id ? 'selected' : ''}`}
                onClick={() => handleSoundSelect(sound.id)}
                style={{ borderColor: sound.color }}
              >
                <div className="sound-icon" style={{ color: sound.color }}>
                  {sound.icon}
                </div>
                <div className="sound-symbol" style={{ color: sound.color }}>
                  {sound.symbol}
                </div>
                <h3 className="sound-name">{sound.name}</h3>
                <p className="sound-description">{sound.description}</p>
                
                <div className="sound-examples">
                  <span className="examples-label">Examples:</span>
                  <div className="examples-list">
                    {sound.examples.map((example, index) => (
                      <span key={index} className="example-word">{example}</span>
                    ))}
                  </div>
                </div>

                <button
                  className="sound-btn"
                  style={{ backgroundColor: sound.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSoundSelect(sound.id);
                  }}
                >
                  Start Practice
                </button>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="articulation-info">
            <h2>How It Works</h2>
            <div className="info-steps">
              <div className="info-step">
                <div className="step-number">1</div>
                <h3>Select a Sound</h3>
                <p>Choose one of the 5 target sounds above</p>
              </div>
              <div className="info-step">
                <div className="step-number">2</div>
                <h3>Progress Through Levels</h3>
                <p>Complete 5 levels from simple sounds to full sentences</p>
              </div>
              <div className="info-step">
                <div className="step-number">3</div>
                <h3>Record & Practice</h3>
                <p>Record 2-3 trials per exercise and get instant feedback</p>
              </div>
              <div className="info-step">
                <div className="step-number">4</div>
                <h3>Unlock Next Level</h3>
                <p>Score 90% or higher to unlock the next level</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="articulation-footer">
        <div className="articulation-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default ArticulationTherapy;
