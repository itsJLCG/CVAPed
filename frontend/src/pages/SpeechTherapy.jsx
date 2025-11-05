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
      icon: 'A',
      title: 'Articulation Therapy',
      subtitle: 'Sound Production & Pronunciation',
      description: 'Clinical speech sound therapy focused on improving articulation accuracy and phonological development through systematic assessment and intervention.',
      features: [
        'Standardized pronunciation assessment protocol',
        'Multi-trial recording and evaluation system',
        'Evidence-based pronunciation scoring metrics',
        'Real-time accuracy feedback mechanisms',
        'Comprehensive progress monitoring',
        'Professional therapist review interface'
      ],
      color: '#ce3630'
    },
    {
      id: 'language',
      icon: 'L',
      title: 'Language Therapy',
      subtitle: 'Receptive & Expressive Language',
      description: 'Comprehensive language intervention program targeting vocabulary development, comprehension skills, and expressive language abilities through structured therapeutic activities.',
      features: [
        'Receptive language assessment tasks',
        'Expressive language evaluation protocols',
        'Grammar and syntax development exercises',
        'Quantitative response analysis',
        'Semantic and syntactic scoring system',
        'Age-appropriate intervention progression'
      ],
      color: '#479ac3'
    },
    {
      id: 'fluency',
      icon: 'F',
      title: 'Fluency Therapy',
      subtitle: 'Fluency Disorders & Speech Rate Control',
      description: 'Evidence-based fluency intervention program designed to address stuttering behaviors and improve speech flow through systematic desensitization and fluency-shaping techniques.',
      features: [
        'Structured reading and speaking tasks',
        'Quantitative speech rate analysis (WPM)',
        'Dysfluency pattern identification',
        'Real-time biofeedback visualization',
        'Fluency enhancement metrics',
        'Systematic progress documentation'
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
            <button onClick={() => navigate('/profile')} className="speech-types-nav-btn profile">
              My Profile
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
                style={{ '--card-color': type.color }}
              >
                <div className="speech-type-icon" style={{ color: type.color, borderColor: type.color }}>
                  {type.icon}
                </div>
                <h2 className="speech-type-title">{type.title}</h2>
                <p className="speech-type-subtitle">{type.subtitle}</p>
                <p className="speech-type-description">{type.description}</p>
                
                <div className="speech-type-features" style={{ borderLeftColor: type.color }}>
                  <h3>Program Features:</h3>
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
                  Begin Assessment
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
