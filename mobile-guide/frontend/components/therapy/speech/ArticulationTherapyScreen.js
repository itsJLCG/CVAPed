import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArticulationExerciseScreen from './ArticulationExerciseScreen';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../config/apiConfig';

const { width } = Dimensions.get('window');

const ArticulationTherapyScreen = ({ onBack }) => {
  const [selectedSound, setSelectedSound] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoadingPredictions(true);
      const token = await AsyncStorage.getItem('token');
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
          console.log(`Prediction not available for ${soundId}`);
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
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleBeginAssessment = (soundId) => {
    setSelectedSound(soundId);
  };

  const handleBackFromExercise = () => {
    setSelectedSound(null);
  };

  // Show exercise screen if sound is selected
  if (selectedSound) {
    return (
      <ArticulationExerciseScreen
        route={{ params: { soundId: selectedSound } }}
        navigation={{ goBack: handleBackFromExercise }}
      />
    );
  }

  const soundPrograms = [
    {
      id: 1,
      soundId: 's',
      symbol: '/s/',
      title: 'S Sound',
      description: 'Systematic practice for voiceless alveolar fricative production in initial, medial, and final positions',
      color: '#C9302C',
      targetExamples: ['sun', 'sock', 'sip'],
      stages: '5 Progressive Stages',
    },
    {
      id: 2,
      soundId: 'r',
      symbol: '/r/',
      title: 'R Sound',
      description: 'Structured intervention for retroflex approximant articulation across contextual complexity levels',
      color: '#4A90E2',
      targetExamples: ['rabbit', 'red', 'run'],
      stages: '5 Progressive Stages',
    },
    {
      id: 3,
      soundId: 'l',
      symbol: '/l/',
      title: 'L Sound',
      description: 'Progressive training for lateral approximant sound production in varied linguistic contexts',
      color: '#F4A460',
      targetExamples: ['lion', 'leaf', 'lamp'],
      stages: '5 Progressive Stages',
    },
    {
      id: 4,
      soundId: 'k',
      symbol: '/k/',
      title: 'K Sound',
      description: 'Hierarchical practice for voiceless velar plosive articulation with increasing phonetic complexity',
      color: '#9B59B6',
      targetExamples: ['kite', 'cat', 'car'],
      stages: '5 Progressive Stages',
    },
    {
      id: 5,
      soundId: 'th',
      symbol: '/th/',
      title: 'TH Sound',
      description: 'Sequential exercises for interdental fricative production in single words through connected speech',
      color: '#27AE60',
      targetExamples: ['think', 'this', 'thumb'],
      stages: '5 Progressive Stages',
    },
  ];
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Articulation Therapy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Articulation Therapy Program</Text>
          <Text style={styles.programSubtitle}>EVIDENCE-BASED SPEECH SOUND INTERVENTION</Text>
          <Text style={styles.description}>
            Select a target phoneme for systematic intervention. Each program includes five hierarchical levels progressing from isolated sound production through connected speech contexts.
          </Text>
        </View>

        {/* Sound Programs Grid */}
        <View style={styles.programsGrid}>
          {soundPrograms.map((program) => (
            <View key={program.id} style={styles.programCard}>
              {/* Sound Symbol Badge */}
              <View style={styles.symbolBadgeContainer}>
                <View style={[styles.symbolBadge, { borderColor: program.color }]}>
                  <Text style={[styles.symbolText, { color: program.color }]}>
                    {program.symbol}
                  </Text>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={styles.soundTitle}>{program.title}</Text>
                <Text style={styles.soundDescription}>{program.description}</Text>

                {/* Target Examples */}
                <View style={styles.examplesSection}>
                  <Text style={styles.sectionLabel}>TARGET EXAMPLES</Text>
                  <View style={styles.examplesRow}>
                    {program.targetExamples.map((example, index) => (
                      <View key={index} style={styles.exampleBadge}>
                        <Text style={styles.exampleText}>{example}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Intervention Levels */}
                <View style={styles.levelsSection}>
                  <Text style={styles.sectionLabel}>INTERVENTION LEVELS</Text>
                  <Text style={styles.stagesText}>{program.stages}</Text>
                </View>

                {/* Mastery Prediction */}
                {predictions[program.soundId] && (
                  <View style={styles.predictionSection}>
                    <View style={styles.predictionHeader}>
                      <Ionicons name="time-outline" size={16} color={program.color} />
                      <Text style={[styles.predictionLabel, { color: program.color }]}>
                        TIME TO MASTERY
                      </Text>
                    </View>
                    <Text style={styles.predictionDays}>
                      {predictions[program.soundId].predicted_days} days
                    </Text>
                    <Text style={styles.predictionConfidence}>
                      {Math.round(predictions[program.soundId].confidence * 100)}% confidence
                    </Text>
                    {predictions[program.soundId].current_level > 1 && (
                      <Text style={styles.predictionProgress}>
                        Current: Level {predictions[program.soundId].current_level}
                      </Text>
                    )}
                  </View>
                )}

                {/* Begin Assessment Button */}
                <TouchableOpacity 
                  style={[styles.assessmentButton, { backgroundColor: program.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleBeginAssessment(program.soundId)}
                >
                  <Text style={styles.assessmentButtonText}>BEGIN ASSESSMENT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderLeftWidth: 3,
    borderLeftColor: '#C9302C',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
    textAlign: 'center',
  },
  programSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7F8C8D',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
    textAlign: 'center',
  },

  // Programs Grid
  programsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 10,
    justifyContent: 'space-around',
  },

  // Program Card
  programCard: {
    width: '48%',
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
    minHeight: 320,
  },

  // Symbol Badge
  symbolBadgeContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  symbolBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Card Content
  cardContent: {
    padding: 8,
    paddingTop: 0,
  },
  soundTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  soundDescription: {
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
    marginBottom: 10,
    textAlign: 'left',
  },

  // Examples Section
  examplesSection: {
    marginBottom: 8,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    paddingLeft: 8,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7F8C8D',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  exampleBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  exampleText: {
    fontSize: 10,
    color: '#2C3E50',
    fontWeight: '500',
  },

  // Levels Section
  levelsSection: {
    marginBottom: 10,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    paddingLeft: 8,
  },
  stagesText: {
    fontSize: 11,
    color: '#2C3E50',
    fontWeight: '600',
  },

  // Prediction Section (XGBoost ML)
  predictionSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  predictionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  predictionDays: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: 2,
  },
  predictionConfidence: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 2,
  },
  predictionProgress: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Assessment Button
  assessmentButton: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 3,
  },
  assessmentButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});

export default ArticulationTherapyScreen;
