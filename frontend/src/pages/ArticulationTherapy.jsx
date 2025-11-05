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
      description: 'Systematic practice for voiceless alveolar fricative production in initial, medial, and final positions',
      color: '#ce3630',
      examples: ['sun', 'sock', 'sip'],
      levels: 5
    },
    {
      id: 'r',
      symbol: '/r/',
      name: 'R Sound',
      description: 'Structured intervention for retroflex approximant articulation across contextual complexity levels',
      color: '#479ac3',
      examples: ['rabbit', 'red', 'run'],
      levels: 5
    },
    {
      id: 'l',
      symbol: '/l/',
      name: 'L Sound',
      description: 'Progressive training for lateral approximant sound production in varied linguistic contexts',
      color: '#e8b04e',
      examples: ['lion', 'leaf', 'lamp'],
      levels: 5
    },
    {
      id: 'k',
      symbol: '/k/',
      name: 'K Sound',
      description: 'Hierarchical practice for voiceless velar plosive articulation with increasing phonetic complexity',
      color: '#8e44ad',
      examples: ['kite', 'cat', 'car'],
      levels: 5
    },
    {
      id: 'th',
      symbol: '/th/',
      name: 'TH Sound',
      description: 'Sequential exercises for interdental fricative production in single words through connected speech',
      color: '#27ae60',
      examples: ['think', 'this', 'thumb'],
      levels: 5
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
            <button onClick={() => navigate('/profile')} className="articulation-nav-btn profile">
              My Profile
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
            <h1 className="articulation-title">Articulation Therapy Program</h1>
            <p className="articulation-subtitle">Evidence-Based Speech Sound Intervention</p>
            <p className="articulation-description">
              Select a target phoneme for systematic intervention. Each program includes five hierarchical levels 
              progressing from isolated sound production through connected speech contexts.
            </p>
          </div>

          {/* Sound Selection Grid */}
          <div className="sounds-grid">
            {targetSounds.map((sound) => (
              <div
                key={sound.id}
                className={`sound-card ${selectedSound === sound.id ? 'selected' : ''}`}
                onClick={() => handleSoundSelect(sound.id)}
                style={{ '--sound-color': sound.color }}
              >
                <div className="sound-header">
                  <div className="sound-symbol-badge" style={{ color: sound.color, borderColor: sound.color }}>
                    {sound.symbol}
                  </div>
                  <h3 className="sound-name">{sound.name}</h3>
                </div>
                
                <p className="sound-description">{sound.description}</p>
                
                <div className="sound-meta">
                  <div className="meta-item">
                    <span className="meta-label">Target Examples</span>
                    <div className="examples-list">
                      {sound.examples.map((example, index) => (
                        <span key={index} className="example-word">{example}</span>
                      ))}
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Intervention Levels</span>
                    <span className="meta-value">{sound.levels} Progressive Stages</span>
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
                  Begin Assessment
                </button>
              </div>
            ))}
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
