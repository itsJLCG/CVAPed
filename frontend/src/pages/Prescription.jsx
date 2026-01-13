import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { prescriptionService } from '../services/api';
import './Prescription.css';

function Prescription({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetchPrescriptiveAnalysis();
  }, []);

  const fetchPrescriptiveAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await prescriptionService.getAnalysis();
      setAnalysis(response.analysis);
    } catch (err) {
      console.error('Error fetching prescriptive analysis:', err);
      setError(err.response?.data?.message || 'Failed to load prescriptive analysis');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return '#e74c3c';
      case 'MEDIUM':
        return '#f39c12';
      case 'LOW':
        return '#3498db';
      case 'COMPLETE':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  const formatTherapyName = (therapy) => {
    return therapy
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prescription-container">
            <div className="loading-spinner">
              <div className="spinner"></div>
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
          <div className="prescription-container">
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              <h3>Unable to Load Analysis</h3>
              <p>{error}</p>
              <button onClick={fetchPrescriptiveAnalysis} className="retry-button">
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prescription-container">
            <div className="no-data-message">
              <i className="fas fa-chart-line"></i>
              <h3>No Data Available</h3>
              <p>Complete some therapy sessions to receive personalized recommendations</p>
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
        <div className="prescription-container">
          <div className="prescription-header">
            <div className="header-content">
              <h1>
                <i className="fas fa-brain"></i>
                Prescriptive Analysis
              </h1>
              <p className="header-subtitle">
                AI-Powered Therapy Prioritization using Decision Rules & Graph-Based Recommendations
              </p>
            </div>
            <button onClick={fetchPrescriptiveAnalysis} className="refresh-button">
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>

          {/* Therapy Priorities Section */}
          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-flag"></i>
                Therapy Priorities
              </h2>
              <span className="section-badge">Decision Rules Engine</span>
            </div>
            <div className="priorities-grid">
              {analysis.priorities.map((priority, index) => (
                <div key={index} className="priority-card">
                  <div className="priority-header">
                    <h3>{formatTherapyName(priority.therapy)}</h3>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(priority.priority) }}
                    >
                      {priority.priority}
                    </span>
                  </div>
                  <div className="priority-body">
                    <div className="priority-weight">
                      <div className="weight-bar-container">
                        <div 
                          className="weight-bar"
                          style={{ 
                            width: `${priority.weight * 100}%`,
                            backgroundColor: getPriorityColor(priority.priority)
                          }}
                        ></div>
                      </div>
                      <span className="weight-label">{Math.round(priority.weight * 100)}% Focus</span>
                    </div>
                    <p className="priority-reason">
                      <i className="fas fa-info-circle"></i>
                      {priority.reason}
                    </p>
                    <div className="priority-focus">
                      <strong>Focus Area:</strong> {priority.focus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottleneck Analysis */}
          {analysis.bottleneck_analysis && (
            <div className="section-card bottleneck-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-exclamation-triangle"></i>
                  Bottleneck Analysis
                </h2>
                <span className="section-badge">Graph-Based Analysis</span>
              </div>
              <div className="bottleneck-content">
                <div className="bottleneck-main">
                  <div className="bottleneck-title">
                    <i className="fas fa-bolt"></i>
                    Primary Bottleneck: <strong>{formatTherapyName(analysis.bottleneck_analysis.bottleneck)}</strong>
                  </div>
                  <div className="bottleneck-score">
                    Impact Score: <span className="score-value">{Math.round(analysis.bottleneck_analysis.score)}</span>
                  </div>
                  <p className="bottleneck-explanation">{analysis.bottleneck_analysis.explanation}</p>
                </div>
                {analysis.bottleneck_analysis.affected_therapies.length > 0 && (
                  <div className="affected-therapies">
                    <h4>Blocking Progress In:</h4>
                    <div className="therapy-chips">
                      {analysis.bottleneck_analysis.affected_therapies.map((therapy, index) => (
                        <span key={index} className="therapy-chip">
                          {formatTherapyName(therapy)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optimal Sequence */}
          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-list-ol"></i>
                Optimal Practice Sequence
              </h2>
              <span className="section-badge">NetworkX Algorithm</span>
            </div>
            <div className="sequence-list">
              {analysis.optimal_sequence.map((item, index) => (
                <div key={index} className="sequence-item">
                  <div className="sequence-number">{index + 1}</div>
                  <div className="sequence-content">
                    <h4>{formatTherapyName(item.therapy)}</h4>
                    <p>{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-calendar-week"></i>
                Weekly Practice Schedule
              </h2>
              <span className="section-badge">Personalized Plan</span>
            </div>
            <div className="schedule-container">
              <div className="days-grid">
                {analysis.weekly_schedule.map((day, index) => (
                  <div 
                    key={index} 
                    className={`day-card ${selectedDay === index ? 'active' : ''}`}
                    onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                  >
                    <div className="day-header">
                      <h4>{day.day}</h4>
                      <span className="trial-count">{day.total_trials} trials</span>
                    </div>
                    {selectedDay === index && (
                      <div className="day-exercises">
                        {day.exercises.map((exercise, exIndex) => (
                          <div key={exIndex} className="exercise-item">
                            <div className="exercise-info">
                              <span className="exercise-therapy">{exercise.therapy}</span>
                              <span 
                                className="exercise-priority"
                                style={{ color: getPriorityColor(exercise.priority) }}
                              >
                                {exercise.priority}
                              </span>
                            </div>
                            <div className="exercise-details">
                              <span className="exercise-trials">{exercise.trials} × trials</span>
                              <span className="exercise-focus">{exercise.focus}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cross-Therapy Insights */}
          {analysis.cross_therapy_insights && analysis.cross_therapy_insights.length > 0 && (
            <div className="section-card">
              <div className="section-header">
                <h2>
                  <i className="fas fa-project-diagram"></i>
                  Cross-Therapy Synergies
                </h2>
                <span className="section-badge">Dependency Graph</span>
              </div>
              <div className="synergies-grid">
                {analysis.cross_therapy_insights.map((insight, index) => (
                  <div key={index} className="synergy-card">
                    <div className="synergy-connection">
                      <span className="therapy-node">{formatTherapyName(insight.from_therapy)}</span>
                      <i className="fas fa-arrow-right synergy-arrow"></i>
                      <span className="therapy-node">{formatTherapyName(insight.to_therapy)}</span>
                    </div>
                    <p className="synergy-reason">{insight.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-lightbulb"></i>
                Recommendations
              </h2>
            </div>
            <ul className="recommendations-list">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="recommendation-item">
                  <i className="fas fa-check-circle"></i>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div className="section-card insights-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-magic"></i>
                  AI Insights
                </h2>
              </div>
              <div className="insights-grid">
                {analysis.insights.map((insight, index) => (
                  <div key={index} className="insight-card">
                    <i className="fas fa-quote-left"></i>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="analysis-footer">
            <p>
              <i className="fas fa-clock"></i>
              Generated: {new Date(analysis.generated_at).toLocaleString()}
            </p>
            <p className="technology-note">
              Powered by <strong>Experta Decision Engine</strong> & <strong>NetworkX Graph Analysis</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Prescription;
