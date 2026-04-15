import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import './ArticulationTherapy.css';

function ArticulationTherapy({ onLogout, onFacilityExit }) {
  const [selectedSound, setSelectedSound] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();

  // Ensure the category is set to 'speech' when this page is loaded
  useEffect(() => {
    selectCategory('speech');
  }, [selectCategory]);

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

  const handleSoundSelect = (soundId, index) => {
    // Only allow click if this is the active card
    if (index !== currentIndex) {
      return;
    }
    setSelectedSound(soundId);
    // Navigate to exercise page for this sound
    navigate(`/articulation/${soundId}`);
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === targetSounds.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? targetSounds.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="articulation-therapy-page">
      {/* Header */}
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />

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

          {/* Sound Selection Carousel */}
          <div className="carousel-container">
            <button className="carousel-btn prev" onClick={prevSlide}>
              <span>‹</span>
            </button>

            <div className="carousel-wrapper">
              <div 
                className="sounds-carousel"
                style={{ transform: `translateX(calc(50% - ${currentIndex * 540}px - 250px))` }}
              >
                {targetSounds.map((sound, index) => (
                  <div
                    key={sound.id}
                    className={`sound-card ${selectedSound === sound.id ? 'selected' : ''} ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => handleSoundSelect(sound.id, index)}
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
                          {sound.examples.map((example, idx) => (
                            <span key={idx} className="example-word">{example}</span>
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
                        handleSoundSelect(sound.id, index);
                      }}
                    >
                      Begin Assessment
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button className="carousel-btn next" onClick={nextSlide}>
              <span>›</span>
            </button>
          </div>

          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {targetSounds.map((sound, index) => (
              <button
                key={sound.id}
                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                style={{ backgroundColor: index === currentIndex ? sound.color : '#d1d5db' }}
              />
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
