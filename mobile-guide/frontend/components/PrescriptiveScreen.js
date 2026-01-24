import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaWrapper from './SafeAreaWrapper';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

const PrescriptiveScreen = ({ onBack }) => {
  console.log('🎯 PrescriptiveScreen component mounted');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [prescriptiveData, setPrescriptiveData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔄 PrescriptiveScreen useEffect - loadUserId triggered');
    loadUserId();
  }, []);

  useEffect(() => {
    console.log('🔄 PrescriptiveScreen useEffect - userId changed:', userId);
    if (userId) {
      console.log('✅ userId is set, calling loadPrescriptiveAnalysis');
      loadPrescriptiveAnalysis();
    } else {
      console.log('⏳ Waiting for userId to be set...');
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      console.log('🔑 Loading user ID from AsyncStorage...');
      const user = await AsyncStorage.getItem('userData');
      console.log('👤 User data retrieved:', user ? 'Found' : 'Not found');
      
      if (user) {
        const userData = JSON.parse(user);
        console.log('✅ User ID parsed:', userData._id);
        setUserId(userData._id);
      } else {
        console.error('❌ No user data in AsyncStorage');
        setError('User not logged in. Please log in again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading user ID:', error);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const loadPrescriptiveAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching prescriptive analysis for user:', userId);
      console.log('📡 API endpoint:', `/speech/prescriptive/${userId}`);
      
      const response = await api.get(`/speech/prescriptive/${userId}`);
      
      console.log('📦 Response received:', response.status, response.statusText);
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        setPrescriptiveData(response.data.data);
        console.log('✅ Prescriptive analysis loaded successfully');
      } else {
        console.error('❌ Response indicates failure:', response.data);
        setError(response.data.message || 'Failed to load analysis');
      }
    } catch (error) {
      console.error('❌ Error loading prescriptive analysis:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      if (error.response?.status === 503) {
        setError('Prescriptive analysis service is temporarily unavailable. Please try again later.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        setError('Request timed out. The analysis is taking too long. Please try again.');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Network error. Please check your connection and backend servers.');
      } else {
        setError(`Failed to load prescriptive analysis: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptiveAnalysis();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#E74C3C';
      case 'MEDIUM': return '#F39C12';
      case 'LOW': return '#3498DB';
      case 'COMPLETE': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH': return 'alert-circle';
      case 'MEDIUM': return 'alert';
      case 'LOW': return 'information-circle';
      case 'COMPLETE': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getTherapyIcon = (therapy) => {
    switch (therapy) {
      case 'articulation': return 'mic';
      case 'fluency': return 'pulse';
      case 'language_receptive': return 'ear';
      case 'language_expressive': return 'chatbubbles';
      default: return 'fitness';
    }
  };

  const getTherapyLabel = (therapy) => {
    const labels = {
      'articulation': 'Articulation',
      'fluency': 'Fluency',
      'language_receptive': 'Receptive Language',
      'language_expressive': 'Expressive Language'
    };
    return labels[therapy] || therapy;
  };

  const getDayName = (dayIndex) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex] || `Day ${dayIndex + 1}`;
  };

  const renderPriorityCard = (priority) => {
    const color = getPriorityColor(priority.priority);
    const icon = getPriorityIcon(priority.priority);

    return (
      <View key={priority.therapy} style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.therapyInfo}>
            <Ionicons 
              name={getTherapyIcon(priority.therapy)} 
              size={24} 
              color={color} 
            />
            <Text style={styles.therapyName}>{getTherapyLabel(priority.therapy)}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: color }]}>
            <Ionicons name={icon} size={16} color="#FFF" />
            <Text style={styles.priorityText}>{priority.priority}</Text>
          </View>
        </View>
        
        {priority.reason && (
          <Text style={styles.reasonText}>💡 {priority.reason}</Text>
        )}
        
        {priority.focus && (
          <View style={styles.focusContainer}>
            <Text style={styles.focusLabel}>Focus Area:</Text>
            <Text style={styles.focusText}>{priority.focus}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderWeeklySchedule = () => {
    if (!prescriptiveData?.weekly_schedule) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Weekly Practice Schedule</Text>
        
        {prescriptiveData.weekly_schedule.map((day, index) => (
          <View key={index} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.day}</Text>
              <Text style={styles.dayTotal}>{day.total_trials} trials</Text>
            </View>
            
            {day.exercises?.map((exercise, idx) => (
              <View key={idx} style={styles.therapyRow}>
                <Ionicons 
                  name={getTherapyIcon(exercise.therapy.toLowerCase().replace(' ', '_'))} 
                  size={16} 
                  color={getPriorityColor(exercise.priority)} 
                />
                <Text style={styles.therapyScheduleText}>
                  {exercise.therapy}: {exercise.trials} trials
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderInsights = () => {
    if (!prescriptiveData?.insights || prescriptiveData.insights.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Insights & Recommendations</Text>
        
        {prescriptiveData.insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <Text style={styles.insightText}>• {insight}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderBottleneckAnalysis = () => {
    if (!prescriptiveData?.bottleneck_analysis) return null;

    const { bottleneck, affected_therapies, explanation } = prescriptiveData.bottleneck_analysis;

    if (!bottleneck) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Bottleneck Analysis</Text>
        
        <View style={styles.bottleneckCard}>
          <View style={styles.bottleneckHeader}>
            <Ionicons name="warning" size={24} color="#E74C3C" />
            <Text style={styles.bottleneckTitle}>
              {getTherapyLabel(bottleneck)} is blocking progress
            </Text>
          </View>
          
          <Text style={styles.bottleneckExplanation}>{explanation}</Text>
          
          {affected_therapies && affected_therapies.length > 0 && (
            <View style={styles.affectedContainer}>
              <Text style={styles.affectedLabel}>Affected therapies:</Text>
              {affected_therapies.map((therapy, index) => (
                <Text key={index} style={styles.affectedTherapy}>
                  • {getTherapyLabel(therapy)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOptimalSequence = () => {
    if (!prescriptiveData?.optimal_sequence || prescriptiveData.optimal_sequence.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Optimal Practice Sequence</Text>
        
        <View style={styles.sequenceCard}>
          <Text style={styles.sequenceDescription}>
            Practice therapies in this order for maximum effectiveness:
          </Text>
          
          {prescriptiveData.optimal_sequence.map((item, index) => (
            <View key={index} style={styles.sequenceRow}>
              <View style={styles.sequenceNumber}>
                <Text style={styles.sequenceNumberText}>{index + 1}</Text>
              </View>
              <Ionicons 
                name={getTherapyIcon(item.therapy)} 
                size={20} 
                color="#3498DB" 
              />
              <Text style={styles.sequenceTherapy}>{getTherapyLabel(item.therapy)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCrossTherapyInsights = () => {
    if (!prescriptiveData?.cross_therapy_insights || prescriptiveData.cross_therapy_insights.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Cross-Therapy Connections</Text>
        
        {prescriptiveData.cross_therapy_insights.map((insight, index) => (
          <View key={index} style={styles.crossInsightCard}>
            <Ionicons name="link" size={18} color="#9B59B6" />
            <Text style={styles.crossInsightText}>
              {insight.reason || JSON.stringify(insight)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !prescriptiveData) {
    return (
      <SafeAreaWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Therapy Plan</Text>
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498DB" />
            <Text style={styles.loadingText}>Analyzing your therapy data...</Text>
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error && !prescriptiveData) {
    return (
      <SafeAreaWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Therapy Plan</Text>
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#E74C3C" />
            <Text style={styles.errorTitle}>Unable to Load Analysis</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPrescriptiveAnalysis}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Therapy Plan</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#3498DB" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {prescriptiveData && (
            <>
              {/* Priorities Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Therapy Priorities</Text>
                {prescriptiveData.priorities?.map(renderPriorityCard)}
              </View>

              {/* Bottleneck Analysis */}
              {renderBottleneckAnalysis()}

              {/* Optimal Sequence */}
              {renderOptimalSequence()}

              {/* Weekly Schedule */}
              {renderWeeklySchedule()}

              {/* Insights */}
              {renderInsights()}

              {/* Cross-Therapy Insights */}
              {renderCrossTherapyInsights()}

              {/* Recommendations */}
              {prescriptiveData.recommendations && prescriptiveData.recommendations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📋 Action Items</Text>
                  {prescriptiveData.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationCard}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#27AE60" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Footer Timestamp */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Generated: {new Date(prescriptiveData.generated_at).toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#C9302C',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  therapyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  therapyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priorityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  focusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  focusLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  focusText: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 4,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#F5F7FA',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C9302C',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  therapyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 6,
  },
  therapyScheduleText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
  insightCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
    shadowColor: '#F39C12',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    fontWeight: '500',
  },
  bottleneckCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 18,
    borderLeftWidth: 5,
    borderLeftColor: '#E74C3C',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bottleneckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bottleneckTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    flex: 1,
  },
  bottleneckExplanation: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  affectedContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  affectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 6,
  },
  affectedTherapy: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  sequenceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sequenceDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    fontWeight: '500',
  },
  sequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
  },
  sequenceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sequenceNumberText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sequenceTherapy: {
    fontSize: 15,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600',
  },
  crossInsightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8F4FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  crossInsightText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F1F8F4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#95A5A6',
    fontStyle: 'italic',
  },
});

export default PrescriptiveScreen;
