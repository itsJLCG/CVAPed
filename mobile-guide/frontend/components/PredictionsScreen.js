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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

const { width } = Dimensions.get('window');

const PredictionsScreen = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Predictions state
  const [articulationPredictions, setArticulationPredictions] = useState({});
  const [fluencyPrediction, setFluencyPrediction] = useState(null);
  const [receptivePrediction, setReceptivePrediction] = useState(null);
  const [expressivePrediction, setExpressivePrediction] = useState(null);
  const [overallSpeechPrediction, setOverallSpeechPrediction] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      // Fetch articulation predictions
      const sounds = ['r', 's', 'l', 'th', 'k'];
      const predictionPromises = sounds.map(async (sound) => {
        try {
          const response = await axios.post(
            `${API_URL}/articulation/predict-mastery`,
            { sound_id: sound },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return { sound, data: response.data.prediction };
        } catch (err) {
          return { sound, data: null };
        }
      });

      const results = await Promise.all(predictionPromises);
      const predictionsMap = {};
      results.forEach(({ sound, data }) => {
        if (data) {
          predictionsMap[sound] = data;
        }
      });
      setArticulationPredictions(predictionsMap);

      // Fetch fluency prediction
      try {
        const fluencyResponse = await axios.post(
          `${API_URL}/fluency/predict-mastery`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (fluencyResponse.data.success) {
          setFluencyPrediction(fluencyResponse.data.prediction);
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
          const predictionData = {
            ...receptiveResponse.data.prediction,
            confidence: Math.round(receptiveResponse.data.prediction.confidence * 100)
          };
          setReceptivePrediction(predictionData);
        }
      } catch (err) {
        console.log('Receptive prediction not available');
      }

      // Fetch expressive language prediction
      try {
        const expressiveResponse = await axios.post(
          `${API_URL}/expressive/predict-mastery`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (expressiveResponse.data.success && expressiveResponse.data.prediction) {
          const predictionData = {
            ...expressiveResponse.data.prediction,
            confidence: Math.round(expressiveResponse.data.prediction.confidence * 100)
          };
          setExpressivePrediction(predictionData);
        }
      } catch (err) {
        console.log('Expressive prediction not available');
      }

      // Fetch overall speech prediction
      try {
        const overallResponse = await axios.post(
          `${API_URL}/speech/predict-overall-improvement`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (overallResponse.data.success && overallResponse.data.prediction) {
          const predictionData = {
            ...overallResponse.data.prediction,
            confidence: Math.round(overallResponse.data.prediction.confidence * 100)
          };
          setOverallSpeechPrediction(predictionData);
        }
      } catch (err) {
        console.log('Overall prediction not available');
      }

    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPredictions();
    setRefreshing(false);
  };

  const renderOverallPredictionCard = () => {
    if (!overallSpeechPrediction) return null;

    return (
      <View style={styles.overallCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="trophy" size={32} color="#FF6B6B" />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Overall Speech Progress</Text>
              <Text style={styles.cardSubtitle}>All Therapies Combined</Text>
            </View>
          </View>
        </View>

        <View style={styles.mainStats}>
          <View style={styles.statBox}>
            <Ionicons name="calendar" size={28} color="#FF6B6B" />
            <Text style={styles.statValue}>{overallSpeechPrediction.weeks_to_completion}</Text>
            <Text style={styles.statLabel}>Weeks to Complete</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={28} color="#4CAF50" />
            <Text style={styles.statValue}>{overallSpeechPrediction.improvement_rate_per_week}%</Text>
            <Text style={styles.statLabel}>Weekly Improvement</Text>
          </View>
        </View>

        <View style={styles.detailStats}>
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.detailLabel}>Current Progress:</Text>
            <Text style={styles.detailValue}>{overallSpeechPrediction.current_overall_accuracy}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="flash" size={20} color="#FFC107" />
            <Text style={styles.detailLabel}>Total Trials:</Text>
            <Text style={styles.detailValue}>{overallSpeechPrediction.total_trials}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="analytics" size={20} color="#9C27B0" />
            <Text style={styles.detailLabel}>Confidence:</Text>
            <Text style={styles.detailValue}>{overallSpeechPrediction.confidence}%</Text>
          </View>
        </View>

        {/* Therapy Breakdown */}
        <View style={styles.therapyBreakdown}>
          <Text style={styles.breakdownTitle}>Individual Therapy Status:</Text>
          <View style={styles.breakdownGrid}>
            {overallSpeechPrediction.articulation_accuracy > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownIcon}>🗣️</Text>
                <Text style={styles.breakdownLabel}>Articulation</Text>
                <Text style={styles.breakdownValue}>{overallSpeechPrediction.articulation_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.fluency_accuracy > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownIcon}>💬</Text>
                <Text style={styles.breakdownLabel}>Fluency</Text>
                <Text style={styles.breakdownValue}>{overallSpeechPrediction.fluency_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.receptive_accuracy > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownIcon}>👂</Text>
                <Text style={styles.breakdownLabel}>Receptive</Text>
                <Text style={styles.breakdownValue}>{overallSpeechPrediction.receptive_accuracy}%</Text>
              </View>
            )}
            {overallSpeechPrediction.expressive_accuracy > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownIcon}>📢</Text>
                <Text style={styles.breakdownLabel}>Expressive</Text>
                <Text style={styles.breakdownValue}>{overallSpeechPrediction.expressive_accuracy}%</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.aiFooter}>
          <Ionicons name="sparkles" size={14} color="#FF6B6B" />
          <Text style={styles.aiFooterText}>AI-Powered XGBoost ML (96.5% accuracy)</Text>
        </View>
      </View>
    );
  };

  const renderArticulationCard = () => {
    const predictions = Object.entries(articulationPredictions);
    if (predictions.length === 0) return null;

    const soundColors = {
      r: '#E74C3C',
      s: '#3498DB',
      l: '#9B59B6',
      th: '#F39C12',
      k: '#1ABC9C'
    };

    const soundNames = {
      r: 'R-Sound',
      s: 'S-Sound',
      l: 'L-Sound',
      th: 'TH-Sound',
      k: 'K-Sound'
    };

    return (
      <View style={styles.therapyCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="mic" size={24} color="#E74C3C" />
          <Text style={styles.sectionTitle}>Articulation Mastery</Text>
        </View>
        
        <View style={styles.soundsGrid}>
          {predictions.map(([sound, prediction]) => (
            <View key={sound} style={[styles.soundCard, { borderLeftColor: soundColors[sound] }]}>
              <View style={styles.soundHeader}>
                <Text style={[styles.soundName, { color: soundColors[sound] }]}>
                  {soundNames[sound]}
                </Text>
                <Text style={styles.soundDays}>{prediction.predicted_days} days</Text>
              </View>
              <View style={styles.soundStats}>
                <View style={styles.soundStat}>
                  <Text style={styles.soundStatLabel}>Confidence</Text>
                  <Text style={styles.soundStatValue}>{Math.round(prediction.confidence * 100)}%</Text>
                </View>
                <View style={styles.soundStat}>
                  <Text style={styles.soundStatLabel}>Level</Text>
                  <Text style={styles.soundStatValue}>{prediction.current_level}/5</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFluencyCard = () => {
    if (!fluencyPrediction) return null;

    return (
      <View style={styles.therapyCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbubbles" size={24} color="#8e44ad" />
          <Text style={styles.sectionTitle}>Fluency Mastery</Text>
        </View>

        <View style={styles.therapyContent}>
          <View style={styles.mainPrediction}>
            <Ionicons name="time" size={40} color="#8e44ad" />
            <View style={styles.predictionText}>
              <Text style={[styles.predictionDays, { color: '#8e44ad' }]}>
                {fluencyPrediction.predicted_days} days
              </Text>
              <Text style={styles.predictionLabel}>to fluency mastery</Text>
            </View>
          </View>

          <View style={styles.therapyStats}>
            <View style={styles.therapyStat}>
              <Text style={styles.therapyStatValue}>{Math.round(fluencyPrediction.confidence * 100)}%</Text>
              <Text style={styles.therapyStatLabel}>Confidence</Text>
            </View>
            <View style={styles.therapyStat}>
              <Text style={styles.therapyStatValue}>{fluencyPrediction.current_level}/5</Text>
              <Text style={styles.therapyStatLabel}>Current Level</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLanguageCard = () => {
    if (!receptivePrediction && !expressivePrediction) return null;

    return (
      <View style={styles.therapyCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="language" size={24} color="#4A90E2" />
          <Text style={styles.sectionTitle}>Language Mastery</Text>
        </View>

        <View style={styles.languageContainer}>
          {receptivePrediction && (
            <View style={[styles.languageCard, { borderLeftColor: '#4A90E2' }]}>
              <View style={styles.languageHeader}>
                <Ionicons name="ear" size={24} color="#4A90E2" />
                <Text style={[styles.languageTitle, { color: '#4A90E2' }]}>Receptive</Text>
              </View>
              <Text style={styles.languageDays}>{receptivePrediction.predicted_days} days</Text>
              <View style={styles.languageStats}>
                <View style={styles.languageStat}>
                  <Text style={styles.languageStatLabel}>Confidence</Text>
                  <Text style={styles.languageStatValue}>{receptivePrediction.confidence}%</Text>
                </View>
                <View style={styles.languageStat}>
                  <Text style={styles.languageStatLabel}>Accuracy</Text>
                  <Text style={styles.languageStatValue}>{receptivePrediction.current_accuracy?.toFixed(0) || 0}%</Text>
                </View>
              </View>
            </View>
          )}

          {expressivePrediction && (
            <View style={[styles.languageCard, { borderLeftColor: '#8b5cf6' }]}>
              <View style={styles.languageHeader}>
                <Ionicons name="chatbox" size={24} color="#8b5cf6" />
                <Text style={[styles.languageTitle, { color: '#8b5cf6' }]}>Expressive</Text>
              </View>
              <Text style={styles.languageDays}>{expressivePrediction.predicted_days} days</Text>
              <View style={styles.languageStats}>
                <View style={styles.languageStat}>
                  <Text style={styles.languageStatLabel}>Confidence</Text>
                  <Text style={styles.languageStatValue}>{expressivePrediction.confidence}%</Text>
                </View>
                <View style={styles.languageStat}>
                  <Text style={styles.languageStatLabel}>Accuracy</Text>
                  <Text style={styles.languageStatValue}>{expressivePrediction.current_accuracy?.toFixed(0) || 0}%</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Predictions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Predictions</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.introCard}>
          <Ionicons name="analytics" size={32} color="#FF6B6B" />
          <Text style={styles.introTitle}>ML-Powered Predictions</Text>
          <Text style={styles.introText}>
            Using XGBoost Machine Learning to predict your therapy progress and completion timeline based on your actual performance data.
          </Text>
        </View>

        {renderOverallPredictionCard()}
        {renderArticulationCard()}
        {renderFluencyCard()}
        {renderLanguageCard()}
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  introCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  overallCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 6,
    borderLeftColor: '#FF6B6B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  mainStats: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  detailStats: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  therapyBreakdown: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  breakdownItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  breakdownIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  aiFooterText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  therapyCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  soundsGrid: {
    marginTop: 16,
    gap: 12,
  },
  soundCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  soundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '700',
  },
  soundDays: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  soundStats: {
    flexDirection: 'row',
    gap: 24,
  },
  soundStat: {
    flex: 1,
  },
  soundStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  soundStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  therapyContent: {
    marginTop: 16,
  },
  mainPrediction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  predictionText: {
    flex: 1,
  },
  predictionDays: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  therapyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  therapyStat: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  therapyStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  therapyStatLabel: {
    fontSize: 13,
    color: '#666',
  },
  languageContainer: {
    marginTop: 16,
    gap: 12,
  },
  languageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  languageDays: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  languageStats: {
    flexDirection: 'row',
    gap: 16,
  },
  languageStat: {
    flex: 1,
  },
  languageStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  languageStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default PredictionsScreen;
