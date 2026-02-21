import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import { predictionService } from '../services/api';
import './Prediction.css';
import './BlankPage.css';

function Prediction({ onLogout }) {
  const { selectedCategory } = useTherapyCategory();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Only fetch predictions for speech therapy
    if (selectedCategory === 'speech') {
      fetchPredictions();
    } else {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, [selectedCategory]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await predictionService.getAllPredictions();
      
      if (response.success) {
        setPredictions(response.predictions);
      } else {
        setError(response.message || 'Failed to load predictions');
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to load predictions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const renderOverallCard = () => {
    if (!predictions?.overall) return null;

    const overall = predictions.overall;
    const confidencePercent = Math.round(overall.confidence * 100);

    return (
      <div className="prediction-hero">
        <div className="prediction-hero-left">
          <div className="prediction-hero-icon">
            <i className="fas fa-brain"></i>
          </div>
          <div className="prediction-hero-info">
            <h2>Overall Completion Timeline</h2>
            <p className="prediction-hero-description">Estimated time to master all speech therapies</p>
          </div>
        </div>
        
        <div className="prediction-prediction-hero-center">
          <div className="prediction-hero-main-number">
            <span className="prediction-hero-number">{overall.weeks_to_completion}</span>
            <span className="prediction-hero-unit">weeks</span>
          </div>
          <div className="confidence-small">
            <i className="fas fa-chart-line"></i>
            <span>{confidencePercent}% confidence</span>
          </div>
        </div>

        <div className="prediction-hero-right">
          <div className="accuracy-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={`${overall.current_overall_accuracy}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">{overall.current_overall_accuracy}%</text>
            </svg>
          </div>
          <p className="accuracy-label">Current Progress</p>
        </div>
      </div>
    );
  };

  const renderArticulationCard = () => {
    if (!predictions?.articulation || Object.keys(predictions.articulation).length === 0) return null;

    const soundNames = {
      r: 'R Sound',
      s: 'S Sound',
      l: 'L Sound',
      th: 'TH Sound',
      k: 'K Sound'
    };

    return (
      <div className="therapy-section">
        <div className="section-header">
          <div className="section-icon articulation">
            <i className="fas fa-microphone"></i>
          </div>
          <div className="section-title">
            <h3>Articulation Therapy</h3>
            <p>Time to master each speech sound</p>
          </div>
        </div>

        <div className="prediction-table">
          {Object.entries(predictions.articulation).map(([sound, prediction]) => {
            const confidencePercent = Math.round(prediction.confidence * 100);
            return (
              <div key={sound} className="table-row">
                <div className="row-left">
                  <span className="row-name">{soundNames[sound]}</span>
                  <span className="row-meta">Level {prediction.current_level}/5 • {confidencePercent}% confidence</span>
                </div>
                <div className="row-right">
                  <span className="row-value">{prediction.predicted_days}</span>
                  <span className="row-unit">days</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFluencyCard = () => {
    if (!predictions?.fluency) return null;

    const fluency = predictions.fluency;
    const confidencePercent = Math.round(fluency.confidence * 100);

    return (
      <div className="therapy-section">
        <div className="section-header">
          <div className="section-icon fluency">
            <i className="fas fa-comments"></i>
          </div>
          <div className="section-title">
            <h3>Fluency Therapy</h3>
            <p>Time to achieve smooth, natural speech flow</p>
          </div>
        </div>

        <div className="single-prediction">
          <div className="single-main">
            <span className="single-number">{fluency.predicted_days}</span>
            <span className="single-unit">days</span>
          </div>
          <div className="single-details">
            <span className="detail-item">Level {fluency.current_level}/5</span>
            <span className="detail-separator">•</span>
            <span className="detail-item confidence-text">{confidencePercent}% confidence</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLanguageCards = () => {
    const hasReceptive = predictions?.receptive;
    const hasExpressive = predictions?.expressive;
    
    if (!hasReceptive && !hasExpressive) return null;

    return (
      <>
        {hasReceptive && (
          <div className="therapy-section">
            <div className="section-header">
              <div className="section-icon receptive">
                <i className="fas fa-ear-listen"></i>
              </div>
              <div className="section-title">
                <h3>Receptive Language</h3>
                <p>Time to master understanding spoken language</p>
              </div>
            </div>

            <div className="single-prediction">
              <div className="single-main">
                <span className="single-number">{predictions.receptive.predicted_days}</span>
                <span className="single-unit">days</span>
              </div>
              <div className="single-details">
                <span className="detail-item">{(predictions.receptive.current_accuracy * 100).toFixed(0)}% accuracy</span>
                <span className="detail-separator">•</span>
                <span className="detail-item confidence-text">{Math.round(predictions.receptive.confidence * 100)}% confidence</span>
              </div>
            </div>
          </div>
        )}

        {hasExpressive && (
          <div className="therapy-section">
            <div className="section-header">
              <div className="section-icon expressive">
                <i className="fas fa-comment-dots"></i>
              </div>
              <div className="section-title">
                <h3>Expressive Language</h3>
                <p>Time to master expressing thoughts clearly</p>
              </div>
            </div>

            <div className="single-prediction">
              <div className="single-main">
                <span className="single-number">{predictions.expressive.predicted_days}</span>
                <span className="single-unit">days</span>
              </div>
              <div className="single-details">
                <span className="detail-item">{(predictions.expressive.current_accuracy * 100).toFixed(0)}% accuracy</span>
                <span className="detail-separator">•</span>
                <span className="detail-item confidence-text">{Math.round(predictions.expressive.confidence * 100)}% confidence</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prediction-container">
            <div className="loading-state">
              <div className="spinner-circle"></div>
              <p>Loading predictions...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show "Coming Soon" for Physical Therapy
  if (selectedCategory === 'physical') {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prediction-container">
            <div className="coming-soon-message">
              <div className="coming-soon-icon">🚧</div>
              <h2>Physical Therapy Predictions</h2>
              <h3>Coming Soon</h3>
              <p>AI-powered predictions for physical therapy progress are currently under development.</p>
              <p className="coming-soon-detail">
                This feature will provide insights on gait analysis improvements, 
                mobility recovery timelines, and personalized rehabilitation progress tracking.
              </p>
              <div className="coming-soon-features">
                <div className="feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Gait Progress Tracking</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-walking"></i>
                  <span>Mobility Predictions</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-brain"></i>
                  <span>AI-Powered Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prediction-container">
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              <h2>Error Loading Predictions</h2>
              <p>{error}</p>
              <button onClick={fetchPredictions} className="retry-button">
                <i className="fas fa-redo"></i>
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="blank-page">
      <Header onLogout={onLogout} />
      <main className="blank-page-content">
        <div className="prediction-container">
          <div className="pred-page-header">
            <h1>Speech Therapy Predictions</h1>
            <p>AI-powered timeline estimates based on your progress</p>
          </div>

          {!predictions?.overall && !predictions?.articulation && 
           !predictions?.fluency && !predictions?.receptive && !predictions?.expressive ? (
            <div className="no-data-message">
              <i className="fas fa-robot"></i>
              <h2>No Predictions Yet</h2>
              <p>Complete more therapy sessions to generate AI predictions.</p>
            </div>
          ) : (
            <>
              {renderOverallCard()}
              
              <div className="therapies-list">
                {renderArticulationCard()}
                {renderFluencyCard()}
                {renderLanguageCards()}
              </div>

              <div className="pred-note">
                <i className="fas fa-lightbulb"></i>
                <span>Predictions are estimates based on your current patterns and may vary with practice frequency.</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Prediction;
