import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { healthService, diagnosticComparisonService } from '../services/api';
import './HealthLogs.css';

function HealthLogs({ onLogout, onFacilityExit }) {
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
  const [facilityComparison, setFacilityComparison] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHealthData();
    fetchPredictions();
    fetchFacilityComparison();
    return () => { cancelled = true; };
  }, []);

  const fetchHealthData = async () => {
    let cancelled = false;
    try {
      setLoading(true);
      setError(null);

      const [logsData, summaryData] = await Promise.all([
        healthService.getLogs(50, false),
        healthService.getSummary()
      ]);

      if (!cancelled) {
        setHealthLogs(logsData.logs || []);
        setSummary(summaryData.summary || null);
        
        // Debug: Check exercise plan and gait score data
        console.log('🔍 Health Logs Data:', logsData.logs?.filter(l => l.therapyType === 'gait').map(l => ({
          date: l.createdAt,
          hasExercisePlan: !!l.exercisePlan,
          exercises: l.exercisePlan?.exercises?.length || 0,
          hasGaitScore: !!l.gait_score,
          gaitScore: l.gait_score?.score,
          gaitGrade: l.gait_score?.grade
        })));
      }
    } catch (err) {
      if (!cancelled) {
        console.error('Error fetching health data:', err);
        setError(err.response?.data?.message || 'Failed to load health data');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchPredictions = async () => {
    let cancelled = false;
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

      if (!cancelled) {
        if (articulationData) setPredictions(articulationData.predictions || {});
        if (fluencyData) setFluencyPrediction(fluencyData);
        if (receptiveData) setReceptivePrediction(receptiveData);
        if (expressiveData) setExpressivePrediction(expressiveData);
        if (overallData) setOverallSpeechPrediction(overallData);
      }
    } catch (error) {
      if (!cancelled) {
        console.error('Error fetching predictions:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    await fetchPredictions();
    await fetchFacilityComparison();
  };

  const fetchFacilityComparison = async () => {
    let cancelled = false;
    try {
      const data = await diagnosticComparisonService.getMyComparison();
      if (!cancelled && data.success && data.has_facility_data) {
        setFacilityComparison(data);
      }
    } catch (error) {
      if (!cancelled) {
        console.log('Facility comparison not available');
      }
    }
  };

  const getFacilityDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined) return { text: 'N/A', className: 'fc-delta-na' };
    if (delta > 0) return { text: `▲ +${delta}%`, className: 'fc-delta-positive' };
    if (delta < 0) return { text: `▼ ${delta}%`, className: 'fc-delta-negative' };
    return { text: '— 0%', className: 'fc-delta-neutral' };
  };

  const getScoreBand = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', className: 'fc-band-na' };
    if (score >= 86) return { label: 'Mastered', className: 'fc-band-mastered' };
    if (score >= 71) return { label: 'Functional', className: 'fc-band-functional' };
    if (score >= 51) return { label: 'Mild', className: 'fc-band-mild' };
    if (score >= 31) return { label: 'Moderate', className: 'fc-band-moderate' };
    return { label: 'Severe', className: 'fc-band-severe' };
  };

  const getAlertBadge = (delta) => {
    if (delta === null || delta === undefined) return { text: 'No Data', className: 'fc-alert-nodata', icon: '📋' };
    if (delta >= 20) return { text: 'Great Progress!', className: 'fc-alert-great', icon: '🎉' };
    if (delta >= 5) return { text: 'Improving', className: 'fc-alert-good', icon: '📈' };
    if (delta >= -3) return { text: 'Stable', className: 'fc-alert-stable', icon: '➡️' };
    if (delta >= -10) return { text: 'Keep Practicing', className: 'fc-alert-caution', icon: '💪' };
    return { text: 'Needs Focus', className: 'fc-alert-warning', icon: '⚠️' };
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
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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
        <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
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

          {/* Facility vs Home Comparison Card */}
          {facilityComparison && facilityComparison.has_facility_data && (
            <div className="fc-comparison-card">
              <div className="fc-header">
                <div className="fc-header-left">
                  <span className="fc-header-icon">🏥</span>
                  <div>
                    <h2 className="fc-title">Facility vs. Home Progress</h2>
                    <p className="fc-subtitle">
                      Based on your {facilityComparison.assessment_type} diagnostic ({new Date(facilityComparison.assessment_date).toLocaleDateString()})
                      {facilityComparison.assessor_name && ` • Assessed by ${facilityComparison.assessor_name}`}
                    </p>
                  </div>
                </div>
                {facilityComparison.severity_level && (
                  <span className={`fc-severity-badge fc-severity-${facilityComparison.severity_level}`}>
                    {facilityComparison.severity_level.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Summary Insights */}
              {facilityComparison.summary_insights && Object.keys(facilityComparison.summary_insights).length > 0 && (
                <div className="fc-insights-banner">
                  <div className="fc-insights-stats">
                    <div className="fc-insight-pill" style={{ color: facilityComparison.summary_insights.overall_avg_delta >= 0 ? '#065f46' : '#991b1b', background: facilityComparison.summary_insights.overall_avg_delta >= 0 ? '#d1fae5' : '#fee2e2' }}>
                      {facilityComparison.summary_insights.overall_avg_delta >= 0 ? '📈' : '📉'} Overall: {facilityComparison.summary_insights.overall_avg_delta >= 0 ? '+' : ''}{facilityComparison.summary_insights.overall_avg_delta}%
                    </div>
                    {facilityComparison.summary_insights.strongest_area && (
                      <div className="fc-insight-pill" style={{ color: '#065f46', background: '#d1fae5' }}>
                        🌟 Best: {facilityComparison.summary_insights.strongest_area.metric}
                      </div>
                    )}
                    {facilityComparison.summary_insights.weakest_area && facilityComparison.summary_insights.weakest_area.delta < 0 && (
                      <div className="fc-insight-pill" style={{ color: '#92400e', background: '#fef3c7' }}>
                        💪 Focus: {facilityComparison.summary_insights.weakest_area.metric}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comparison Table */}
              <div className="fc-table-wrapper">
                <table className="fc-comparison-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Facility</th>
                      <th>At-Home</th>
                      <th>Change</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Articulation sounds */}
                    {Object.entries(facilityComparison.facility_scores?.articulation || {}).map(([sound, facilityVal]) => {
                      const homeVal = facilityComparison.home_scores?.articulation?.[sound];
                      const delta = facilityComparison.deltas?.articulation?.[sound];
                      const d = getFacilityDeltaDisplay(delta);
                      const hBand = getScoreBand(homeVal);
                      const alert = getAlertBadge(delta);
                      return (
                        <tr key={`art-${sound}`}>
                          <td className="fc-table-metric">
                            <span className="fc-table-icon" style={{ backgroundColor: '#9C27B0' }}>🗣️</span>
                            /{sound.toUpperCase()}/ Sound
                          </td>
                          <td className="fc-table-score fc-table-facility">{facilityVal != null ? `${facilityVal}%` : '—'}</td>
                          <td className="fc-table-score fc-table-home">
                            {homeVal != null ? `${homeVal}%` : '—'}
                            {homeVal != null && <span className={`fc-table-band ${hBand.className}`}>{hBand.label}</span>}
                          </td>
                          <td className={`fc-table-delta ${d.className}`}>{d.text}</td>
                          <td className="fc-table-status"><span className={`fc-alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span></td>
                        </tr>
                      );
                    })}

                    {/* Fluency */}
                    {facilityComparison.facility_scores?.fluency != null && (() => {
                      const fVal = facilityComparison.facility_scores.fluency;
                      const hVal = facilityComparison.home_scores?.fluency;
                      const delta = facilityComparison.deltas?.fluency;
                      const d = getFacilityDeltaDisplay(delta);
                      const hBand = getScoreBand(hVal);
                      const alert = getAlertBadge(delta);
                      return (
                        <tr>
                          <td className="fc-table-metric"><span className="fc-table-icon" style={{ backgroundColor: '#FF9800' }}>💬</span>Fluency</td>
                          <td className="fc-table-score fc-table-facility">{fVal}%</td>
                          <td className="fc-table-score fc-table-home">
                            {hVal != null ? `${hVal}%` : '—'}
                            {hVal != null && <span className={`fc-table-band ${hBand.className}`}>{hBand.label}</span>}
                          </td>
                          <td className={`fc-table-delta ${d.className}`}>{d.text}</td>
                          <td className="fc-table-status"><span className={`fc-alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span></td>
                        </tr>
                      );
                    })()}

                    {/* Receptive */}
                    {facilityComparison.facility_scores?.receptive != null && (() => {
                      const fVal = facilityComparison.facility_scores.receptive;
                      const hVal = facilityComparison.home_scores?.receptive;
                      const delta = facilityComparison.deltas?.receptive;
                      const d = getFacilityDeltaDisplay(delta);
                      const hBand = getScoreBand(hVal);
                      const alert = getAlertBadge(delta);
                      return (
                        <tr>
                          <td className="fc-table-metric"><span className="fc-table-icon" style={{ backgroundColor: '#2196F3' }}>👂</span>Receptive</td>
                          <td className="fc-table-score fc-table-facility">{fVal}%</td>
                          <td className="fc-table-score fc-table-home">
                            {hVal != null ? `${hVal}%` : '—'}
                            {hVal != null && <span className={`fc-table-band ${hBand.className}`}>{hBand.label}</span>}
                          </td>
                          <td className={`fc-table-delta ${d.className}`}>{d.text}</td>
                          <td className="fc-table-status"><span className={`fc-alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span></td>
                        </tr>
                      );
                    })()}

                    {/* Expressive */}
                    {facilityComparison.facility_scores?.expressive != null && (() => {
                      const fVal = facilityComparison.facility_scores.expressive;
                      const hVal = facilityComparison.home_scores?.expressive;
                      const delta = facilityComparison.deltas?.expressive;
                      const d = getFacilityDeltaDisplay(delta);
                      const hBand = getScoreBand(hVal);
                      const alert = getAlertBadge(delta);
                      return (
                        <tr>
                          <td className="fc-table-metric"><span className="fc-table-icon" style={{ backgroundColor: '#2196F3' }}>🗣️</span>Expressive</td>
                          <td className="fc-table-score fc-table-facility">{fVal}%</td>
                          <td className="fc-table-score fc-table-home">
                            {hVal != null ? `${hVal}%` : '—'}
                            {hVal != null && <span className={`fc-table-band ${hBand.className}`}>{hBand.label}</span>}
                          </td>
                          <td className={`fc-table-delta ${d.className}`}>{d.text}</td>
                          <td className="fc-table-status"><span className={`fc-alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span></td>
                        </tr>
                      );
                    })()}

                    {/* Gait */}
                    {facilityComparison.facility_scores?.gait?.overall_gait != null && (() => {
                      const fVal = facilityComparison.facility_scores.gait.overall_gait;
                      const hVal = facilityComparison.home_scores?.gait?.overall_gait;
                      const delta = facilityComparison.deltas?.gait;
                      const d = getFacilityDeltaDisplay(delta);
                      const hBand = getScoreBand(hVal);
                      const alert = getAlertBadge(delta);
                      return (
                        <tr>
                          <td className="fc-table-metric"><span className="fc-table-icon" style={{ backgroundColor: '#4CAF50' }}>🚶</span>Gait</td>
                          <td className="fc-table-score fc-table-facility">{fVal}%</td>
                          <td className="fc-table-score fc-table-home">
                            {hVal != null ? `${hVal}%` : '—'}
                            {hVal != null && <span className={`fc-table-band ${hBand.className}`}>{hBand.label}</span>}
                          </td>
                          <td className={`fc-table-delta ${d.className}`}>{d.text}</td>
                          <td className="fc-table-status"><span className={`fc-alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span></td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Visual Bar Chart */}
              <div className="fc-bar-chart-section">
                <h3 className="fc-section-title">📈 Visual Comparison</h3>
                <div className="fc-bar-chart">
                  {[
                    ...Object.entries(facilityComparison.facility_scores?.articulation || {}).map(([sound, fVal]) => ({
                      label: `/${sound.toUpperCase()}/`,
                      facility: fVal,
                      home: facilityComparison.home_scores?.articulation?.[sound]
                    })),
                    { label: 'Fluency', facility: facilityComparison.facility_scores?.fluency, home: facilityComparison.home_scores?.fluency },
                    { label: 'Receptive', facility: facilityComparison.facility_scores?.receptive, home: facilityComparison.home_scores?.receptive },
                    { label: 'Expressive', facility: facilityComparison.facility_scores?.expressive, home: facilityComparison.home_scores?.expressive },
                    ...(facilityComparison.facility_scores?.gait?.overall_gait != null ? [{ label: 'Gait', facility: facilityComparison.facility_scores.gait.overall_gait, home: facilityComparison.home_scores?.gait?.overall_gait }] : [])
                  ].filter(item => item.facility != null || item.home != null).map((item, idx) => (
                    <div key={idx} className="fc-bar-row">
                      <span className="fc-bar-label">{item.label}</span>
                      <div className="fc-bar-tracks">
                        <div className="fc-bar-track">
                          <div className="fc-bar-fill fc-bar-facility" style={{ width: `${item.facility || 0}%` }}>
                            {item.facility != null && <span className="fc-bar-value">{item.facility}%</span>}
                          </div>
                        </div>
                        <div className="fc-bar-track">
                          <div className="fc-bar-fill fc-bar-home" style={{ width: `${item.home || 0}%` }}>
                            {item.home != null && <span className="fc-bar-value">{item.home}%</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="fc-bar-legend">
                    <span className="fc-legend-item"><span className="fc-legend-dot fc-legend-facility"></span> Facility</span>
                    <span className="fc-legend-item"><span className="fc-legend-dot fc-legend-home"></span> At-Home</span>
                  </div>
                </div>
              </div>

              {/* Therapist Notes */}
              {facilityComparison.notes && (
                <div className="fc-notes-section">
                  <h3 className="fc-section-title">📝 Therapist Notes</h3>
                  <p className="fc-notes-text">{facilityComparison.notes}</p>
                </div>
              )}

              {/* Recommended Focus Areas */}
              {facilityComparison.recommended_focus && facilityComparison.recommended_focus.length > 0 && (
                <div className="fc-focus-section">
                  <h3 className="fc-section-title">🎯 Recommended Focus Areas</h3>
                  <div className="fc-focus-list">
                    {facilityComparison.recommended_focus.map((focus, idx) => (
                      <div key={idx} className="fc-focus-item">
                        <span className="fc-focus-bullet">•</span>
                        <span>{focus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fc-footer">
                <span className="fc-footer-text">Keep up the great work! 🎉</span>
              </div>
            </div>
          )}

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
                                {/* Gait Score Display */}
                                {log.gait_score && (
                                  <div className="gait-score-section">
                                    <div className={`gait-score-badge gait-score-${log.gait_score.color}`}>
                                      <div className="score-circle">
                                        <div className="score-number">{log.gait_score.score}</div>
                                        <div className="score-label">/ 100</div>
                                      </div>
                                      <div className="score-info">
                                        <div className="score-grade">
                                          <span className="grade-emoji">{log.gait_score.grade_emoji}</span>
                                          <span className="grade-text">{log.gait_score.grade}</span>
                                        </div>
                                        <div className="score-recommendation">{log.gait_score.recommendation}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
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
                                {log.exercisePlan && log.exercisePlan.exercises && log.exercisePlan.exercises.length > 0 && (
                                  <div className="gait-exercises-summary">
                                    <div className="exercises-header">
                                      <i className="fas fa-dumbbell"></i>
                                      <strong>Recommended Exercises ({log.exercisePlan.exercises.length})</strong>
                                    </div>
                                    <div className="exercises-list">
                                      {log.exercisePlan.exercises.map((exercise, idx) => (
                                        <div key={idx} className="exercise-item-card">
                                          <div className="exercise-number">{idx + 1}</div>
                                          <div className="exercise-info">
                                            <div className="exercise-title">{exercise.exercise_name}</div>
                                            <div className="exercise-meta">
                                              <span className="exercise-target">
                                                <i className="fas fa-bullseye"></i> {exercise.problem_targeted?.replace(/_/g, ' ')}
                                              </span>
                                              <span className="exercise-difficulty">
                                                <i className="fas fa-signal"></i> {exercise.difficulty}
                                              </span>
                                            </div>
                                          </div>
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
