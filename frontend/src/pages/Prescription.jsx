import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import { prescriptionService } from '../services/api';
import './Prescription.css';

function Prescription({ onLogout }) {
  const { selectedCategory } = useTherapyCategory();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (selectedCategory === 'speech') {
      fetchPrescriptiveAnalysis();
    } else {
      setLoading(false);
    }
  }, [selectedCategory]);

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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'fa-exclamation-circle';
      case 'MEDIUM':
        return 'fa-info-circle';
      case 'LOW':
        return 'fa-check-circle';
      case 'COMPLETE':
        return 'fa-trophy';
      default:
        return 'fa-circle';
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
            <div className="loading-state">
              <div className="spinner-circle"></div>
              <p>Analyzing your therapy data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (selectedCategory === 'physical') {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} />
        <main className="blank-page-content">
          <div className="prescription-container">
            <div className="coming-soon-message">
              <div className="coming-soon-icon">🚧</div>
              <h2>Physical Therapy Prescription</h2>
              <h3>Coming Soon</h3>
              <p>AI-powered prescriptive therapy recommendations for physical rehabilitation are currently under development.</p>
              <p className="coming-soon-detail">
                This feature will provide personalized exercise plans, therapy prioritization, 
                and intelligent scheduling based on your gait analysis and mobility assessments.
              </p>
              <div className="coming-soon-features">
                <div className="feature-item">
                  <i className="fas fa-dumbbell"></i>
                  <span>Personalized Exercise Plans</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-clipboard-list"></i>
                  <span>Therapy Prioritization</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Smart Scheduling</span>
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
          <div className="prescription-container">
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Unable to Load Analysis</h3>
              <p>{error}</p>
              <button onClick={fetchPrescriptiveAnalysis} className="retry-btn">
                <i className="fas fa-redo"></i>
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
            <div className="no-data-state">
              <i className="fas fa-clipboard-list"></i>
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
          {/* Page Header */}
          <div className="prescription-header-section">
            <div className="header-left">
              <div className="header-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <div className="header-text">
                <h1>Therapy Prescription Plan</h1>
                <p>Personalized recommendations based on your progress</p>
              </div>
            </div>
            <button onClick={fetchPrescriptiveAnalysis} className="refresh-btn">
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>

          {/* Critical Bottleneck Alert */}
          {analysis.bottleneck_analysis && (
            <div className="bottleneck-alert">
              <div className="alert-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className="alert-badge">Critical Bottleneck</span>
                  <h3>{formatTherapyName(analysis.bottleneck_analysis.bottleneck)}</h3>
                </div>
                <p>{analysis.bottleneck_analysis.explanation}</p>
                {analysis.bottleneck_analysis.affected_therapies.length > 0 && (
                  <div className="blocking-areas">
                    <span className="blocking-label">Blocking:</span>
                    {analysis.bottleneck_analysis.affected_therapies.map((therapy, index) => (
                      <span key={index} className="blocking-chip">
                        {formatTherapyName(therapy)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Therapy Priorities */}
          <div className="priorities-section">
            <div className="section-title-bar">
              <h2>
                <i className="fas fa-flag"></i>
                Therapy Priorities
              </h2>
            </div>
            <div className="priorities-list">
              {analysis.priorities.map((priority, index) => (
                <div key={index} className="priority-item">
                  <div className="priority-header-row">
                    <div className="priority-name-group">
                      <i 
                        className={`fas ${getPriorityIcon(priority.priority)}`}
                        style={{ color: getPriorityColor(priority.priority) }}
                      ></i>
                      <h3>{formatTherapyName(priority.therapy)}</h3>
                      <span 
                        className="priority-label"
                        style={{ 
                          backgroundColor: getPriorityColor(priority.priority),
                          opacity: 0.9
                        }}
                      >
                        {priority.priority}
                      </span>
                    </div>
                    <div className="priority-allocation">
                      <span className="allocation-percent">{Math.round(priority.weight * 100)}%</span>
                      <span className="allocation-text">Focus</span>
                    </div>
                  </div>
                  
                  <div className="priority-progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${priority.weight * 100}%`,
                        backgroundColor: getPriorityColor(priority.priority)
                      }}
                    ></div>
                  </div>

                  <div className="priority-details">
                    <div className="detail-item">
                      <i className="fas fa-lightbulb"></i>
                      <span>{priority.reason}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Practice Schedule */}
          <div className="schedule-section">
            <div className="section-title-bar">
              <h2>
                <i className="fas fa-calendar-week"></i>
                Weekly Schedule
              </h2>
              <span className="schedule-note">Click any day for details</span>
            </div>
            <div className="weekly-grid">
              {analysis.weekly_schedule.map((day, index) => (
                <div 
                  key={index} 
                  className={`day-box ${selectedDay === index ? 'expanded' : ''}`}
                  onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                >
                  <div className="day-header-row">
                    <span className="day-name">{day.day}</span>
                    <span className="trial-badge">{day.total_trials}×</span>
                  </div>
                  
                  {selectedDay === index && (
                    <div className="day-breakdown">
                      {day.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="exercise-row">
                          <div className="exercise-left">
                            <span className="exercise-name">{exercise.therapy}</span>
                            <span className="exercise-focus">{exercise.focus}</span>
                          </div>
                          <div className="exercise-right">
                            <span className="exercise-count">{exercise.trials}×</span>
                            <span 
                              className="exercise-priority-dot"
                              style={{ backgroundColor: getPriorityColor(exercise.priority) }}
                            ></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Practice Order & Recommendations Combined */}
          <div className="combined-section">
            <div className="left-column">
              <div className="section-title-bar">
                <h2>
                  <i className="fas fa-list-ol"></i>
                  Practice Order
                </h2>
              </div>
              <div className="sequence-compact">
                {analysis.optimal_sequence.map((item, index) => (
                  <div key={index} className="sequence-compact-item">
                    <span className="sequence-num">{index + 1}</span>
                    <div className="sequence-text">
                      <strong>{formatTherapyName(item.therapy)}</strong>
                      <p>{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="right-column">
              <div className="section-title-bar">
                <h2>
                  <i className="fas fa-star"></i>
                  Key Recommendations
                </h2>
              </div>
              <div className="recommendations-compact">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="recommendation-compact">
                    <i className="fas fa-check"></i>
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Motivational Footer */}
          <div className="motivation-footer">
            <div className="motivation-icon">
              <i className="fas fa-heart"></i>
            </div>
            <div className="motivation-text">
              <p className="motivation-main">Build consistency with daily practice</p>
              <p className="motivation-sub">Small steps every day lead to remarkable progress</p>
            </div>
          </div>

          {/* Analysis Info */}
          <div className="analysis-info">
            <span>
              <i className="fas fa-clock"></i>
              Last updated: {new Date(analysis.generated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Prescription;
