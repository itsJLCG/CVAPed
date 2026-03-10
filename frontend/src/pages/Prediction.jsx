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
    // Fetch predictions for both speech and physical therapy
    if (selectedCategory === 'speech' || selectedCategory === 'physical') {
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

  const renderGaitCard = () => {
    if (!predictions?.gait) return null;

    const gait = predictions.gait;
    const confidencePercent = Math.round(gait.confidence * 100);
    const daysPerWeek = gait.total_sessions / (gait.days_practicing / 7);

    return (
      <div className="gait-clinical-container">
        {/* Header Section */}
        <div className="clinical-header">
          <div className="clinical-title-section">
            <div className="clinical-icon">
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <h2>XGBoost Gait Recovery Prediction</h2>
              <p className="clinical-subtitle">Machine Learning-Based Rehabilitation Timeline Estimation</p>
            </div>
          </div>
        </div>

        {/* Main Prediction Card */}
        <div className="clinical-prediction-main">
          <div className="prediction-primary">
            <div className="prediction-label">Estimated Days to Healthy Gait</div>
            <div className="prediction-value">
              <span className="days-number">{gait.predicted_days}</span>
              <span className="days-unit">days</span>
              <span className="weeks-conversion">({Math.round(gait.predicted_days / 7)} weeks)</span>
            </div>
            <div className="confidence-indicator">
              <div className="confidence-bar-container">
                <div className="confidence-bar-fill" style={{ width: `${confidencePercent}%` }}></div>
              </div>
              <span className="confidence-text">Model Confidence: {confidencePercent}%</span>
            </div>
          </div>

          <div className="prediction-methodology">
            <h4><i className="fas fa-flask"></i> Prediction Methodology</h4>
            <div className="methodology-grid">
              <div className="method-item">
                <span className="method-label">Algorithm:</span>
                <span className="method-value">XGBoost Regression</span>
              </div>
              <div className="method-item">
                <span className="method-label">Training Samples:</span>
                <span className="method-value">37 completed recoveries</span>
              </div>
              <div className="method-item">
                <span className="method-label">Model Accuracy:</span>
                <span className="method-value">R² = 0.839 (MAE: 8.5 days)</span>
              </div>
              <div className="method-item">
                <span className="method-label">Features Analyzed:</span>
                <span className="method-value">53 gait parameters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Data Summary */}
        <div className="clinical-data-section">
          <h3><i className="fas fa-chart-line"></i> Current Patient Data</h3>
          <div className="data-summary-grid">
            <div className="data-card">
              <i className="fas fa-calendar-check"></i>
              <div className="data-content">
                <span className="data-value">{gait.total_sessions}</span>
                <span className="data-label">Sessions Completed</span>
              </div>
            </div>
            <div className="data-card">
              <i className="fas fa-clock"></i>
              <div className="data-content">
                <span className="data-value">{gait.days_practicing}</span>
                <span className="data-label">Days Since Start</span>
              </div>
            </div>
            <div className="data-card">
              <i className="fas fa-running"></i>
              <div className="data-content">
                <span className="data-value">{daysPerWeek.toFixed(1)}</span>
                <span className="data-label">Sessions/Week</span>
              </div>
            </div>
            <div className="data-card">
              <i className="fas fa-arrow-trend-up"></i>
              <div className="data-content">
                <span className="data-value">{(gait.improvement_rate * 100).toFixed(2)}%</span>
                <span className="data-label">Daily Improvement Rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="clinical-data-section">
          <h3><i className="fas fa-weight-hanging"></i> Key Predictive Features</h3>
          <p className="section-description">
            The model weighs these factors to calculate your personalized timeline. 
            Higher impact features have greater influence on the prediction.
          </p>
          <div className="feature-importance-list">
            <div className="feature-item">
              <div className="feature-bar" style={{ width: '100%', background: '#3b82f6' }}>
                <span className="feature-name">Total Sessions Completed</span>
                <span className="feature-weight">47.8%</span>
              </div>
              <p className="feature-explanation">Most critical factor - consistent practice accelerates recovery</p>
            </div>
            <div className="feature-item">
              <div className="feature-bar" style={{ width: '60%', background: '#10b981' }}>
                <span className="feature-name">Days Since First Session</span>
                <span className="feature-weight">9.5%</span>
              </div>
              <p className="feature-explanation">Recovery time correlates with practice duration</p>
            </div>
            <div className="feature-item">
              <div className="feature-bar" style={{ width: '50%', background: '#f59e0b' }}>
                <span className="feature-name">Average Fatigue Level</span>
                <span className="feature-weight">8.2%</span>
              </div>
              <p className="feature-explanation">Lower fatigue indicates better physiological adaptation</p>
            </div>
            <div className="feature-item">
              <div className="feature-bar" style={{ width: '40%', background: '#8b5cf6' }}>
                <span className="feature-name">Initial Velocity</span>
                <span className="feature-weight">5.9%</span>
              </div>
              <p className="feature-explanation">Baseline walking speed predicts recovery trajectory</p>
            </div>
            <div className="feature-item">
              <div className="feature-bar" style={{ width: '35%', background: '#ec4899' }}>
                <span className="feature-name">Initial Cadence</span>
                <span className="feature-weight">4.9%</span>
              </div>
              <p className="feature-explanation">Starting step frequency affects timeline</p>
            </div>
          </div>
        </div>

        {/* Gait Metrics Progress */}
        {gait.metric_progress && (
          <div className="clinical-data-section">
            <h3><i className="fas fa-stethoscope"></i> Clinical Gait Parameters</h3>
            <p className="section-description">
              Current measurements compared to healthy adult thresholds (PhysioNet standards).
              All six parameters must reach target values for successful recovery.
            </p>
            <div className="clinical-metrics-grid">
              {/* Cadence */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-shoe-prints"></i>
                  <span className="metric-title">Cadence</span>
                  {gait.metric_progress.cadence?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{gait.metric_progress.cadence?.current?.toFixed(1)}</span>
                  <span className="unit">steps/min</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.cadence?.current / gait.metric_progress.cadence?.target) * 100)}%`,
                    background: gait.metric_progress.cadence?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {gait.metric_progress.cadence?.target}</span>
                  <span className="deficit">Deficit: {gait.metric_progress.cadence?.deficit?.toFixed(1)}</span>
                </div>
              </div>

              {/* Velocity */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-gauge-high"></i>
                  <span className="metric-title">Walking Velocity</span>
                  {gait.metric_progress.velocity?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{gait.metric_progress.velocity?.current?.toFixed(2)}</span>
                  <span className="unit">m/s</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.velocity?.current / gait.metric_progress.velocity?.target) * 100)}%`,
                    background: gait.metric_progress.velocity?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {gait.metric_progress.velocity?.target} m/s</span>
                  <span className="deficit">Deficit: {gait.metric_progress.velocity?.deficit?.toFixed(2)}</span>
                </div>
              </div>

              {/* Stride Length */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-ruler-horizontal"></i>
                  <span className="metric-title">Stride Length</span>
                  {gait.metric_progress.stride_length?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{gait.metric_progress.stride_length?.current?.toFixed(2)}</span>
                  <span className="unit">meters</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.stride_length?.current / gait.metric_progress.stride_length?.target) * 100)}%`,
                    background: gait.metric_progress.stride_length?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {gait.metric_progress.stride_length?.target}m</span>
                  <span className="deficit">Deficit: {gait.metric_progress.stride_length?.deficit?.toFixed(2)}</span>
                </div>
              </div>

              {/* Stability */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-balance-scale"></i>
                  <span className="metric-title">Stability Score</span>
                  {gait.metric_progress.stability?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{(gait.metric_progress.stability?.current * 100)?.toFixed(0)}</span>
                  <span className="unit">%</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.stability?.current / gait.metric_progress.stability?.target) * 100)}%`,
                    background: gait.metric_progress.stability?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {(gait.metric_progress.stability?.target * 100)?.toFixed(0)}%</span>
                  <span className="deficit">Deficit: {(gait.metric_progress.stability?.deficit * 100)?.toFixed(0)}%</span>
                </div>
              </div>

              {/* Symmetry */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-equals"></i>
                  <span className="metric-title">Gait Symmetry</span>
                  {gait.metric_progress.symmetry?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{(gait.metric_progress.symmetry?.current * 100)?.toFixed(0)}</span>
                  <span className="unit">%</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.symmetry?.current / gait.metric_progress.symmetry?.target) * 100)}%`,
                    background: gait.metric_progress.symmetry?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {(gait.metric_progress.symmetry?.target * 100)?.toFixed(0)}%</span>
                  <span className="deficit">Deficit: {(gait.metric_progress.symmetry?.deficit * 100)?.toFixed(0)}%</span>
                </div>
              </div>

              {/* Regularity */}
              <div className="clinical-metric-card">
                <div className="metric-header">
                  <i className="fas fa-wave-square"></i>
                  <span className="metric-title">Step Regularity</span>
                  {gait.metric_progress.regularity?.is_healthy && <span className="healthy-badge">✓ Healthy</span>}
                </div>
                <div className="metric-values">
                  <span className="current-val">{(gait.metric_progress.regularity?.current * 100)?.toFixed(0)}</span>
                  <span className="unit">%</span>
                </div>
                <div className="metric-bar-clinical">
                  <div className="bar-fill-clinical" style={{ 
                    width: `${Math.min(100, (gait.metric_progress.regularity?.current / gait.metric_progress.regularity?.target) * 100)}%`,
                    background: gait.metric_progress.regularity?.is_healthy ? '#10b981' : '#f59e0b'
                  }}></div>
                </div>
                <div className="metric-footer">
                  <span>Target: {(gait.metric_progress.regularity?.target * 100)?.toFixed(0)}%</span>
                  <span className="deficit">Deficit: {(gait.metric_progress.regularity?.deficit * 100)?.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinical Note */}
        <div className="clinical-note">
          <i className="fas fa-circle-info"></i>
          <div>
            <strong>Clinical Interpretation:</strong> This prediction uses gradient boosting (XGBoost) trained on 37 patients 
            who achieved healthy gait parameters. The model analyzes your current metrics, improvement trends, consistency, 
            and engagement patterns. Predictions update after each session as more data becomes available. 
            <strong>Note:</strong> Individual recovery may vary based on adherence, severity, and external factors.
          </div>
        </div>
      </div>
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
    // If we have gait predictions, show them
    if (predictions?.gait) {
      return (
        <div className="blank-page">
          <Header onLogout={onLogout} />
          <main className="blank-page-content gait-full-width">
            <div className="pred-page-header">
              <h1>Physical Therapy Predictions</h1>
              <p>AI-powered gait recovery timeline based on your progress</p>
            </div>

            {renderGaitCard()}

            <div className="pred-note gait-note">
              <i className="fas fa-lightbulb"></i>
              <span>Predictions are based on your gait analysis sessions and may improve with consistent practice.</span>
            </div>
          </main>
        </div>
      );
    }
    
    // Show message if no gait data available
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prediction-container">
            <div className="no-data-message">
              <i className="fas fa-robot"></i>
              <h2>No Gait Predictions Yet</h2>
              <p>Complete more gait analysis sessions to generate AI predictions.</p>
              <p className="coming-soon-detail">
                The AI model analyzes your walking patterns including cadence, stride length, 
                velocity, stability, symmetry, and regularity to predict your recovery timeline.
              </p>
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
