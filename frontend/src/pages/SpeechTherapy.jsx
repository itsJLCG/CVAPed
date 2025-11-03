import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './SpeechTherapyTypes.css';

function SpeechTherapy({ onLogout }) {
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const therapyTypes = [
    {
      id: 'articulation',
      icon: '🗣️',
      title: 'Articulation Therapy',
      subtitle: 'Sound Production',
      description: 'Focus on improving the pronunciation of specific sounds and words. Perfect for children struggling with clear speech.',
      features: [
        'Picture/word targets with model pronunciation',
        'Record and practice pronunciation (2-3 trials)',
        'Automated pronunciation scoring',
        'Immediate feedback on accuracy',
        'Progress tracking and unlockable levels',
        'Therapist review and correction interface'
      ],
      color: '#ce3630'
    },
    {
      id: 'language',
      icon: '📚',
      title: 'Language Therapy',
      subtitle: 'Receptive & Expressive',
      description: 'Build vocabulary, comprehension, and expressive language skills through interactive exercises and guided activities.',
      features: [
        'Receptive tasks: image recognition and matching',
        'Expressive tasks: describe pictures and answer prompts',
        'Sentence-building and grammar exercises',
        'Response accuracy and latency tracking',
        'Keyword and semantic similarity scoring',
        'Age-appropriate difficulty progression'
      ],
      color: '#479ac3'
    },
    {
      id: 'fluency',
      icon: '⚡',
      title: 'Fluency Therapy',
      subtitle: 'Stuttering & Speech Rate',
      description: 'Practice smooth, flowing speech patterns. Helps reduce stuttering and improve overall speech fluency and rhythm.',
      features: [
        'Read-aloud passages and sentence practice',
        'Speech rate analysis (words per minute)',
        'Dysfluency detection (repetitions, blocks, pauses)',
        'Real-time visual pace feedback',
        'Smoothness score calculation',
        'Practice rounds with progress tracking'
      ],
      color: '#e8b04e'
    }
  ];

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
    // Navigate to specific therapy type page
    if (typeId === 'articulation') {
      navigate('/articulation');
    } else {
      // TODO: Navigate to language and fluency pages
      // navigate(`/speech-therapy/${typeId}`);
    }
  };

  return (
    <div className="speech-therapy-types-page">
      {/* Header */}
      <header className="speech-types-header">
        <div className="speech-types-header-container">
          <div className="speech-types-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="speech-types-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="speech-types-header-text" />
          </div>
          <div className="speech-types-nav">
            <button onClick={() => navigate('/therapy-selection')} className="speech-types-nav-btn">
              Back to Therapies
            </button>
            <button onClick={handleLogout} className="speech-types-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="speech-types-main">
        <div className="speech-types-container">
          <div className="speech-types-header-section">
            <h1 className="speech-types-title">Speech Therapy Types</h1>
            <p className="speech-types-subtitle">Choose the type of speech therapy you need</p>
          </div>

          <div className="speech-types-grid">
            {therapyTypes.map((type) => (
              <div 
                key={type.id}
                className={`speech-type-card ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => handleTypeSelect(type.id)}
              >
                <div className="speech-type-icon" style={{ color: type.color }}>
                  {type.icon}
                </div>
                <h2 className="speech-type-title">{type.title}</h2>
                <p className="speech-type-subtitle">{type.subtitle}</p>
                <p className="speech-type-description">{type.description}</p>
                
                <div className="speech-type-features">
                  <h3>What's Included:</h3>
                  <ul>
                    {type.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <button 
                  className="speech-type-btn"
                  style={{ backgroundColor: type.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeSelect(type.id);
                  }}
                >
                  Start {type.title}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="speech-types-footer">
        <div className="speech-types-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default SpeechTherapy;
