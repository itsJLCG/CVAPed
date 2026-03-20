import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import { prescriptionService } from '../services/api';
import './Prescription.css';

function Prescription({ onLogout, onFacilityExit }) {
  const { selectedCategory } = useTherapyCategory();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (selectedCategory === 'speech') {
      fetchPrescriptiveAnalysis();
    } else if (selectedCategory === 'physical') {
      fetchGaitPrescriptiveAnalysis();
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

  const fetchGaitPrescriptiveAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await prescriptionService.getGaitAnalysis();
      setAnalysis(response.analysis);
    } catch (err) {
      console.error('Error fetching gait prescriptive analysis:', err);
      setError(err.response?.data?.message || 'Failed to load gait prescriptive analysis');
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

  const getItemName = (item) => {
    return item.therapy || item.parameter || '';
  };

  if (loading) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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
    if (error) {
      return (
        <div className="blank-page">
          <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
          <main className="blank-page-content">
            <div className="prescription-container">
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Analysis</h3>
                <p>{error}</p>
                <button onClick={fetchGaitPrescriptiveAnalysis} className="retry-btn">
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
          <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
          <main className="blank-page-content">
            <div className="prescription-container">
              <div className="no-data-state">
                <i className="fas fa-person-walking"></i>
                <h3>No Gait Analysis Available</h3>
                <p>Complete gait analysis sessions to receive personalized recommendations</p>
              </div>
            </div>
          </main>
        </div>
      );
    }

    const renderGaitMetrics = () => {
      if (!analysis.current_metrics) return null;
      const metrics = Object.entries(analysis.current_metrics);
      const thresholds = analysis.healthy_thresholds || {};
      
      return (
        <div className="gait-metrics-section">
          <h3><i className="fas fa-chart-line"></i> Current Gait Metrics</h3>
          <div className="metrics-grid">
            {metrics.map(([param, value]) => {
              const target = thresholds[param];
              const deficit = target ? ((target - value) / target * 100).toFixed(0) : 0;
              const isHealthy = deficit <= 15;
              
              return (
                <div key={param} className={`metric-card ${isHealthy ? 'healthy' : 'needs-work'}`}>
                  <div className="metric-header">
                    <i className={`fas fa-${param === 'cadence' ? 'shoe-prints' : param === 'velocity' ? 'gauge-high' : 'chart-simple'}`}></i>
                    <span>{param.replace('_', ' ').toUpperCase()}</span>
                    {isHealthy && <span className="healthy-badge">✓</span>}
                  </div>
                  <div className="metric-value">
                    <span className="current">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                    <span className="target">/ {target}</span>
                  </div>
                  <div className="metric-deficit">
                    <span className={`deficit-value ${deficit <= 15 ? 'low' : 'high'}`}>{deficit}% deficit</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="blank-page">
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
        <main className="blank-page-content">
          <div className="prescription-container">
            <div className="prescription-header-section">
              <div className="header-left">
                <div className="header-icon gait-icon">
                  <i className="fas fa-clipboard-check"></i>
                </div>
                <div className="header-text">
                  <h1>Gait Therapy Prescription Plan</h1>
                  <p>AI-powered recommendations based on your gait analysis</p>
                </div>
              </div>
              <button onClick={fetchGaitPrescriptiveAnalysis} className="refresh-btn">
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>

            {renderGaitMetrics()}

            {analysis.bottleneck_analysis && (
              <div className="bottleneck-alert">
                <div className="alert-icon">
                  <i className="fas fa-bolt"></i>
                </div>
                <div className="alert-content">
                  <div className="alert-header">
                    <span className="alert-badge">Critical Bottleneck</span>
                    <h3>{analysis.bottleneck_analysis.bottleneck?.replace('_', ' ').toUpperCase()}</h3>
                  </div>
                  <p>{analysis.bottleneck_analysis.explanation}</p>
                </div>
              </div>
            )}

            <div className="priorities-section">
              <div className="section-title-bar">
                <h2><i className="fas fa-flag"></i> Gait Priorities</h2>
              </div>
              <div className="priorities-list">
                {analysis.priorities?.map((priority, index) => (
                  <div key={index} className="priority-item gait-priority">
                    <div className="priority-header-row">
                      <div className="priority-name-group">
                        <i 
                          className={`fas ${getPriorityIcon(priority.priority)}`}
                          style={{ color: getPriorityColor(priority.priority) }}
                        ></i>
                        <h3>{priority.parameter?.replace('_', ' ').toUpperCase()}</h3>
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
                        <span>{priority.focus}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="schedule-section">
              <div className="section-title-bar">
                <h2><i className="fas fa-calendar-week"></i> Weekly Schedule</h2>
                <span className="schedule-note">Click any day for details</span>
              </div>
              <div className="weekly-grid">
                {analysis.weekly_schedule?.map((day, index) => (
                  <div 
                    key={index} 
                    className={`day-box ${selectedDay === index ? 'expanded' : ''}`}
                    onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                  >
                    <div className="day-header-row">
                      <span className="day-name">{day.day}</span>
                      <span className="trial-badge">{day.total_duration} min</span>
                    </div>
                    {selectedDay === index && (
                      <div className="day-breakdown">
                        {day.exercises?.map((exercise, exIndex) => (
                          <div key={exIndex} className="exercise-row">
                            <div className="exercise-left">
                              <span className="exercise-name">{exercise.parameter}</span>
                              <span className="exercise-focus">{exercise.focus}</span>
                            </div>
                            <div className="exercise-right">
                              <span className="exercise-count">{exercise.duration}</span>
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

            <div className="insights-section">
              <h3><i className="fas fa-lightbulb"></i> Clinical Insights</h3>
              <div className="insights-list">
                {analysis.insights?.map((insight, index) => (
                  <div key={index} className="insight-item">
                    <i className="fas fa-info-circle"></i>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="motivation-footer">
              <div className="motivation-icon">
                <i className="fas fa-heart"></i>
              </div>
              <div className="motivation-text">
                <p className="motivation-main">Consistent gait practice accelerates recovery</p>
                <p className="motivation-sub">Each session brings you closer to healthy mobility</p>
              </div>
            </div>

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

  if (error) {
    return (
      <div className="blank-page">
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
      <main className="blank-page-content">
        <div className="prescription-container">
          {/* Page Header */}
          <div className="prescription-header-section">
            <div className="header-left">
              <div className="header-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <div className="header-text">
                <h1>{selectedCategory === 'physical' ? 'Gait Therapy' : 'Speech Therapy'} Prescription Plan</h1>
                <p>Personalized recommendations based on your progress</p>
              </div>
            </div>
            <button 
              onClick={selectedCategory === 'physical' ? fetchGaitPrescriptiveAnalysis : fetchPrescriptiveAnalysis} 
              className="refresh-btn"
            >
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
                {(analysis.bottleneck_analysis.affected_therapies?.length > 0 || 
                  analysis.bottleneck_analysis.affected_parameters?.length > 0) && (
                  <div className="blocking-areas">
                    <span className="blocking-label">Blocking:</span>
                    {(analysis.bottleneck_analysis.affected_therapies || analysis.bottleneck_analysis.affected_parameters || []).map((item, index) => (
                      <span key={index} className="blocking-chip">
                        {formatTherapyName(item)}
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
                      <h3>{formatTherapyName(getItemName(priority))}</h3>
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
                    <span className="trial-badge">
                      {day.total_trials ? `${day.total_trials}×` : `${day.total_duration} min`}
                    </span>
                  </div>
                  
                  {selectedDay === index && (
                    <div className="day-breakdown">
                      {day.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="exercise-row">
                          <div className="exercise-left">
                            <span className="exercise-name">{exercise.parameter || exercise.therapy}</span>
                            <span className="exercise-focus">{exercise.focus}</span>
                          </div>
                          <div className="exercise-right">
                            <span className="exercise-count">
                              {exercise.trials ? `${exercise.trials}×` : exercise.duration}
                            </span>
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
                      <strong>{formatTherapyName(getItemName(item))}</strong>
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

          {/* Key Insights Section */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div className="insights-section">
              <h3>
                <i className="fas fa-lightbulb"></i>
                Clinical Insights
              </h3>
              <div className="insights-list">
                {analysis.insights.map((insight, index) => (
                  <div key={index} className="insight-item">
                    <i className="fas fa-info-circle"></i>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
