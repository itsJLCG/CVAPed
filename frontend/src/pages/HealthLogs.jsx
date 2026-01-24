import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { healthService } from '../services/api';
import './HealthLogs.css';

function HealthLogs({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthLogs, setHealthLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [fluencyPrediction, setFluencyPrediction] = useState(null);
  const [receptivePrediction, setReceptivePrediction] = useState(null);
  const [expressivePrediction, setExpressivePrediction] = useState(null);
  const [overallSpeechPrediction, setOverallSpeechPrediction] = useState(null);
  const [expandedGaitRows, setExpandedGaitRows] = useState({});

  useEffect(() => {
    fetchHealthData();
    fetchPredictions();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [logsData, summaryData] = await Promise.all([
        healthService.getLogs(50, false),
        healthService.getSummary()
      ]);

      setHealthLogs(logsData.logs || []);
      setSummary(summaryData.summary || null);
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError(err.response?.data?.message || 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      // Fetch all predictions in parallel
      const [
        articulationData,
        fluencyData,
        receptiveData,
        expressiveData,
        overallData
      ] = await Promise.all([
        healthService.getArticulationPredictions(),
        healthService.getFluencyPrediction(),
        healthService.getReceptivePrediction(),
        healthService.getExpressivePrediction(),
        healthService.getOverallSpeechPrediction()
      ]);

      if (articulationData) setPredictions(articulationData.predictions || {});
      if (fluencyData) setFluencyPrediction(fluencyData);
      if (receptiveData) setReceptivePrediction(receptiveData);
      if (expressiveData) setExpressivePrediction(expressiveData);
      if (overallData) setOverallSpeechPrediction(overallData);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    await fetchPredictions();
  };

  const loadFullHistory = async () => {
    try {
      const logsData = await healthService.getLogs(0, true);
      setHealthLogs(logsData.logs || []);
      setShowFullHistory(true);
    } catch (err) {
      console.error('Error loading full history:', err);
    }
  };

  const getFilteredLogs = () => {
    if (selectedFilter === 'all') {
      return showFullHistory ? healthLogs : healthLogs.slice(0, 20);
    }
    
    let filtered;
    // Handle language filter - include ONLY receptive and expressive, NOT articulation
    if (selectedFilter === 'language') {
      filtered = healthLogs.filter(log => 
        log.therapyType === 'receptive' || 
        log.therapyType === 'expressive'
      );
    } else {
      // For all other filters, match exactly
      filtered = healthLogs.filter(log => log.therapyType === selectedFilter);
    }
    
    return showFullHistory ? filtered : filtered.slice(0, 20);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getTherapyColor = (type) => {
    const colors = {
      articulation: '#9C27B0',
      language: '#2196F3',
      receptive: '#2196F3',
      expressive: '#2196F3',
      fluency: '#FF9800',
      gait: '#4CAF50'
    };
    return colors[type] || '#666';
  };

  const getTherapyIcon = (type) => {
    const icons = {
      articulation: '🗣️',
      language: '📚',
      receptive: '👂',
      expressive: '🗣️',
      fluency: '💬',
      gait: '🚶'
    };
    return icons[type] || '📊';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleGaitDetails = (logId) => {
    setExpandedGaitRows(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  if (loading) {
    return (
      <div className="health-logs-page">
        <Header onLogout={onLogout} />
        <main className="health-logs-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading health data...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-logs-page">
        <Header onLogout={onLogout} />
        <main className="health-logs-content">
          <div className="error-container">
            <span className="error-icon">⚠️</span>
            <p className="error-text">{error}</p>
            <button onClick={fetchHealthData} className="retry-button">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="health-logs-page">
      <Header onLogout={onLogout} />
      <main className="health-logs-content">
        <div className="health-logs-container">
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Health Progress</h1>
            <button onClick={onRefresh} className="refresh-button" disabled={refreshing}>
              <span className="refresh-icon">{refreshing ? '⏳' : '🔄'}</span>
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {/* Overview Summary Card */}
          <div className="overview-summary">
            <div className="overview-header">
              <h2 className="overview-title">Therapy Overview</h2>
              {overallSpeechPrediction && overallSpeechPrediction.prediction && (
                <div className="mastery-badge">
                  <span className="mastery-icon">🎯</span>
                  <div className="mastery-info">
                    <span className="mastery-days">{overallSpeechPrediction.prediction.predicted_days_to_mastery} days</span>
                    <span className="mastery-label">to mastery</span>
                  </div>
                </div>
              )}
            </div>

            {summary && (
              <div className="therapy-stats-grid">
                {Object.entries(summary).map(([type, stats]) => (
                  <div key={type} className="therapy-stat-card">
                    <div className="stat-header">
                      <span className="stat-icon" style={{ backgroundColor: getTherapyColor(type) }}>
                        {getTherapyIcon(type)}
                      </span>
                      <h3 className="stat-title">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    </div>
                    <div className="stat-body">
                      <div className="stat-metric">
                        <span className="metric-value" style={{ color: getTherapyColor(type) }}>
                          {stats.sessions}
                        </span>
                        <span className="metric-label">Total Sessions</span>
                      </div>
                      {stats.avgScore > 0 && (
                        <div className="stat-average">
                          {stats.avgScore?.toFixed(0)}% avg
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="logs-container">
            <div className="section-header">
              <h2 className="section-title">Recent Activity</h2>
              <div className="filter-container">
                {['all', 'articulation', 'language', 'fluency', 'gait'].map(filter => (
                  <button
                    key={filter}
                    className={`filter-button ${selectedFilter === filter ? 'active' : ''}`}
                    onClick={() => setSelectedFilter(filter)}
                  >
                    <span className="filter-icon">{filter === 'all' ? '📊' : getTherapyIcon(filter)}</span>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {getFilteredLogs().length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <p className="empty-text">No therapy sessions yet</p>
                <p className="empty-subtext">Start your therapy exercises to see your progress here</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Therapy</th>
                      <th>Level</th>
                      <th>Score</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLogs().map(log => (
                      <React.Fragment key={log._id}>
                        <tr className={log.therapyType === 'gait' ? 'gait-row' : ''}>
                          <td>
                            <div className="table-type-icon" style={{ backgroundColor: getTherapyColor(log.therapyType) }}>
                              {getTherapyIcon(log.therapyType)}
                            </div>
                          </td>
                          <td>
                            <div className="therapy-cell">
                              <span className="therapy-type">{log.therapyType.charAt(0).toUpperCase() + log.therapyType.slice(1)}</span>
                              {log.soundId && <span className="therapy-detail">Sound: {log.soundId}</span>}
                              {log.therapyType === 'articulation' && log.overallScore > 0 && (
                                <span className="therapy-detail">Trial recording</span>
                              )}
                              {(log.therapyType === 'receptive' || log.therapyType === 'expressive') && (
                                <span className="therapy-detail">
                                  {log.overallScore === 100 ? '✓' : '✗'} {log.overallScore === 100 ? 'Correct' : 'Incorrect'}
                                </span>
                              )}
                              {log.therapyType === 'gait' && log.gaitMetrics && (
                                <span className="therapy-detail">
                                  {log.gaitMetrics.step_count} steps · {log.duration?.toFixed(0)}s duration
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="level-badge">Level {log.level || 1}</span>
                          </td>
                          <td>
                            <div className="score-cell" style={{ color: getScoreColor(log.overallScore) }}>
                              <span className="score-number">{log.overallScore}%</span>
                            </div>
                          </td>
                          <td>
                            <div className="date-cell-container">
                              <span className="date-cell">{formatDate(log.createdAt)}</span>
                              {log.therapyType === 'gait' && log.gaitMetrics && (
                                <button 
                                  className={`gait-dropdown-btn ${expandedGaitRows[log._id] ? 'expanded' : ''}`}
                                  onClick={() => toggleGaitDetails(log._id)}
                                  title={expandedGaitRows[log._id] ? 'Hide details' : 'Show details'}
                                >
                                  <i className={`fas fa-chevron-${expandedGaitRows[log._id] ? 'up' : 'down'}`}></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Expandable Gait Details Row */}
                        {log.therapyType === 'gait' && log.gaitMetrics && expandedGaitRows[log._id] && (
                          <tr className="gait-details-row">
                            <td colSpan="5">
                              <div className="gait-details-container">
                                <div className="gait-metrics-grid">
                                  <div className="gait-metric-item">
                                    <i className="fas fa-shoe-prints"></i>
                                    <div>
                                      <div className="metric-label">Steps</div>
                                      <div className="metric-value">{log.gaitMetrics.step_count}</div>
                                    </div>
                                  </div>
                                  <div className="gait-metric-item">
                                    <i className="fas fa-tachometer-alt"></i>
                                    <div>
                                      <div className="metric-label">Cadence</div>
                                      <div className="metric-value">{log.gaitMetrics.cadence?.toFixed(1)} steps/min</div>
                                    </div>
                                  </div>
                                  <div className="gait-metric-item">
                                    <i className="fas fa-walking"></i>
                                    <div>
                                      <div className="metric-label">Speed</div>
                                      <div className="metric-value">{log.gaitMetrics.velocity?.toFixed(2)} m/s</div>
                                    </div>
                                  </div>
                                  <div className="gait-metric-item">
                                    <i className="fas fa-balance-scale"></i>
                                    <div>
                                      <div className="metric-label">Symmetry</div>
                                      <div className="metric-value">{log.gaitMetrics.gait_symmetry?.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                  <div className="gait-metric-item">
                                    <i className="fas fa-shield-alt"></i>
                                    <div>
                                      <div className="metric-label">Stability</div>
                                      <div className="metric-value">{log.gaitMetrics.stability_score?.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                  <div className="gait-metric-item">
                                    <i className="fas fa-heartbeat"></i>
                                    <div>
                                      <div className="metric-label">Regularity</div>
                                      <div className="metric-value">{log.gaitMetrics.step_regularity?.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                </div>
                                {log.detectedProblems && log.detectedProblems.length > 0 && (
                                  <div className="gait-problems-summary">
                                    <div className="problems-header">
                                      <i className="fas fa-exclamation-triangle"></i>
                                      <strong>Detected Issues ({log.detectedProblems.length})</strong>
                                    </div>
                                    <div className="problems-list">
                                      {log.detectedProblems.map((problem, idx) => (
                                        <div key={idx} className={`problem-badge ${problem.severity}`}>
                                          {problem.problem.replace(/_/g, ' ')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showFullHistory && healthLogs.length > 20 && (
              <button className="view-history-button" onClick={loadFullHistory}>
                <span>⏰</span>
                View Full History
              </button>
            )}

            {showFullHistory && (
              <button className="view-history-button" onClick={() => setShowFullHistory(false)}>
                <span>⬆️</span>
                Show Less
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default HealthLogs;
