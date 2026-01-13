import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { predictionService } from '../services/api';
import './Prediction-Clean.css';
import './BlankPage.css';

function Prediction({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

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
      <div className="overall-prediction-card">
        <div className="overall-header">
          <div className="overall-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div className="overall-info">
            <h2>Overall Timeline</h2>
            <p className="overall-description">Estimated time to complete all active speech therapies</p>
            <div className="timeline-value">
              <span className="weeks-number">{overall.weeks_to_completion}</span>
              <span className="weeks-label">weeks to completion</span>
            </div>
          </div>
          <div className="confidence-badge" title="How confident the AI is in this prediction">
            <i className="fas fa-check-circle"></i>
            <span>{confidencePercent}%</span>
            <div className="confidence-label">Accuracy</div>
          </div>
        </div>

        <div className="overall-progress">
          <div className="progress-info">
            <span>Current Progress</span>
            <span className="progress-percentage">{overall.current_overall_accuracy}%</span>
          </div>
          <div className="progress-bar-modern">
            <div className="progress-fill-modern" style={{ width: `${overall.current_overall_accuracy}%` }}></div>
          </div>
        </div>

        {(overall.articulation_accuracy > 0 || overall.fluency_accuracy > 0 || 
          overall.receptive_accuracy > 0 || overall.expressive_accuracy > 0) && (
          <div className="therapy-breakdown-compact">
            <div className="breakdown-title">Individual Therapies</div>
            <p className="breakdown-subtitle">Your current accuracy in each therapy type</p>
            <div className="breakdown-list">
              {overall.articulation_accuracy > 0 && (
                <div className="therapy-item">
                  <span className="therapy-name">🗣️ Articulation</span>
                  <span className="therapy-percent">{overall.articulation_accuracy.toFixed(0)}%</span>
                </div>
              )}
              {overall.fluency_accuracy > 0 && (
                <div className="therapy-item">
                  <span className="therapy-name">💬 Fluency</span>
                  <span className="therapy-percent">{overall.fluency_accuracy.toFixed(0)}%</span>
                </div>
              )}
              {overall.receptive_accuracy > 0 && (
                <div className="therapy-item">
                  <span className="therapy-name">👂 Receptive</span>
                  <span className="therapy-percent">{overall.receptive_accuracy.toFixed(0)}%</span>
                </div>
              )}
              {overall.expressive_accuracy > 0 && (
                <div className="therapy-item">
                  <span className="therapy-name">📢 Expressive</span>
                  <span className="therapy-percent">{overall.expressive_accuracy.toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArticulationCard = () => {
    if (!predictions?.articulation || Object.keys(predictions.articulation).length === 0) return null;

    const soundNames = {
      r: 'R',
      s: 'S',
      l: 'L',
      th: 'TH',
      k: 'K'
    };

    return (
      <div className="therapy-card-simple articulation-card">
        <div className="therapy-card-header">
          <div className="therapy-icon articulation">
            <i className="fas fa-microphone"></i>
          </div>
          <div className="therapy-title">
            <h3>Articulation</h3>
            <p>Sound pronunciation</p>
          </div>
        </div>

        <p className="card-explanation">Time needed to master each speech sound</p>

        <div className="sounds-compact">
          {Object.entries(predictions.articulation).map(([sound, prediction]) => (
            <div key={sound} className="sound-row">
              <span className="sound-name-compact">{soundNames[sound]}</span>
              <span className="sound-days-compact">{prediction.predicted_days} days</span>
              <span className="sound-level-compact">Lv {prediction.current_level}/5</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFluencyCard = () => {
    if (!predictions?.fluency) return null;

    const fluency = predictions.fluency;
    const confidencePercent = Math.round(fluency.confidence * 100);

    return (
      <div className="therapy-card-simple fluency-card">
        <div className="therapy-card-header">
          <div className="therapy-icon fluency">
            <i className="fas fa-comments"></i>
          </div>
          <div className="therapy-title">
            <h3>Fluency</h3>
            <p>Speech smoothness</p>
          </div>
        </div>

        <p className="card-explanation">Estimated days to complete all 5 fluency levels based on your progress</p>

        <div className="therapy-timeline">
          <div className="timeline-days">{fluency.predicted_days}</div>
          <div className="timeline-label">days</div>
        </div>

        <div className="therapy-stats-simple">
          <div className="stat-simple">
            <span className="stat-label">Level</span>
            <span className="stat-value">{fluency.current_level}/5</span>
          </div>
          <div className="stat-simple">
            <span className="stat-label">Confidence</span>
            <span className="stat-value">{confidencePercent}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLanguageCard = () => {
    if (!predictions?.receptive && !predictions?.expressive) return null;

    return (
      <div className="language-dual-container">
        {predictions?.receptive && (
          <div className="therapy-card-simple receptive-card">
            <div className="therapy-card-header">
              <div className="therapy-icon receptive">
                <i className="fas fa-ear-listen"></i>
              </div>
              <div className="therapy-title">
                <h3>Receptive</h3>
                <p>Understanding speech</p>
              </div>
            </div>

            <p className="card-explanation">Time to master understanding what others say</p>

            <div className="therapy-timeline">
              <div className="timeline-days">{predictions.receptive.predicted_days}</div>
              <div className="timeline-label">days</div>
            </div>

            <div className="therapy-stats-simple">
              <div className="stat-simple">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{(predictions.receptive.current_accuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="stat-simple">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{Math.round(predictions.receptive.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {predictions?.expressive && (
          <div className="therapy-card-simple expressive-card">
            <div className="therapy-card-header">
              <div className="therapy-icon expressive">
                <i className="fas fa-comment-dots"></i>
              </div>
              <div className="therapy-title">
                <h3>Expressive</h3>
                <p>Expressing thoughts</p>
              </div>
            </div>

            <p className="card-explanation">Time to master expressing your ideas clearly</p>

            <div className="therapy-timeline">
              <div className="timeline-days">{predictions.expressive.predicted_days}</div>
              <div className="timeline-label">days</div>
            </div>

            <div className="therapy-stats-simple">
              <div className="stat-simple">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{(predictions.expressive.current_accuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="stat-simple">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{Math.round(predictions.expressive.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prediction-container">
            <div className="loading-spinner">
              <div className="dots">
                <span></span>
                <span></span>
                <span></span>
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
          <div className="prediction-header">
            <h1>Speech Therapy Progress Predictions</h1>
            <p>AI-powered insights to track your journey to mastery</p>
            <div className="prediction-explanation">
              <i className="fas fa-lightbulb"></i>
              <p>Our AI analyzes your practice history and performance patterns to predict how long it will take to master each therapy. These predictions become more accurate as you complete more exercises.</p>
            </div>
          </div>

          {!predictions?.overall && !predictions?.articulation && 
           !predictions?.fluency && !predictions?.receptive && !predictions?.expressive ? (
            <div className="no-data-message">
              <i className="fas fa-info-circle"></i>
              <h2>No Predictions Available</h2>
              <p>Complete more therapy exercises to generate ML predictions.</p>
            </div>
          ) : (
            <>
              {renderOverallCard()}
              
              <div className="therapy-cards-section">
                <h2 className="section-title">
                  <i className="fas fa-chart-bar"></i>
                  Individual Therapy Predictions
                </h2>
                
                <div className="therapy-cards-grid">
                  {renderArticulationCard()}
                  {renderFluencyCard()}
                </div>
                
                {(predictions?.receptive || predictions?.expressive) && (
                  <div className="language-section">
                    {renderLanguageCard()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Prediction;
