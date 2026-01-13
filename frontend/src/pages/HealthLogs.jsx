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
    let filtered = healthLogs;
    if (selectedFilter !== 'all') {
      // Handle language filter - include both receptive and expressive
      if (selectedFilter === 'language') {
        filtered = filtered.filter(log => 
          log.therapyType === 'language' || 
          log.therapyType === 'receptive' || 
          log.therapyType === 'expressive'
        );
      } else {
        filtered = filtered.filter(log => log.therapyType === selectedFilter);
      }
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
            <h1 className="page-title">Health Logs</h1>
            <button onClick={onRefresh} className="refresh-button" disabled={refreshing}>
              <span className="refresh-icon">{refreshing ? '⏳' : '🔄'}</span>
              Refresh
            </button>
          </div>

          {/* Summary Card */}
          {summary && (
            <div className="summary-card">
              <h2 className="card-title">Therapy Summary</h2>
              <div className="therapy-stats-grid">
                {Object.entries(summary).map(([type, stats]) => (
                  <div key={type} className="therapy-stat-item">
                    <div className="stat-icon" style={{ backgroundColor: getTherapyColor(type) }}>
                      {getTherapyIcon(type)}
                    </div>
                    <div className="stat-info">
                      <h3 className="stat-label">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                      <p className="stat-sessions">{stats.sessions} sessions</p>
                    </div>
                    <div className="stat-score">
                      <span className="score-value" style={{ color: getTherapyColor(type) }}>
                        {stats.avgScore?.toFixed(1)}%
                      </span>
                      <span className="score-label">avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Speech Prediction */}
          {overallSpeechPrediction && overallSpeechPrediction.prediction && (
            <div className="overall-prediction-card">
              <div className="prediction-header">
                <span className="prediction-icon">🎯</span>
                <h2 className="prediction-title">Overall Speech Mastery Prediction</h2>
              </div>
              <p className="prediction-subtitle">AI-powered comprehensive speech therapy progress forecast</p>
              
              <div className="overall-main-stats">
                <div className="overall-stat-box">
                  <div className="overall-stat-header">
                    <span>⏱️</span>
                  </div>
                  <div className="overall-stat-value">{overallSpeechPrediction.prediction.predicted_days_to_mastery}</div>
                  <div className="overall-stat-label">Days to Mastery</div>
                  <div className="overall-stat-sublabel">Estimated Timeline</div>
                </div>
                <div className="stat-divider"></div>
                <div className="overall-stat-box">
                  <div className="overall-stat-header">
                    <span>📊</span>
                  </div>
                  <div className="overall-stat-value">{(overallSpeechPrediction.prediction.confidence * 100).toFixed(1)}%</div>
                  <div className="overall-stat-label">Confidence</div>
                  <div className="overall-stat-sublabel">Model Accuracy</div>
                </div>
              </div>

              {overallSpeechPrediction.breakdown && (
                <div className="therapy-breakdown">
                  <h3 className="breakdown-title">Therapy Breakdown</h3>
                  <div className="breakdown-grid">
                    {Object.entries(overallSpeechPrediction.breakdown).map(([therapy, days]) => (
                      <div key={therapy} className="breakdown-item">
                        <span className="breakdown-icon">{getTherapyIcon(therapy)}</span>
                        <span className="breakdown-label">{therapy}</span>
                        <span className="breakdown-value">{days} days</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Articulation Predictions */}
          {Object.keys(predictions).length > 0 && (
            <div className="predictions-card">
              <div className="prediction-header">
                <span className="prediction-icon">🔮</span>
                <h2 className="prediction-title">Articulation Mastery Predictions</h2>
              </div>
              <p className="prediction-subtitle">XGBoost ML predictions for sound mastery</p>
              <div className="predictions-grid">
                {Object.entries(predictions).map(([sound, data]) => (
                  <div key={sound} className="prediction-item">
                    <div className="prediction-item-header">
                      <div className="sound-badge" style={{ backgroundColor: getTherapyColor('articulation') }}>
                        {sound}
                      </div>
                      <span className="sound-name">{sound.toUpperCase()}</span>
                    </div>
                    <div className="prediction-days">
                      <span className="days-value">{data.predicted_days_to_mastery}</span>
                      <span className="days-label">days</span>
                    </div>
                    <div className="prediction-meta">
                      <span className="confidence-text">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
                      <span className="level-text">Level {data.current_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fluency Prediction */}
          {fluencyPrediction && fluencyPrediction.prediction && (
            <div className="fluency-prediction-card">
              <div className="prediction-header">
                <span className="prediction-icon">💬</span>
                <h2 className="prediction-title">Fluency Mastery Prediction</h2>
              </div>
              <p className="prediction-subtitle">ML-based fluency improvement forecast</p>
              <div className="fluency-prediction-content">
                <div className="fluency-main-stat">
                  <span className="fluency-days">{fluencyPrediction.prediction.predicted_days_to_mastery}</span>
                  <span className="fluency-label">days to mastery</span>
                </div>
                <div className="fluency-meta">
                  <div className="fluency-meta-item">
                    <span>📊</span>
                    <span>Confidence: {(fluencyPrediction.prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="fluency-meta-item">
                    <span>📈</span>
                    <span>Current Level: {fluencyPrediction.prediction.current_level}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Language Predictions */}
          {(receptivePrediction || expressivePrediction) && (
            <div className="language-predictions-container">
              {receptivePrediction && receptivePrediction.prediction && (
                <div className="language-prediction-card receptive">
                  <div className="prediction-header">
                    <span className="prediction-icon">👂</span>
                    <h3 className="prediction-title">Receptive Language</h3>
                  </div>
                  <div className="language-prediction-content">
                    <div className="language-main-stat">
                      <span className="language-days">{receptivePrediction.prediction.predicted_days_to_mastery}</span>
                      <span className="language-label">days</span>
                    </div>
                    <div className="language-meta">
                      <span>Confidence: {(receptivePrediction.prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
              {expressivePrediction && expressivePrediction.prediction && (
                <div className="language-prediction-card expressive">
                  <div className="prediction-header">
                    <span className="prediction-icon">🗣️</span>
                    <h3 className="prediction-title">Expressive Language</h3>
                  </div>
                  <div className="language-prediction-content">
                    <div className="language-main-stat">
                      <span className="language-days">{expressivePrediction.prediction.predicted_days_to_mastery}</span>
                      <span className="language-label">days</span>
                    </div>
                    <div className="language-meta">
                      <span>Confidence: {(expressivePrediction.prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter Buttons */}
          <div className="filter-container">
            {['all', 'articulation', 'language', 'fluency', 'gait'].map(filter => (
              <button
                key={filter}
                className={`filter-button ${selectedFilter === filter ? 'active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                <span className="filter-icon">{filter === 'all' ? '📊' : getTherapyIcon(filter)}</span>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Activity Timeline */}
          <div className="logs-container">
            <h2 className="section-title">
              Activity Timeline ({getFilteredLogs().length} sessions)
            </h2>
            
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
                      <th>Details</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLogs().map(log => (
                      <tr key={log._id}>
                        <td>
                          <div className="table-type-icon" style={{ backgroundColor: getTherapyColor(log.therapyType) }}>
                            {getTherapyIcon(log.therapyType)}
                          </div>
                        </td>
                        <td>
                          <div className="therapy-cell">
                            <span className="therapy-type">{log.therapyType.charAt(0).toUpperCase() + log.therapyType.slice(1)}</span>
                            {log.soundId && <span className="therapy-detail">Sound: {log.soundId}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="level-badge">Level {log.level || 1}</span>
                        </td>
                        <td>
                          <div className="score-cell" style={{ color: getScoreColor(log.overallScore) }}>
                            <span className="score-number">{log.overallScore}</span>
                          </div>
                        </td>
                        <td>
                          <div className="details-cell">
                            {log.trials !== undefined && (
                              <span className="detail-item">🎯 {log.trials} trials</span>
                            )}
                            {log.correctCount !== undefined && log.trials && (
                              <span className="detail-item">✅ {log.correctCount}/{log.trials} correct</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="date-cell">{formatDate(log.createdAt)}</span>
                        </td>
                      </tr>
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
