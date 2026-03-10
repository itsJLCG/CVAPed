import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './GaitProblems.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getSeverityIcon = (severity) => {
  return severity === 'severe' 
    ? 'fa-exclamation-triangle' 
    : 'fa-info-circle';
};

const getSeverityColor = (severity) => {
  return severity === 'severe' ? '#dc3545' : '#fd7e14';
};

function GaitProblems({ onLogout }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    selectCategory('physical');
    
    // Load analysis result from localStorage
    const saved = localStorage.getItem('gaitAnalysisResult');
    if (saved) {
      setAnalysisResult(JSON.parse(saved));
    } else {
      // No analysis result, redirect back to recording
      navigate('/gait-recording');
    }
  }, [selectCategory, navigate]);

  const handleExercisePlanNavigation = async () => {
    // Save exercise plan if problems detected
    if (analysisResult && analysisResult.detected_problems && analysisResult.detected_problems.length > 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gait/exercise-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            detected_problems: analysisResult.detected_problems,
            gait_analysis_id: analysisResult.gait_id || null
          })
        });

        const data = await response.json();
        if (data.success) {
          console.log('Exercise plan saved:', data.plan_id);
        }
      } catch (err) {
        console.error('Failed to save exercise plan:', err);
      }
    }
    // Navigate to exercise plans page
    navigate('/exercise-plans');
  };

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="gait-problems-page">
      <Header onLogout={onLogout} />
      <main className="main-content">
        <div className="gait-problems-container">
          {/* Clinical Header */}
          <div className="clinical-header">
            <h1 className="clinical-title">Gait Analysis Report</h1>
            <p className="clinical-subtitle">Comprehensive review of detected gait abnormalities and recommended interventions</p>
          </div>

          {/* Problems Content */}
          {analysisResult.detected_problems && analysisResult.detected_problems.length > 0 ? (
            <>
              {/* Executive Summary Panel */}
              {analysisResult.problem_summary && (
                <div className="executive-summary-panel">
                  <div className="summary-header">
                    <h2 className="summary-title">
                      <i className="fas fa-stethoscope"></i>
                      Clinical Summary
                    </h2>
                    <div className="summary-meta">
                      <span className={`risk-indicator risk-${analysisResult.problem_summary.risk_level.toLowerCase().replace('_', '-')}`}>
                        <i className="fas fa-shield-alt"></i>
                        {analysisResult.problem_summary.risk_level.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="summary-metrics">
                    <div className="metric-card metric-total">
                      <div className="metric-icon">
                        <i className="fas fa-clipboard-list"></i>
                      </div>
                      <div className="metric-content">
                        <div className="metric-value">{analysisResult.detected_problems.length}</div>
                        <div className="metric-label">Total Findings</div>
                      </div>
                    </div>
                    
                    {analysisResult.problem_summary.severe_count > 0 && (
                      <div className="metric-card metric-severe">
                        <div className="metric-icon">
                          <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="metric-content">
                          <div className="metric-value">{analysisResult.problem_summary.severe_count}</div>
                          <div className="metric-label">Severe</div>
                        </div>
                      </div>
                    )}
                    
                    {analysisResult.problem_summary.moderate_count > 0 && (
                      <div className="metric-card metric-moderate">
                        <div className="metric-icon">
                          <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <div className="metric-content">
                          <div className="metric-value">{analysisResult.problem_summary.moderate_count}</div>
                          <div className="metric-label">Moderate</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="summary-narrative">
                    <div className="narrative-label">Assessment</div>
                    <p className="narrative-text">{analysisResult.problem_summary.summary}</p>
                  </div>
                </div>
              )}

              {/* Clinical Findings Section */}
              <div className="clinical-section">
                <div className="section-header">
                  <h2 className="section-title">
                    <i className="fas fa-microscope"></i>
                    Clinical Findings
                  </h2>
                </div>

                <div className="findings-grid">
                  {analysisResult.detected_problems.map((problem, index) => (
                    <div key={index} className={`finding-card severity-${problem.severity}`}>
                      <div className="finding-header">
                        <div className="finding-id">
                          <span className="id-badge">#{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="finding-title-section">
                          <h3 className="finding-title">
                            {problem.problem.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <div className="finding-meta">
                            <span className={`severity-badge badge-${problem.severity}`}>
                              <i className={`fas ${getSeverityIcon(problem.severity)}`}></i>
                              {problem.severity.toUpperCase()}
                            </span>
                            {problem.category && (
                              <span className="category-badge">
                                <i className="fas fa-tag"></i>
                                {problem.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="finding-body">
                        {/* Metrics Table */}
                        <div className="metrics-table">
                          <div className="metrics-row">
                            <div className="metrics-cell cell-label">
                              <i className="fas fa-user"></i>
                              Patient Value
                            </div>
                            <div className="metrics-cell cell-value">
                              <strong>{problem.current_value}</strong>
                            </div>
                          </div>
                          <div className="metrics-row">
                            <div className="metrics-cell cell-label">
                              <i className="fas fa-chart-line"></i>
                              Reference Range
                            </div>
                            <div className="metrics-cell cell-value cell-normal">
                              {problem.normal_range}
                            </div>
                          </div>
                          {problem.percentile && (
                            <div className="metrics-row">
                              <div className="metrics-cell cell-label">
                                <i className="fas fa-percentage"></i>
                                Percentile
                              </div>
                              <div className="metrics-cell cell-value cell-percentile">
                                {problem.percentile}th
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Clinical Description */}
                        <div className="clinical-description">
                          <div className="description-label">
                            <i className="fas fa-notes-medical"></i>
                            Clinical Notes
                          </div>
                          <p className="description-text">{problem.description}</p>
                        </div>

                        {/* Clinical Impact */}
                        {problem.impact && (
                          <div className="clinical-impact">
                            <div className="impact-label">
                              <i className="fas fa-heartbeat"></i>
                              Impact Assessment
                            </div>
                            <p className="impact-text">{problem.impact}</p>
                          </div>
                        )}

                        {/* Treatment Options */}
                        {problem.exercises && problem.exercises.length > 0 && (
                          <div className="treatment-indicator">
                            <i className="fas fa-procedures"></i>
                            <span>{problem.exercises.length} therapeutic intervention{problem.exercises.length !== 1 ? 's' : ''} recommended</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Panel */}
              <div className="action-panel">
                <div className="action-card primary-action">
                  <div className="action-icon">
                    <i className="fas fa-dumbbell"></i>
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">View Treatment Plan</h3>
                    <p className="action-description">Access personalized therapeutic exercises tailored to address your specific gait abnormalities</p>
                  </div>
                  <button 
                    className="action-button btn-primary"
                    onClick={handleExercisePlanNavigation}
                  >
                    View Plan
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>

                <div className="action-card secondary-action">
                  <div className="action-icon">
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">Review Analysis</h3>
                    <p className="action-description">Return to detailed gait metrics and sensor data visualization</p>
                  </div>
                  <button 
                    className="action-button btn-secondary"
                    onClick={() => navigate('/gait-recording')}
                  >
                    View Analysis
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* No Problems - Clinical Style */
            <div className="clinical-result-panel panel-success">
              <div className="result-icon-container">
                <div className="result-icon icon-success">
                  <i className="fas fa-check-circle"></i>
                </div>
              </div>
              <div className="result-content">
                <h2 className="result-title">Normal Gait Parameters</h2>
                <p className="result-description">
                  Analysis complete. All measured gait parameters fall within established normal ranges. 
                  No significant abnormalities detected at this time.
                </p>
                <div className="result-recommendation">
                  <div className="recommendation-label">
                    <i className="fas fa-lightbulb"></i>
                    Clinical Recommendation
                  </div>
                  <p>Continue current activity level and maintain regular physical exercise to preserve optimal gait function.</p>
                </div>
              </div>

              <div className="action-panel">
                <div className="action-card secondary-action">
                  <div className="action-icon">
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">Review Analysis</h3>
                    <p className="action-description">View detailed gait metrics and measurements</p>
                  </div>
                  <button 
                    className="action-button btn-secondary"
                    onClick={() => navigate('/gait-recording')}
                  >
                    View Analysis
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>

                <div className="action-card secondary-action">
                  <div className="action-icon">
                    <i className="fas fa-dumbbell"></i>
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">Exercise Library</h3>
                    <p className="action-description">Browse available therapeutic exercises</p>
                  </div>
                  <button 
                    className="action-button btn-secondary"
                    onClick={() => navigate('/exercise-plans')}
                  >
                    Browse Exercises
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default GaitProblems;
