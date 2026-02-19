import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { healthAPI, diagnosticComparisonAPI } from '../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

const { width } = Dimensions.get('window');

const HealthScreen = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthLogs, setHealthLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [fluencyPrediction, setFluencyPrediction] = useState(null);
  const [receptivePrediction, setReceptivePrediction] = useState(null);
  const [expressivePrediction, setExpressivePrediction] = useState(null);
  const [overallSpeechPrediction, setOverallSpeechPrediction] = useState(null);
  const [facilityComparison, setFacilityComparison] = useState(null);

  useEffect(() => {
    fetchHealthData();
    fetchPredictions();
    fetchFacilityComparison();
  }, []);

  const fetchHealthData = async () => {
    try {
      setError(null);
      
      const [logsResponse, summaryResponse] = await Promise.all([
        healthAPI.getLogs(),
        healthAPI.getSummary()
      ]);

      if (logsResponse.success) {
        setHealthLogs(logsResponse.data.logs);
        setSummary(logsResponse.data.summary);
        setHasMore(logsResponse.data.hasMore || false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Fetch articulation predictions
      const sounds = ['s', 'r', 'l', 'k', 'th'];
      const predictionPromises = sounds.map(async (soundId) => {
        try {
          const response = await axios.post(
            `${API_URL}/articulation/predict-mastery`,
            { sound_id: soundId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data.success) {
            return { soundId, data: response.data.prediction };
          }
        } catch (err) {
          // Prediction not available
        }
        return { soundId, data: null };
      });

      const results = await Promise.all(predictionPromises);
      const predictionsMap = {};
      results.forEach(({ soundId, data }) => {
        if (data) {
          predictionsMap[soundId] = data;
        }
      });
      
      setPredictions(predictionsMap);

      // Fetch fluency prediction
      try {
        const fluencyResponse = await axios.post(
          `${API_URL}/fluency/predict-mastery`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (fluencyResponse.data.success) {
          setFluencyPrediction(fluencyResponse.data.prediction);
          console.log('✅ Fluency prediction loaded in HealthScreen');
        }
      } catch (err) {
        console.log('Fluency prediction not available');
      }

      // Fetch receptive language prediction
      try {
        const receptiveResponse = await axios.post(
          `${API_URL}/receptive/predict-mastery`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (receptiveResponse.data.success && receptiveResponse.data.prediction) {
          // Convert confidence from 0-1 to 0-100 percentage
          const predictionData = {
            ...receptiveResponse.data.prediction,
            confidence: Math.round(receptiveResponse.data.prediction.confidence * 100)
          };
          setReceptivePrediction(predictionData);
          console.log('✅ Receptive language prediction loaded in HealthScreen:', predictionData);
        }
      } catch (err) {
        console.log('Receptive language prediction not available');
      }

      // Fetch expressive language prediction
      try {
        const expressiveResponse = await axios.post(
          `${API_URL}/expressive/predict-mastery`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (expressiveResponse.data.success && expressiveResponse.data.prediction) {
          // Convert confidence from 0-1 to 0-100 percentage
          const predictionData = {
            ...expressiveResponse.data.prediction,
            confidence: Math.round(expressiveResponse.data.prediction.confidence * 100)
          };
          setExpressivePrediction(predictionData);
          console.log('✅ Expressive language prediction loaded in HealthScreen:', predictionData);
        }
      } catch (err) {
        console.log('Expressive language prediction not available');
      }

      // Fetch overall speech improvement prediction (combines all therapies)
      try {
        const overallResponse = await axios.post(
          `${API_URL}/speech/predict-overall-improvement`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (overallResponse.data.success && overallResponse.data.prediction) {
          // Convert confidence from 0-1 to 0-100 percentage
          const predictionData = {
            ...overallResponse.data.prediction,
            confidence: Math.round(overallResponse.data.prediction.confidence * 100)
          };
          setOverallSpeechPrediction(predictionData);
          console.log('✅ Overall speech improvement prediction loaded in HealthScreen:', predictionData);
        }
      } catch (err) {
        console.log('Overall speech prediction not available');
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    await fetchFacilityComparison();
  };

  const fetchFacilityComparison = async () => {
    try {
      const data = await diagnosticComparisonAPI.getMyComparison();
      if (data.success && data.has_facility_data) {
        setFacilityComparison(data);
      }
    } catch (error) {
      console.log('Facility comparison not available');
    }
  };

  const getFacilityDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined) return { text: 'N/A', color: '#999' };
    if (delta > 0) return { text: `▲ +${delta}%`, color: '#10b981' };
    if (delta < 0) return { text: `▼ ${delta}%`, color: '#ef4444' };
    return { text: '— 0%', color: '#6b7280' };
  };

  const getFcScoreBand = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', color: '#999' };
    if (score >= 86) return { label: 'Mastered', color: '#10b981' };
    if (score >= 71) return { label: 'Functional', color: '#3b82f6' };
    if (score >= 51) return { label: 'Mild', color: '#f59e0b' };
    if (score >= 31) return { label: 'Moderate', color: '#f97316' };
    return { label: 'Severe', color: '#ef4444' };
  };

  const getFcAlertBadge = (delta) => {
    if (delta === null || delta === undefined) return { text: 'No Data', color: '#999', icon: '📋' };
    if (delta >= 20) return { text: 'Great Progress!', color: '#10b981', icon: '🎉' };
    if (delta >= 5) return { text: 'Improving', color: '#3b82f6', icon: '📈' };
    if (delta >= -3) return { text: 'Stable', color: '#6b7280', icon: '➡️' };
    if (delta >= -10) return { text: 'Keep Practicing', color: '#f59e0b', icon: '💪' };
    return { text: 'Needs Focus', color: '#ef4444', icon: '⚠️' };
  };

  const loadFullHistory = async () => {
    try {
      setShowFullHistory(true);
      const logsResponse = await healthAPI.getLogsAll();
      if (logsResponse.success) {
        setHealthLogs(logsResponse.data.logs);
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load full history');
    }
  };

  const getFilteredLogs = () => {
    let filtered = healthLogs;
    if (selectedFilter !== 'all') {
      filtered = healthLogs.filter(log => log.type === selectedFilter);
    }
    return filtered;
  };

  const renderLogCard = (log) => {
    const getTypeColor = (type) => {
      switch (type) {
        case 'articulation': return '#FF6B6B';
        case 'fluency': return '#4ECDC4';
        case 'receptive': return '#95E1D3';
        case 'expressive': return '#F38181';
        case 'gait': return '#6B9AC4';
        default: return '#999';
      }
    };

    const getTypeIcon = (type) => {
      switch (type) {
        case 'articulation': return 'mic';
        case 'fluency': return 'chatbubbles';
        case 'receptive': return 'ear';
        case 'expressive': return 'chatbox';
        case 'gait': return 'walk';
        default: return 'fitness';
      }
    };

    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
    };

    const getScoreColor = (score) => {
      if (score >= 80) return '#4CAF50';
      if (score >= 60) return '#FFC107';
      return '#F44336';
    };

    return (
      <View key={log.id} style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={[styles.typeIcon, { backgroundColor: getTypeColor(log.type) }]}>
            <Ionicons name={getTypeIcon(log.type)} size={18} color="#FFFFFF" />
          </View>
          <View style={styles.logHeaderText}>
            <Text style={styles.therapyName}>{log.therapyName}</Text>
            <Text style={styles.logDate}>{formatDate(log.timestamp)}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(log.score) }]}>
            <Text style={styles.scoreText}>{Math.round(log.score)}</Text>
          </View>
        </View>

        {/* Compact details - no heavy containers */}
        <View style={styles.logDetails}>
          {log.type === 'articulation' && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="volume-high" size={16} color="#666" />
                <Text style={styles.detailText}>Sound: {log.soundId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="layers" size={16} color="#666" />
                <Text style={styles.detailText}>Level {log.level} - {log.target}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="repeat" size={16} color="#666" />
                <Text style={styles.detailText}>Trial #{log.trialNumber}</Text>
              </View>
            </>
          )}

          {log.type === 'fluency' && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="layers" size={16} color="#666" />
                <Text style={styles.detailText}>Level {log.level}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="book" size={16} color="#666" />
                <Text style={styles.detailText}>{log.exerciseName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-circle" size={16} color={log.completed ? '#4CAF50' : '#999'} />
                <Text style={styles.detailText}>{log.completed ? 'Completed' : 'In Progress'}</Text>
              </View>
            </>
          )}

          {(log.type === 'receptive' || log.type === 'expressive') && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="book" size={16} color="#666" />
                <Text style={styles.detailText}>Exercise #{log.exerciseId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name={log.correct ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={log.correct ? '#4CAF50' : '#F44336'} 
                />
                <Text style={styles.detailText}>{log.correct ? 'Correct' : 'Incorrect'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="repeat" size={16} color="#666" />
                <Text style={styles.detailText}>{log.attempts} attempt(s)</Text>
              </View>
            </>
          )}

          {log.type === 'gait' && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="footsteps" size={16} color="#666" />
                <Text style={styles.detailText}>Steps: {log.metrics.stepCount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="speedometer" size={16} color="#666" />
                <Text style={styles.detailText}>Cadence: {log.metrics.cadence.toFixed(1)} steps/min</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="resize" size={16} color="#666" />
                <Text style={styles.detailText}>Stride: {log.metrics.strideLength.toFixed(2)}m</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="trending-up" size={16} color="#666" />
                <Text style={styles.detailText}>Speed: {log.metrics.velocity.toFixed(2)} m/s</Text>
              </View>
              <View style={styles.gaitMetricsGrid}>
                <View style={styles.gaitMetricItem}>
                  <Text style={styles.gaitMetricLabel}>Symmetry</Text>
                  <Text style={styles.gaitMetricValue}>
                    {(log.metrics.gaitSymmetry * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.gaitMetricItem}>
                  <Text style={styles.gaitMetricLabel}>Stability</Text>
                  <Text style={styles.gaitMetricValue}>
                    {(log.metrics.stabilityScore * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.gaitMetricItem}>
                  <Text style={styles.gaitMetricLabel}>Regularity</Text>
                  <Text style={styles.gaitMetricValue}>
                    {(log.metrics.stepRegularity * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={styles.dataQualityBadge}>
                <Ionicons 
                  name={log.dataQuality === 'excellent' || log.dataQuality === 'good' ? 'checkmark-circle' : 'information-circle'} 
                  size={14} 
                  color={log.dataQuality === 'excellent' ? '#4CAF50' : log.dataQuality === 'good' ? '#FFC107' : '#999'} 
                />
                <Text style={styles.dataQualityText}>
                  Data Quality: {log.dataQuality}
                </Text>
              </View>

              {/* Exercise Plan Section */}
              {log.exercisePlan && (
                <View style={styles.exercisePlanSection}>
                  <View style={styles.exercisePlanHeader}>
                    <Ionicons name="fitness" size={18} color="#C9302C" />
                    <Text style={styles.exercisePlanTitle}>Exercise Plan</Text>
                    <View style={[
                      styles.exercisePlanStatusBadge,
                      { backgroundColor: log.exercisePlan.status === 'completed' ? '#4CAF50' : '#FFC107' }
                    ]}>
                      <Text style={styles.exercisePlanStatusText}>
                        {log.exercisePlan.status === 'completed' ? 'Completed' : 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.exercisePlanProgress}>
                    <Text style={styles.exercisePlanProgressText}>
                      {log.exercisePlan.completedExercises} / {log.exercisePlan.totalExercises} exercises completed
                    </Text>
                    <View style={styles.exercisePlanProgressBar}>
                      <View 
                        style={[
                          styles.exercisePlanProgressFill,
                          { width: `${(log.exercisePlan.completedExercises / log.exercisePlan.totalExercises) * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>

                  {log.exercisePlan.exercises && log.exercisePlan.exercises.length > 0 && (
                    <View style={styles.exerciseList}>
                      <Text style={styles.exerciseListTitle}>Exercises:</Text>
                      {log.exercisePlan.exercises.map((exercise, index) => (
                        <View key={index} style={styles.exerciseItem}>
                          <Ionicons 
                            name={exercise.completed ? "checkmark-circle" : "ellipse-outline"} 
                            size={16} 
                            color={exercise.completed ? "#4CAF50" : "#999"} 
                          />
                          <Text style={[
                            styles.exerciseItemText,
                            exercise.completed && styles.exerciseItemTextCompleted
                          ]}>
                            {exercise.exercise_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderSummaryCard = () => {
    if (!summary) return null;

    const therapyTypes = [
      { key: 'articulation', label: 'Articulation', color: '#FF6B6B', icon: 'mic' },
      { key: 'fluency', label: 'Fluency', color: '#4ECDC4', icon: 'chatbubbles' },
      { key: 'receptive', label: 'Receptive', color: '#95E1D3', icon: 'ear' },
      { key: 'expressive', label: 'Expressive', color: '#F38181', icon: 'chatbox' },
      { key: 'gait', label: 'Physical', color: '#6B9AC4', icon: 'walk' },
    ];

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Your Therapy Progress</Text>
        
        {therapyTypes.map(therapy => {
          const data = summary[therapy.key];
          if (!data || data.sessions === 0) return null;
          
          return (
            <View key={therapy.key} style={styles.therapyStatRow}>
              <View style={styles.therapyStatLeft}>
                <View style={[styles.therapyStatIcon, { backgroundColor: therapy.color }]}>
                  <Ionicons name={therapy.icon} size={16} color="#FFFFFF" />
                </View>
                <View style={styles.therapyStatInfo}>
                  <Text style={styles.therapyStatLabel}>{therapy.label}</Text>
                  <Text style={styles.therapyStatSessions}>{data.sessions} sessions</Text>
                </View>
              </View>
              <View style={styles.therapyStatRight}>
                <Text style={styles.therapyStatScore}>{data.averageScore}%</Text>
                <Text style={styles.therapyStatAvg}>avg</Text>
              </View>
            </View>
          );
        })}

        {Object.values(summary).every(v => !v || v.sessions === 0) && (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle-outline" size={40} color="#CCC" />
            <Text style={styles.noDataText}>No therapy sessions yet</Text>
          </View>
        )}
      </View>
    );
  };

  const renderOverallSpeechPredictionCard = () => {
    if (!overallSpeechPrediction) return null;

    return (
      <View style={styles.overallPredictionCard}>
        <View style={styles.overallPredictionHeader}>
          <Ionicons name="trophy" size={28} color="#FF6B6B" />
          <Text style={styles.overallPredictionTitle}>Overall Speech Therapy Progress</Text>
        </View>
        <Text style={styles.overallPredictionSubtitle}>
          AI prediction combining all therapy types (Articulation, Fluency, Language)
        </Text>
        
        <View style={styles.overallMainStats}>
          <View style={styles.overallStatBox}>
            <View style={styles.overallStatHeader}>
              <Ionicons name="calendar-outline" size={24} color="#FF6B6B" />
              <Text style={styles.overallStatValue}>{overallSpeechPrediction.weeks_to_completion}</Text>
            </View>
            <Text style={styles.overallStatLabel}>Weeks to Complete</Text>
            <Text style={styles.overallStatSubLabel}>All speech therapies</Text>
          </View>
          
          <View style={styles.overallStatDivider} />
          
          <View style={styles.overallStatBox}>
            <View style={styles.overallStatHeader}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.overallStatValue}>{overallSpeechPrediction.improvement_rate_per_week}%</Text>
            </View>
            <Text style={styles.overallStatLabel}>Weekly Improvement</Text>
            <Text style={styles.overallStatSubLabel}>Average rate</Text>
          </View>
        </View>
        
        <View style={styles.overallDetailedStats}>
          <View style={styles.overallDetailRow}>
            <View style={styles.overallDetailItem}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.overallDetailLabel}>Current Progress:</Text>
              <Text style={styles.overallDetailValue}>{overallSpeechPrediction.current_overall_accuracy}%</Text>
            </View>
            <View style={styles.overallDetailItem}>
              <Ionicons name="flash" size={18} color="#FFC107" />
              <Text style={styles.overallDetailLabel}>Total Trials:</Text>
              <Text style={styles.overallDetailValue}>{overallSpeechPrediction.total_trials}</Text>
            </View>
          </View>
          
          <View style={styles.overallDetailRow}>
            <View style={styles.overallDetailItem}>
              <Ionicons name="layers" size={18} color="#2196F3" />
              <Text style={styles.overallDetailLabel}>Active Therapies:</Text>
              <Text style={styles.overallDetailValue}>{overallSpeechPrediction.therapy_types_active}/4</Text>
            </View>
            <View style={styles.overallDetailItem}>
              <Ionicons name="analytics" size={18} color="#9C27B0" />
              <Text style={styles.overallDetailLabel}>Confidence:</Text>
              <Text style={styles.overallDetailValue}>{overallSpeechPrediction.confidence}%</Text>
            </View>
          </View>
        </View>
        
        {/* Individual Therapy Breakdown */}
        <View style={styles.therapyBreakdown}>
          <Text style={styles.therapyBreakdownTitle}>Individual Therapy Accuracy:</Text>
          <View style={styles.therapyBreakdownGrid}>
            {overallSpeechPrediction.articulation_accuracy > 0 && (
              <View style={styles.therapyBreakdownItem}>
                <Text style={styles.therapyBreakdownIcon}>🗣️</Text>
                <Text style={styles.therapyBreakdownLabel}>Articulation</Text>
                <Text style={styles.therapyBreakdownValue}>{overallSpeechPrediction.articulation_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.fluency_accuracy > 0 && (
              <View style={styles.therapyBreakdownItem}>
                <Text style={styles.therapyBreakdownIcon}>💬</Text>
                <Text style={styles.therapyBreakdownLabel}>Fluency</Text>
                <Text style={styles.therapyBreakdownValue}>{overallSpeechPrediction.fluency_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.receptive_accuracy > 0 && (
              <View style={styles.therapyBreakdownItem}>
                <Text style={styles.therapyBreakdownIcon}>👂</Text>
                <Text style={styles.therapyBreakdownLabel}>Receptive</Text>
                <Text style={styles.therapyBreakdownValue}>{overallSpeechPrediction.receptive_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.expressive_accuracy > 0 && (
              <View style={styles.therapyBreakdownItem}>
                <Text style={styles.therapyBreakdownIcon}>📢</Text>
                <Text style={styles.therapyBreakdownLabel}>Expressive</Text>
                <Text style={styles.therapyBreakdownValue}>{overallSpeechPrediction.expressive_accuracy}%</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.predictionFooter}>
          <Ionicons name="information-circle-outline" size={14} color="#64748B" />
          <Text style={styles.predictionFooterText}>
            Powered by XGBoost Machine Learning (R² = 96.5%)
          </Text>
        </View>
      </View>
    );
  };

  const renderPredictionsCard = () => {
    const availablePredictions = Object.entries(predictions);
    if (availablePredictions.length === 0) return null;

    const soundColors = {
      s: '#C9302C',
      r: '#4A90E2',
      l: '#F4A460',
      k: '#9B59B6',
      th: '#27AE60'
    };

    const soundNames = {
      s: 'S-Sound',
      r: 'R-Sound',
      l: 'L-Sound',
      k: 'K-Sound',
      th: 'TH-Sound'
    };

    return (
      <View style={styles.predictionsCard}>
        <View style={styles.predictionsHeader}>
          <Ionicons name="trending-up" size={22} color="#1E40AF" />
          <Text style={styles.predictionsTitle}>Articulation Mastery Predictions</Text>
        </View>
        <Text style={styles.predictionsSubtitle}>
          AI-powered estimates using XGBoost Machine Learning
        </Text>
        
        <View style={styles.predictionsGrid}>
          {availablePredictions.map(([soundId, prediction]) => (
            <View key={soundId} style={styles.predictionItem}>
              <View style={styles.predictionItemHeader}>
                <View style={[styles.soundBadge, { backgroundColor: soundColors[soundId] }]}>
                  <Text style={styles.soundBadgeText}>
                    {soundId.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.soundName}>{soundNames[soundId]}</Text>
              </View>
              
              <View style={styles.predictionDaysContainer}>
                <Ionicons name="time-outline" size={18} color="#1E40AF" />
                <Text style={styles.predictionDaysText}>
                  {prediction.predicted_days} days
                </Text>
              </View>
              
              <View style={styles.predictionMeta}>
                <Text style={styles.predictionConfidence}>
                  {Math.round(prediction.confidence * 100)}% confidence
                </Text>
                {prediction.current_level > 1 && (
                  <Text style={styles.predictionLevel}>
                    Level {prediction.current_level}/5
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.predictionFooter}>
          <Ionicons name="information-circle-outline" size={14} color="#64748B" />
          <Text style={styles.predictionFooterText}>
            Predictions improve with more practice sessions
          </Text>
        </View>
      </View>
    );
  };

  const renderFluencyPredictionsCard = () => {
    if (!fluencyPrediction) return null;

    return (
      <View style={styles.predictionsCard}>
        <View style={styles.predictionsHeader}>
          <Ionicons name="pulse" size={22} color="#8e44ad" />
          <Text style={[styles.predictionsTitle, { color: '#8e44ad' }]}>Fluency Mastery Prediction</Text>
        </View>
        <Text style={styles.predictionsSubtitle}>
          AI-powered estimate using XGBoost Machine Learning
        </Text>
        
        <View style={styles.fluencyPredictionContent}>
          <View style={styles.fluencyPredictionMain}>
            <Ionicons name="time-outline" size={32} color="#8e44ad" />
            <View style={styles.fluencyPredictionText}>
              <Text style={[styles.predictionDaysLarge, { color: '#8e44ad' }]}>
                {fluencyPrediction.predicted_days} days
              </Text>
              <Text style={styles.fluencyPredictionLabel}>to fluency mastery</Text>
            </View>
          </View>
          
          <View style={styles.fluencyPredictionMeta}>
            <View style={styles.fluencyMetaItem}>
              <Ionicons name="analytics" size={16} color="#666" />
              <Text style={styles.fluencyMetaText}>
                {Math.round(fluencyPrediction.confidence * 100)}% confidence
              </Text>
            </View>
            {fluencyPrediction.current_level > 1 && (
              <View style={styles.fluencyMetaItem}>
                <Ionicons name="trending-up" size={16} color="#666" />
                <Text style={styles.fluencyMetaText}>
                  Current Level: {fluencyPrediction.current_level}/5
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.predictionFooter}>
          <Ionicons name="information-circle-outline" size={14} color="#64748B" />
          <Text style={styles.predictionFooterText}>
            Prediction improves with more practice sessions
          </Text>
        </View>
      </View>
    );
  };

  const renderLanguagePredictionsCards = () => {
    if (!receptivePrediction && !expressivePrediction) return null;

    return (
      <>
        {/* Receptive Language Prediction */}
        {receptivePrediction && (
          <View style={styles.predictionsCard}>
            <View style={styles.predictionsHeader}>
              <Ionicons name="ear" size={22} color="#4A90E2" />
              <Text style={[styles.predictionsTitle, { color: '#4A90E2' }]}>Receptive Language Mastery Prediction</Text>
            </View>
            <Text style={styles.predictionsSubtitle}>
              AI-powered estimate using XGBoost Machine Learning
            </Text>
            
            <View style={styles.fluencyPredictionContent}>
              <View style={styles.fluencyPredictionMain}>
                <Ionicons name="time-outline" size={32} color="#4A90E2" />
                <View style={styles.fluencyPredictionText}>
                  <Text style={[styles.predictionDaysLarge, { color: '#4A90E2' }]}>
                    {receptivePrediction.predicted_days} days
                  </Text>
                  <Text style={styles.fluencyPredictionLabel}>to receptive mastery</Text>
                </View>
              </View>
              
              <View style={styles.fluencyPredictionMeta}>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="analytics" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {receptivePrediction.confidence}% confidence
                  </Text>
                </View>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {receptivePrediction.current_exercises_completed || 0} exercises completed
                  </Text>
                </View>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="trophy" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {receptivePrediction.current_accuracy?.toFixed(0) || 0}% accuracy
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.predictionFooter}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text style={styles.predictionFooterText}>
                Prediction improves with more practice sessions
              </Text>
            </View>
          </View>
        )}

        {/* Expressive Language Prediction */}
        {expressivePrediction && (
          <View style={styles.predictionsCard}>
            <View style={styles.predictionsHeader}>
              <Ionicons name="chatbox" size={22} color="#8b5cf6" />
              <Text style={[styles.predictionsTitle, { color: '#8b5cf6' }]}>Expressive Language Mastery Prediction</Text>
            </View>
            <Text style={styles.predictionsSubtitle}>
              AI-powered estimate using XGBoost Machine Learning
            </Text>
            
            <View style={styles.fluencyPredictionContent}>
              <View style={styles.fluencyPredictionMain}>
                <Ionicons name="time-outline" size={32} color="#8b5cf6" />
                <View style={styles.fluencyPredictionText}>
                  <Text style={[styles.predictionDaysLarge, { color: '#8b5cf6' }]}>
                    {expressivePrediction.predicted_days} days
                  </Text>
                  <Text style={styles.fluencyPredictionLabel}>to expressive mastery</Text>
                </View>
              </View>
              
              <View style={styles.fluencyPredictionMeta}>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="analytics" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {expressivePrediction.confidence}% confidence
                  </Text>
                </View>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {expressivePrediction.current_exercises_completed || 0} exercises completed
                  </Text>
                </View>
                <View style={styles.fluencyMetaItem}>
                  <Ionicons name="trophy" size={16} color="#666" />
                  <Text style={styles.fluencyMetaText}>
                    {expressivePrediction.current_accuracy?.toFixed(0) || 0}% accuracy
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.predictionFooter}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text style={styles.predictionFooterText}>
                Prediction improves with more practice sessions
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'All', icon: 'apps' },
      { key: 'articulation', label: 'Articulation', icon: 'mic' },
      { key: 'fluency', label: 'Fluency', icon: 'chatbubbles' },
      { key: 'receptive', label: 'Receptive', icon: 'ear' },
      { key: 'expressive', label: 'Expressive', icon: 'chatbox' },
      { key: 'gait', label: 'Physical', icon: 'walk' },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Ionicons 
              name={filter.icon} 
              size={18} 
              color={selectedFilter === filter.key ? '#FFFFFF' : '#666'} 
            />
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>Health Logs</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9302C" />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Health Logs</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#C9302C" />
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHealthData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Summary Card */}
          {renderSummaryCard()}

          {/* Facility vs Home Comparison Card */}
          {facilityComparison && facilityComparison.has_facility_data && (
            <View style={fcStyles.card}>
              {/* Card Header */}
              <View style={fcStyles.cardHeader}>
                <View style={fcStyles.cardIconWrap}>
                  <Ionicons name="git-compare-outline" size={18} color="#C9302C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fcStyles.cardTitle}>Facility vs. Home</Text>
                  <Text style={fcStyles.cardSubtitle}>
                    {facilityComparison.assessment_type?.charAt(0).toUpperCase() + facilityComparison.assessment_type?.slice(1)} diagnostic • {new Date(facilityComparison.assessment_date).toLocaleDateString()}
                    {facilityComparison.assessor_name ? ` • by ${facilityComparison.assessor_name}` : ''}
                  </Text>
                </View>
                {facilityComparison.severity_level ? (
                  <View style={[fcStyles.severityBadge, {
                    backgroundColor: facilityComparison.severity_level === 'severe' ? '#fee2e2' : facilityComparison.severity_level === 'moderate' ? '#fef3c7' : '#dcfce7'
                  }]}>
                    <Text style={[fcStyles.severityText, {
                      color: facilityComparison.severity_level === 'severe' ? '#dc2626' : facilityComparison.severity_level === 'moderate' ? '#d97706' : '#16a34a'
                    }]}>
                      {facilityComparison.severity_level.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Summary Insights Row */}
              {facilityComparison.summary_insights && Object.keys(facilityComparison.summary_insights).length > 0 && (
                <View style={fcStyles.insightsRow}>
                  <View style={fcStyles.insightItem}>
                    <Text style={[fcStyles.insightValue, {
                      color: facilityComparison.summary_insights.overall_avg_delta >= 0 ? '#10b981' : '#ef4444'
                    }]}>
                      {facilityComparison.summary_insights.overall_avg_delta >= 0 ? '+' : ''}{facilityComparison.summary_insights.overall_avg_delta}%
                    </Text>
                    <Text style={fcStyles.insightLabel}>Avg Delta</Text>
                  </View>
                  <View style={fcStyles.insightDivider} />
                  <View style={fcStyles.insightItem}>
                    <Text style={[fcStyles.insightValue, { color: '#10b981' }]}>{facilityComparison.summary_insights.improving_count}</Text>
                    <Text style={fcStyles.insightLabel}>Improving</Text>
                  </View>
                  <View style={fcStyles.insightDivider} />
                  <View style={fcStyles.insightItem}>
                    <Text style={[fcStyles.insightValue, { color: '#6b7280' }]}>{facilityComparison.summary_insights.stable_count}</Text>
                    <Text style={fcStyles.insightLabel}>Stable</Text>
                  </View>
                  <View style={fcStyles.insightDivider} />
                  <View style={fcStyles.insightItem}>
                    <Text style={[fcStyles.insightValue, { color: '#ef4444' }]}>{facilityComparison.summary_insights.declining_count}</Text>
                    <Text style={fcStyles.insightLabel}>Declining</Text>
                  </View>
                </View>
              )}

              {/* Score Comparison Table */}
              <View style={fcStyles.tableContainer}>
                {/* Table Header */}
                <View style={fcStyles.tableHeader}>
                  <Text style={fcStyles.tableHeaderCell}>Area</Text>
                  <Text style={fcStyles.tableHeaderCellCenter}>Facility</Text>
                  <Text style={fcStyles.tableHeaderCellCenter}>Home</Text>
                  <Text style={fcStyles.tableHeaderCellCenter}>Delta</Text>
                  <Text style={fcStyles.tableHeaderCellCenter}>Status</Text>
                </View>

                {/* Articulation scores */}
                {Object.keys({ ...(facilityComparison.facility_scores?.articulation || {}), ...(facilityComparison.home_scores?.articulation || {}) }).map(sound => {
                  const fVal = facilityComparison.facility_scores?.articulation?.[sound];
                  const hVal = facilityComparison.home_scores?.articulation?.[sound];
                  const delta = facilityComparison.deltas?.articulation?.[sound];
                  const deltaD = getFacilityDeltaDisplay(delta);
                  const badge = getFcAlertBadge(delta);
                  return (
                    <View key={`fc-art-${sound}`} style={fcStyles.tableRow}>
                      <Text style={fcStyles.tableCell}>/{sound.toUpperCase()}/</Text>
                      <Text style={fcStyles.tableCellCenter}>{fVal != null ? `${fVal}%` : '—'}</Text>
                      <Text style={fcStyles.tableCellCenter}>{hVal != null ? `${hVal}%` : '—'}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: deltaD.color, fontWeight: '600' }]}>{deltaD.text}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: badge.color, fontSize: 14 }]}>{badge.icon}</Text>
                    </View>
                  );
                })}

                {/* Fluency */}
                {(facilityComparison.facility_scores?.fluency != null || facilityComparison.home_scores?.fluency != null) && (() => {
                  const deltaD = getFacilityDeltaDisplay(facilityComparison.deltas?.fluency);
                  const badge = getFcAlertBadge(facilityComparison.deltas?.fluency);
                  return (
                    <View style={fcStyles.tableRow}>
                      <Text style={fcStyles.tableCell}>Fluency</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.facility_scores?.fluency != null ? `${facilityComparison.facility_scores.fluency}%` : '—'}</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.home_scores?.fluency != null ? `${facilityComparison.home_scores.fluency}%` : '—'}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: deltaD.color, fontWeight: '600' }]}>{deltaD.text}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: badge.color, fontSize: 14 }]}>{badge.icon}</Text>
                    </View>
                  );
                })()}

                {/* Receptive */}
                {(facilityComparison.facility_scores?.receptive != null || facilityComparison.home_scores?.receptive != null) && (() => {
                  const deltaD = getFacilityDeltaDisplay(facilityComparison.deltas?.receptive);
                  const badge = getFcAlertBadge(facilityComparison.deltas?.receptive);
                  return (
                    <View style={fcStyles.tableRow}>
                      <Text style={fcStyles.tableCell}>Receptive</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.facility_scores?.receptive != null ? `${facilityComparison.facility_scores.receptive}%` : '—'}</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.home_scores?.receptive != null ? `${facilityComparison.home_scores.receptive}%` : '—'}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: deltaD.color, fontWeight: '600' }]}>{deltaD.text}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: badge.color, fontSize: 14 }]}>{badge.icon}</Text>
                    </View>
                  );
                })()}

                {/* Expressive */}
                {(facilityComparison.facility_scores?.expressive != null || facilityComparison.home_scores?.expressive != null) && (() => {
                  const deltaD = getFacilityDeltaDisplay(facilityComparison.deltas?.expressive);
                  const badge = getFcAlertBadge(facilityComparison.deltas?.expressive);
                  return (
                    <View style={fcStyles.tableRow}>
                      <Text style={fcStyles.tableCell}>Expressive</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.facility_scores?.expressive != null ? `${facilityComparison.facility_scores.expressive}%` : '—'}</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.home_scores?.expressive != null ? `${facilityComparison.home_scores.expressive}%` : '—'}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: deltaD.color, fontWeight: '600' }]}>{deltaD.text}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: badge.color, fontSize: 14 }]}>{badge.icon}</Text>
                    </View>
                  );
                })()}

                {/* Gait */}
                {(Object.keys(facilityComparison.facility_scores?.gait || {}).length > 0 || Object.keys(facilityComparison.home_scores?.gait || {}).length > 0) && (() => {
                  const deltaD = getFacilityDeltaDisplay(facilityComparison.deltas?.gait);
                  const badge = getFcAlertBadge(facilityComparison.deltas?.gait);
                  return (
                    <View style={[fcStyles.tableRow, { borderBottomWidth: 0 }]}>
                      <Text style={fcStyles.tableCell}>Gait</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.facility_scores?.gait?.overall_gait != null ? `${facilityComparison.facility_scores.gait.overall_gait}%` : '—'}</Text>
                      <Text style={fcStyles.tableCellCenter}>{facilityComparison.home_scores?.gait?.overall_gait != null ? `${facilityComparison.home_scores.gait.overall_gait}%` : '—'}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: deltaD.color, fontWeight: '600' }]}>{deltaD.text}</Text>
                      <Text style={[fcStyles.tableCellCenter, { color: badge.color, fontSize: 14 }]}>{badge.icon}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* Filter Buttons */}
          {renderFilterButtons()}

          {/* Logs List */}
          <View style={styles.logsContainer}>
            <Text style={styles.sectionTitle}>
              Activity Timeline 
              {selectedFilter === 'all' && hasMore && !showFullHistory && healthLogs.length > 0 
                ? ` (Showing ${getFilteredLogs().length} recent)`
                : ` (${getFilteredLogs().length})`}
            </Text>
            
            {getFilteredLogs().length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>
                  {selectedFilter === 'all' 
                    ? 'No therapy sessions yet' 
                    : `No ${selectedFilter} sessions in recent activity`}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {selectedFilter === 'all'
                    ? 'Start your therapy exercises to see your progress here'
                    : summary && summary[selectedFilter]?.sessions > 0
                      ? `You have ${summary[selectedFilter].sessions} ${selectedFilter} sessions total. Click "View Full History" to see all sessions.`
                      : 'Try selecting a different therapy type or "All"'}
                </Text>
                
                {selectedFilter !== 'all' && summary && summary[selectedFilter]?.sessions > 0 && (
                  <TouchableOpacity 
                    style={[styles.viewHistoryButton, { marginTop: 15 }]}
                    onPress={loadFullHistory}
                  >
                    <Ionicons name="time-outline" size={20} color="#C9302C" />
                    <Text style={styles.viewHistoryText}>View Full History</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {getFilteredLogs().map(log => renderLogCard(log))}
                
                {hasMore && !showFullHistory && (
                  <TouchableOpacity 
                    style={styles.viewHistoryButton}
                    onPress={loadFullHistory}
                  >
                    <Ionicons name="time-outline" size={20} color="#C9302C" />
                    <Text style={styles.viewHistoryText}>View Full History</Text>
                  </TouchableOpacity>
                )}
                
                {showFullHistory && (
                  <TouchableOpacity 
                    style={styles.viewHistoryButton}
                    onPress={() => { setShowFullHistory(false); fetchHealthData(); }}
                  >
                    <Ionicons name="chevron-up" size={20} color="#666" />
                    <Text style={styles.viewHistoryText}>Show Less</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: Platform.OS === 'android' ? -StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    width: 34,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerRight: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#C9302C',
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  therapyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  therapyStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  therapyStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapyStatInfo: {
    marginLeft: 10,
  },
  therapyStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  therapyStatSessions: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  therapyStatRight: {
    alignItems: 'flex-end',
  },
  therapyStatScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C9302C',
  },
  therapyStatAvg: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  filterContainer: {
    marginHorizontal: 15,
    marginBottom: 10,
  },
  filterContent: {
    paddingRight: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#C9302C',
    borderColor: '#C9302C',
  },
  filterButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  logsContainer: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E0E0E0',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  therapyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 10,
  },
  viewHistoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#C9302C',
  },
  gaitMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  gaitMetricItem: {
    alignItems: 'center',
  },
  gaitMetricLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  gaitMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dataQualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dataQualityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  exercisePlanSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  exercisePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exercisePlanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  exercisePlanStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  exercisePlanStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  exercisePlanProgress: {
    marginBottom: 10,
  },
  exercisePlanProgressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  exercisePlanProgressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  exercisePlanProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  exerciseList: {
    marginTop: 8,
  },
  exerciseListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  exerciseItemText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  exerciseItemTextCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },

  // Predictions Card Styles (XGBoost ML)
  predictionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  predictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  predictionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  predictionsSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  predictionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  predictionItem: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  predictionItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  soundBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  soundName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  predictionDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  predictionDaysText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionConfidence: {
    fontSize: 10,
    color: '#64748B',
  },
  predictionLevel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  predictionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  predictionFooterText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  // Fluency Prediction Styles
  fluencyPredictionContent: {
    marginTop: 12,
  },
  fluencyPredictionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  fluencyPredictionText: {
    flex: 1,
  },
  predictionDaysLarge: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  fluencyPredictionLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  fluencyPredictionMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  fluencyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fluencyMetaText: {
    fontSize: 12,
    color: '#666',
  },
  overallPredictionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 6,
    borderLeftColor: '#FF6B6B',
  },
  overallPredictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  overallPredictionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
    flex: 1,
  },
  overallPredictionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  overallMainStats: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overallStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  overallStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  overallStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  overallStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  overallStatSubLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  overallStatDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  overallDetailedStats: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overallDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overallDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  overallDetailLabel: {
    fontSize: 12,
    color: '#666',
  },
  overallDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  therapyBreakdown: {
    marginBottom: 16,
  },
  therapyBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  therapyBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  therapyBreakdownItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  therapyBreakdownIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  therapyBreakdownLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  therapyBreakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

// ==================== FACILITY COMPARISON STYLES ====================
const fcStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  insightsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 14,
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0',
  },
  insightValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  insightLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  tableContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    flex: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderCellCenter: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    flex: 2,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
  },
});

export default HealthScreen;
