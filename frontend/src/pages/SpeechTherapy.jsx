import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './SpeechTherapyTypes.css';

function SpeechTherapy({ onLogout }) {
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();

  const therapyTypes = [
    {
      id: 'articulation',
      icon: '🗣️',
      title: 'Articulation Therapy',
      subtitle: 'Sound Production & Pronunciation',
      description: 'Master clear speech sounds with interactive pronunciation exercises and real-time feedback.',
      features: [
        'Voice recording & assessment',
        'Instant accuracy scoring',
        'Progress tracking'
      ],
      benefits: 'Perfect pronunciation skills',
      color: '#ce3630',
      gradient: 'linear-gradient(135deg, #ce3630 0%, #ff6b6b 100%)'
    },
    {
      id: 'language',
      icon: '💬',
      title: 'Language Therapy',
      subtitle: 'Receptive & Expressive Language',
      description: 'Build vocabulary and communication skills through engaging language activities.',
      features: [
        'Interactive exercises',
        'Grammar & comprehension',
        'Smart evaluation system'
      ],
      benefits: 'Enhanced communication',
      color: '#479ac3',
      gradient: 'linear-gradient(135deg, #479ac3 0%, #74b9ff 100%)'
    },
    {
      id: 'fluency',
      icon: '⚡',
      title: 'Fluency Therapy',
      subtitle: 'Speech Flow & Rhythm',
      description: 'Improve speech fluency and reduce stuttering with proven therapeutic techniques.',
      features: [
        'Speech rate monitoring',
        'Real-time feedback',
        'Pattern analysis'
      ],
      benefits: 'Smoother speech flow',
      color: '#e8b04e',
      gradient: 'linear-gradient(135deg, #e8b04e 0%, #ffd93d 100%)'
    }
  ];

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
    // Navigate to specific therapy type page
    if (typeId === 'articulation') {
      navigate('/articulation');
    } else if (typeId === 'language') {
      navigate('/language-therapy');
    } else if (typeId === 'fluency') {
      navigate('/fluency-therapy');
    }
  };

  return (
    <div className="speech-therapy-types-page">
      {/* Header */}
      <Header onLogout={onLogout} />

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
                style={{ '--card-color': type.color, '--card-gradient': type.gradient }}
              >
                <div className="speech-type-icon-wrapper">
                  <div className="speech-type-icon" style={{ background: type.gradient }}>
                    <span className="icon-emoji">{type.icon}</span>
                  </div>
                </div>
                
                <div className="speech-type-content">
                  <h2 className="speech-type-title">{type.title}</h2>
                  <p className="speech-type-subtitle">{type.subtitle}</p>
                  <p className="speech-type-description">{type.description}</p>
                  
                  <div className="speech-type-features">
                    <div className="features-header">
                      <span className="features-icon">✓</span>
                      <span>Key Features</span>
                    </div>
                    <ul>
                      {type.features.map((feature, index) => (
                        <li key={index}>
                          <span className="feature-bullet">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="speech-type-benefit">
                    <span className="benefit-icon">🎯</span>
                    <span>{type.benefits}</span>
                  </div>
                </div>

                <button 
                  className="speech-type-btn"
                  style={{ background: type.gradient }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeSelect(type.id);
                  }}
                >
                  <span className="btn-text">Start Therapy</span>
                  <span className="btn-arrow">→</span>
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
