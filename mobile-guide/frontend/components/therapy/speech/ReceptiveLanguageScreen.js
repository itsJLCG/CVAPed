import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import api from '../../../services/api';

const ReceptiveLanguageScreen = ({ onBack, reloadTrigger }) => {
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [hasPlayedInstruction, setHasPlayedInstruction] = useState(false);
  
  // XGBoost ML Prediction
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Initial load
  useEffect(() => {
    loadExercisesAndProgress();
  }, []);

  // Reload progress when returning to screen (reloadTrigger changes)
  useEffect(() => {
    if (reloadTrigger > 0 && exercises.length > 0 && !isLoading) {
      console.log('🔄 Reload trigger detected, reloading progress');
      loadProgress();
    }
  }, [reloadTrigger]);

  // Track visibility when component mounts/unmounts
  useEffect(() => {
    return () => {
      // Cleanup TTS on unmount
      Speech.stop();
    };
  }, []);

  // Auto-play instruction when exercise changes
  useEffect(() => {
    if (!showResults && exercises.length > 0 && !hasPlayedInstruction && !feedback) {
      // Delay to let UI render first
      const timer = setTimeout(() => {
        playInstructionAndWord();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentExercise, exercises.length, showResults, hasPlayedInstruction, feedback]);

  const loadExercisesAndProgress = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');

      // Load exercises
      const exercisesResponse = await api.get('/receptive/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (exercisesResponse.data.success) {
        // Flatten exercises from grouped structure
        const exercisesArray = [];
        Object.values(exercisesResponse.data.exercises_by_level).forEach(levelData => {
          exercisesArray.push(...levelData.exercises);
        });
        
        setExercises(exercisesArray);
        console.log(`📚 Loaded ${exercisesArray.length} receptive exercises`);
        
        // Log first exercise to check emoji/image field
        if (exercisesArray.length > 0) {
          console.log('First exercise:', exercisesArray[0]);
          if (exercisesArray[0].options) {
            console.log('First exercise options:', exercisesArray[0].options);
          }
        }

        // Load progress after exercises are loaded
        await loadProgressWithExercises(exercisesArray, token);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    if (exercises.length === 0) {
      console.log('⚠️ Cannot reload progress: exercises not loaded yet');
      return;
    }
    console.log('🔄 Loading progress for existing exercises');
    try {
      const token = await AsyncStorage.getItem('token');
      await loadProgressWithExercises(exercises, token);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const loadProgressWithExercises = async (exercisesArray, token) => {
    try {
      // Load progress
      const progressResponse = await api.get('/receptive/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

        if (progressResponse.data.success && progressResponse.data.has_progress) {
          const currentIdx = progressResponse.data.current_exercise;
          const progressExercises = progressResponse.data.exercises || {};
          
          console.log('📈 Progress Response:', {
            currentIdx,
            totalExercises: exercisesArray.length,
            progressExercisesCount: Object.keys(progressExercises).length,
            completedExercises: progressResponse.data.completed_exercises
          });
          
          // Build results array from completed exercises
          const progressResults = [];
          for (let i = 0; i < currentIdx; i++) {
            const exerciseData = progressExercises[i.toString()];
            if (exerciseData) {
              progressResults.push({
                correct: exerciseData.is_correct,
                response: exerciseData.user_answer
              });
            }
          }
          setResults(progressResults);
          
          console.log(`📑 Built results array with ${progressResults.length} items`);
          
          // Check if all exercises completed
          if (currentIdx >= exercisesArray.length) {
            console.log('✅ All exercises completed! Showing results.');
            setCurrentExercise(0);
            setShowResults(true);
          } else {
            setCurrentExercise(currentIdx);
            console.log(`📍 Setting current exercise to ${currentIdx}`);
            console.log(`📊 Progress data:`, {
              current_exercise: progressResponse.data.current_exercise,
              completed_exercises: progressResponse.data.completed_exercises,
              total_exercises: progressResponse.data.total_exercises,
              exercisesKeys: Object.keys(progressExercises)
            });
          }
        } else {
          setCurrentExercise(0);
          console.log('📍 Starting from beginning');
        }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const fetchPrediction = async () => {
    try {
      setPredictionLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const response = await api.post('/receptive/predict-mastery', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.prediction) {
        // Convert confidence from 0-1 to 0-100 percentage
        const predictionData = {
          ...response.data.prediction,
          confidence: Math.round(response.data.prediction.confidence * 100)
        };
        setPrediction(predictionData);
        console.log('🔮 Receptive language mastery prediction:', predictionData);
      }
    } catch (error) {
      console.error('Error fetching receptive prediction:', error);
      if (error.response?.status !== 503) {
        // Don't show alert for service unavailable (prediction service not running)
        console.log('Prediction service unavailable or insufficient data');
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  // Fetch prediction when component loads
  useEffect(() => {
    if (!isLoading && exercises.length > 0) {
      fetchPrediction();
    }
  }, [isLoading, exercises.length]);

  const getCurrentExercise = () => exercises[currentExercise];

  const speakText = (text, callback) => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.85,
      onDone: () => {
        setIsSpeaking(false);
        if (callback) callback();
      },
      onError: () => {
        setIsSpeaking(false);
      }
    });
  };

  const playInstructionAndWord = () => {
    const exercise = getCurrentExercise();
    if (!exercise) return;
    
    // First speak the instruction, then the target word
    speakText(exercise.instruction, () => {
      setTimeout(() => {
        speakText(exercise.target, () => {
          setHasPlayedAudio(true);
          setHasPlayedInstruction(true);
        });
      }, 500);
    });
  };

  const playInstruction = () => {
    playInstructionAndWord();
  };

  const handleOptionSelect = async (option) => {
    if (feedback) return; // Already answered

    const exercise = getCurrentExercise();
    const isCorrect = option.correct;

    setSelectedOption(option.id);
    setFeedback({
      correct: isCorrect,
      message: isCorrect ? 'Correct! Well done.' : 'Incorrect. Try again next time.'
    });

    // Save progress
    try {
      const token = await AsyncStorage.getItem('token');
      await api.post('/receptive/progress', {
        exercise_index: currentExercise,
        exercise_id: exercise.exercise_id,
        is_correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        user_answer: option.text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Progress saved');

      // Add to results
      setResults([...results, {
        correct: isCorrect,
        response: option.text
      }]);

    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = () => {
    if (currentExercise >= exercises.length - 1) {
      // All exercises completed
      setShowResults(true);
    } else {
      // Move to next exercise
      setCurrentExercise(currentExercise + 1);
      setSelectedOption(null);
      setFeedback(null);
      setHasPlayedAudio(false);
      setHasPlayedInstruction(false);
    }
  };

  const handleRestart = async () => {
    setCurrentExercise(0);
    setSelectedOption(null);
    setFeedback(null);
    setHasPlayedAudio(false);
    setHasPlayedInstruction(false);
    setShowResults(false);
    setResults([]);
    
    // Progress is already saved, just reset UI state
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  if (showResults) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = (correctCount / results.length * 100).toFixed(1);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.resultsContent}>
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Receptive Language Therapy</Text>
            <Text style={styles.resultsSubtitle}>Session Complete!</Text>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreValue}>{correctCount} / {results.length}</Text>
              <Text style={styles.accuracyText}>{accuracy}% Accuracy</Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                <Text style={styles.summaryValue}>{correctCount}</Text>
                <Text style={styles.summaryLabel}>Correct</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="close-circle" size={32} color="#f44336" />
                <Text style={styles.summaryValue}>{results.length - correctCount}</Text>
                <Text style={styles.summaryLabel}>Incorrect</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.backHomeButton} onPress={onBack}>
              <Text style={styles.backHomeButtonText}>Back to Therapy Selection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const exercise = getCurrentExercise();
  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No exercises available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receptive Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Exercise {currentExercise + 1} of {exercises.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentExercise + 1) / exercises.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* ML Prediction Card */}
        {prediction && !predictionLoading && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons name="analytics" size={20} color="#4A90E2" />
              <Text style={styles.predictionTitle}>AI Mastery Prediction</Text>
            </View>
            <View style={styles.predictionContent}>
              <View style={styles.predictionMain}>
                <Text style={styles.predictionDays}>{prediction.predicted_days}</Text>
                <Text style={styles.predictionLabel}>days to receptive mastery</Text>
              </View>
              <View style={styles.predictionStats}>
                <View style={styles.predictionStat}>
                  <Text style={styles.statValue}>{prediction.confidence}%</Text>
                  <Text style={styles.statLabel}>Confidence</Text>
                </View>
                <View style={styles.predictionStat}>
                  <Text style={styles.statValue}>{prediction.current_exercises_completed || 0}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.predictionStat}>
                  <Text style={styles.statValue}>{prediction.current_accuracy?.toFixed(0) || 0}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Instruction */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>{exercise.instruction}</Text>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={playInstruction}
            disabled={isSpeaking}
          >
            <Ionicons name="volume-high" size={24} color="#FFF" />
            <Text style={styles.playButtonText}>
              {isSpeaking ? 'Playing...' : 'Play Instructions'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {exercise.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption === option.id && styles.optionCardSelected,
                feedback && option.correct && styles.optionCardCorrect,
                feedback && selectedOption === option.id && !option.correct && styles.optionCardIncorrect
              ]}
              onPress={() => handleOptionSelect(option)}
              disabled={feedback !== null}
            >
              <Text style={styles.optionEmoji}>
                {option.image || option.emoji || option.shape || '📦'}
              </Text>
              <Text style={styles.optionText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback */}
        {feedback && (
          <View style={[
            styles.feedbackCard,
            feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect
          ]}>
            <Ionicons 
              name={feedback.correct ? "checkmark-circle" : "close-circle"} 
              size={32} 
              color={feedback.correct ? "#4CAF50" : "#f44336"} 
            />
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          </View>
        )}

        {/* Next Button */}
        {feedback && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentExercise >= exercises.length - 1 ? 'See Results' : 'Next Exercise'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  instructionCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionCardSelected: {
    borderColor: '#4A90E2',
  },
  optionCardCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionCardIncorrect: {
    borderColor: '#f44336',
    backgroundColor: '#FFEBEE',
  },
  optionEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  feedbackCorrect: {
    backgroundColor: '#E8F5E9',
  },
  feedbackIncorrect: {
    backgroundColor: '#FFEBEE',
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  resultsContent: {
    padding: 16,
  },
  resultsCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    marginBottom: 16,
  },
  restartButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backHomeButton: {
    paddingVertical: 12,
  },
  backHomeButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  predictionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  predictionContent: {
    gap: 12,
  },
  predictionMain: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  predictionDays: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  predictionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  predictionStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ReceptiveLanguageScreen;
