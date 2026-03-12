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
  const [hoveredTherapy, setHoveredTherapy] = useState(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const navigate = useNavigate();
  const { selectCategory, clearCategory } = useTherapyCategory();
  const toast = useToast();

  // Clear category when user comes back to therapy selection
  useEffect(() => {
    clearCategory();
  }, [clearCategory]);

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
    // Set the selected category in context
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
                  Comprehensive speech therapy programs designed to improve communication skills for children. 
                  Choose from three specialized therapy types tailored to specific needs.
                </p>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', marginTop: '20px' }}>
                  Available Therapy Types:
                </h3>
                <ul className="therapy-features">
                  <li><strong>Articulation Therapy:</strong> Sound production and pronunciation improvement</li>
                  <li><strong>Language Therapy:</strong> Receptive, expressive, and fluency development</li>
                </ul>
              </div>
                <button className="therapy-btn" onClick={() => handleTherapyClick('speech')}>
                  Explore Speech Therapy Options
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
