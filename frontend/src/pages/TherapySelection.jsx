import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import InitialDiagnosticModal from '../components/InitialDiagnosticModal';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './TherapySelection.css';

function TherapySelection({ onLogout, onFacilityExit }) {
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hoveredCircle, setHoveredCircle] = useState(null);
  const navigate = useNavigate();
  const { selectCategory, clearCategory } = useTherapyCategory();
  const toast = useToast();

  // Clear category when user comes back to therapy selection
  useEffect(() => {
    clearCategory();
  }, [clearCategory]);

  // Handle page visibility to reset navigation state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setIsNavigating(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check if user has already answered the diagnostic question
  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (storedUser) {
      if (storedUser.diagnosticData?.completedWizard) {
        // Wizard completed — show profile card, highlight recommendation
        setDiagnosticData(storedUser.diagnosticData);
        setDiagnosticStatus(true);
      } else if (storedUser.hasInitialDiagnostic == null) {
        // Never answered — show modal
        setShowDiagnosticModal(true);
      } else if (storedUser.hasInitialDiagnostic === true) {
        // Legacy: already diagnosed — auto-navigate if they have a therapy type
        setDiagnosticStatus(true);
        if (storedUser.therapyType) {
          setTimeout(() => {
            selectCategory(storedUser.therapyType);
            if (storedUser.therapyType === 'physical') {
              navigate('/physical-therapy', { replace: true });
            } else if (storedUser.therapyType === 'speech') {
              navigate('/speech-therapy', { replace: true });
            }
          }, 0);
        }
      } else {
        // Answered "No" the old way — show guidance banner
        setDiagnosticStatus(false);
        setShowBanner(true);
      }
    }
  }, []);

  const handleDiagnosticConfirm = async (wizardData) => {
    setDiagnosticLoading(true);
    try {
      await authService.saveDiagnosticData(wizardData);
      setShowDiagnosticModal(false);
      setDiagnosticData(wizardData);
      setDiagnosticStatus(true);
      toast.success('Your diagnostic profile has been saved!');

      const rec = wizardData.recommendedTherapy;
      if (rec === 'speech' || (rec !== 'physical' && wizardData.therapyFocus === 'speech')) {
        selectCategory('speech');
        navigate('/speech-therapy', { replace: true });
      } else if (rec === 'physical' || wizardData.therapyFocus === 'physical') {
        selectCategory('physical');
        navigate('/physical-therapy', { replace: true });
      }
    } catch (error) {
      console.error('Error saving diagnostic data:', error);
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleTherapyClick = (therapyType) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    selectCategory(therapyType);
    
    if (therapyType === 'physical') {
      navigate('/physical-therapy');
    } else if (therapyType === 'speech') {
      navigate('/speech-therapy');
    }
  };

  return (
    <div className="therapy-selection-page">
      {/* Header */}
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />

      {/* Main Selection Area */}
      <main className="therapy-main">
        <div className="therapy-container">
          <h1 className="therapy-title">Choose Your Therapy Type</h1>
          <p className="therapy-subtitle">Select the therapy service you need</p>

          {/* Guidance Banner for users without initial diagnostic */}
          {diagnosticStatus === false && showBanner && (
            <div className="diagnostic-banner">
              <div className="diagnostic-banner-content">
                <span className="diagnostic-banner-icon">📋</span>
                <div className="diagnostic-banner-text">
                  <strong>Complete your Initial Diagnostic first.</strong> Answering a short set of questions helps us understand your condition and determine the most appropriate therapy starting point and exercise level for you.
                </div>
                <button
                  className="diagnostic-banner-close"
                  onClick={() => setShowBanner(false)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
              <button
                className="diagnostic-banner-btn"
                onClick={() => {
                  setShowBanner(false);
                  setShowDiagnosticModal(true);
                }}
              >
                Start Initial Diagnostic
              </button>
            </div>
          )}

          <div className={`therapy-options ${isNavigating ? 'navigating' : ''}`}>
            {/* Physical Therapy Option */}
            <div
              className={`therapy-option ${isNavigating ? 'no-hover' : ''}`}
            >
              <div 
                className={`therapy-image-wrapper ${hoveredCircle === 'physical' ? 'hovered' : ''}`}
                onClick={() => handleTherapyClick('physical')}
                onKeyDown={(e) => e.key === 'Enter' && handleTherapyClick('physical')}
                onMouseEnter={() => setHoveredCircle('physical')}
                onMouseLeave={() => setHoveredCircle(null)}
                role="button"
                tabIndex={0}
                aria-label="Select Physical Therapy"
                aria-disabled={isNavigating}
              >
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
                    Rebuild your strength, mobility, and independence after a stroke. Our physical therapy 
                    program uses guided exercises to help you restore movement, improve balance, and regain 
                    the ability to perform daily activities.
                  </p>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '10px', marginTop: '15px' }}>
                    What You'll Work On:
                  </h3>
                  <ul className="therapy-features">
                    <li><strong>Walking & Balance</strong> — Improve gait patterns and stability</li>
                    <li><strong>Strength & Flexibility</strong> — Rebuild muscle strength and range of motion</li>
                    <li><strong>Pain Management</strong> — Reduce discomfort and improve comfort</li>
                    <li><strong>Independence</strong> — Regain ability to perform everyday tasks</li>
                  </ul>
                  <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#555' }}>
                    <em>Perfect for stroke survivors working on restoring mobility and physical function.</em>
                  </p>
                </div>
                <button 
                  className="therapy-btn" 
                  onClick={() => handleTherapyClick('physical')}
                  disabled={isNavigating}
                >
                  Start Physical Therapy
                </button>
              </div>
            </div>

            {/* Speech Therapy Option */}
            <div
              className={`therapy-option ${isNavigating ? 'no-hover' : ''}`}
            >
              <div 
                className={`therapy-image-wrapper ${hoveredCircle === 'speech' ? 'hovered' : ''}`}
                onClick={() => handleTherapyClick('speech')}
                onKeyDown={(e) => e.key === 'Enter' && handleTherapyClick('speech')}
                onMouseEnter={() => setHoveredCircle('speech')}
                onMouseLeave={() => setHoveredCircle(null)}
                role="button"
                tabIndex={0}
                aria-label="Select Speech Therapy"
                aria-disabled={isNavigating}
              >
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
                    Help your child find their voice. Our speech therapy programs are designed for children 
                    to improve communication skills through fun, interactive exercises that build confidence 
                    and clarity.
                  </p>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '10px', marginTop: '15px' }}>
                    What We'll Work On:
                  </h3>
                  <ul className="therapy-features">
                    <li><strong>Articulation</strong> — Clear pronunciation and sound production</li>
                    <li><strong>Language Skills</strong> — Building vocabulary and understanding (receptive & expressive)</li>
                    <li><strong>Speech Fluency</strong> — Improving speech rhythm and flow</li>
                    <li><strong>Social Communication</strong> — Conversation skills and expressive language</li>
                  </ul>
                  <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#555' }}>
                    <em>Perfect for children ages 3-18 who need support with speech and language development.</em>
                  </p>
                </div>
                <button 
                  className="therapy-btn" 
                  onClick={() => handleTherapyClick('speech')}
                  disabled={isNavigating}
                >
                  Start Speech Therapy
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

      {/* Initial Diagnostic Check Modal */}
      <InitialDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        onConfirm={handleDiagnosticConfirm}
        loading={diagnosticLoading}
      />
    </div>
  );
}

export default TherapySelection;
