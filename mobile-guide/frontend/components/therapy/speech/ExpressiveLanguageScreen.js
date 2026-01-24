import React, { useState, useEffect, useRef } from 'react';
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
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import api from '../../../services/api';

const ExpressiveLanguageScreen = ({ onBack, reloadTrigger }) => {
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [hasPlayedInstruction, setHasPlayedInstruction] = useState(false);
  
  // XGBoost ML Prediction
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  
  const autoStopTimerRef = useRef(null);
  const isStoppingRef = useRef(false);

  // Initial load
  useEffect(() => {
    loadExercisesAndProgress();
    setupAudioMode();
  }, []);

  // Reload progress when returning to screen (reloadTrigger changes)
  useEffect(() => {
    if (reloadTrigger > 0 && exercises.length > 0 && !isLoading) {
      console.log('🔄 Reload trigger detected, reloading expressive progress');
      loadProgress();
    }
  }, [reloadTrigger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      Speech.stop();
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  // Auto-play instruction when exercise changes
  useEffect(() => {
    if (!showResults && exercises.length > 0 && !hasPlayedInstruction && !feedback) {
      const timer = setTimeout(() => {
        playInstruction();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentExercise, exercises.length, showResults, hasPlayedInstruction, feedback]);

  const setupAudioMode = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const loadExercisesAndProgress = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');

      // Load exercises
      const exercisesResponse = await api.get('/expressive/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (exercisesResponse.data.success) {
        // Flatten exercises from grouped structure
        const exercisesArray = [];
        Object.values(exercisesResponse.data.exercises_by_level).forEach(levelData => {
          exercisesArray.push(...levelData.exercises);
        });

        console.log(`📚 Loaded ${exercisesArray.length} expressive exercises`);
        setExercises(exercisesArray);

        if (exercisesArray.length > 0) {
          console.log('First exercise:', exercisesArray[0]);
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
    console.log('🔄 Loading expressive progress for existing exercises');
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
      const progressResponse = await api.get('/expressive/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (progressResponse.data.success && progressResponse.data.has_progress) {
        const currentIdx = progressResponse.data.current_exercise;
        const progressExercises = progressResponse.data.exercises || {};
        
        console.log('📈 Expressive Progress Response:', {
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
              response: exerciseData.transcription || exerciseData.user_answer,
              score: exerciseData.score
            });
          }
        }
        setResults(progressResults);
        
        console.log(`📑 Built expressive results array with ${progressResults.length} items`);
        
        // Check if all exercises completed
        if (currentIdx >= exercisesArray.length) {
          console.log('✅ All expressive exercises completed! Showing results.');
          setCurrentExercise(0);
          setShowResults(true);
        } else {
          setCurrentExercise(currentIdx);
          console.log(`📍 Setting current expressive exercise to ${currentIdx}`);
        }
      } else {
        console.log('ℹ️ No expressive progress found, starting from beginning');
        setCurrentExercise(0);
      }
    } catch (error) {
      console.error('Error loading expressive progress:', error);
    }
  };

  const fetchPrediction = async () => {
    try {
      setPredictionLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const response = await api.post('/expressive/predict-mastery', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.prediction) {
        // Convert confidence from 0-1 to 0-100 percentage
        const predictionData = {
          ...response.data.prediction,
          confidence: Math.round(response.data.prediction.confidence * 100)
        };
        setPrediction(predictionData);
        console.log('🔮 Expressive language mastery prediction:', predictionData);
      }
    } catch (error) {
      console.error('Error fetching expressive prediction:', error);
      if (error.response?.status !== 503) {
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

  const playInstruction = async () => {
    const exercise = getCurrentExercise();
    if (!exercise || isSpeaking) return;

    setIsSpeaking(true);
    setHasPlayedInstruction(true);

    try {
      await Speech.speak(exercise.instruction, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          setIsSpeaking(false);
        },
        onError: () => {
          setIsSpeaking(false);
        }
      });
    } catch (error) {
      console.error('Error playing instruction:', error);
      setIsSpeaking(false);
    }
  };

  const playStory = async (story) => {
    if (!story || isSpeaking) return;

    setIsSpeaking(true);
    try {
      await Speech.speak(story, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85,
        onDone: () => {
          setIsSpeaking(false);
        },
        onError: () => {
          setIsSpeaking(false);
        }
      });
    } catch (error) {
      console.error('Error playing story:', error);
      setIsSpeaking(false);
    }
  };

  const getCurrentExercise = () => {
    if (!exercises || exercises.length === 0 || currentExercise >= exercises.length) {
      return null;
    }
    return exercises[currentExercise];
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record');
        return;
      }

      // Clear any existing timer
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      // Reset stopping flag
      isStoppingRef.current = false;

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      console.log('🎤 Recording started');

      // Auto-stop after 30 seconds
      autoStopTimerRef.current = setTimeout(() => {
        if (newRecording && !isStoppingRef.current) {
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording || isStoppingRef.current) return;
    
    isStoppingRef.current = true;

    try {
      // Clear auto-stop timer
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      console.log('🛑 Stopping recording');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      console.log('📁 Recording saved to:', uri);
      await processRecording(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      isStoppingRef.current = false;
    }
  };

  const processRecording = async (uri, retryCount = 0) => {
    if (retryCount === 0) {
      setIsProcessing(true);
    }
    const exercise = getCurrentExercise();

    try {
      const token = await AsyncStorage.getItem('token');

      // Create FormData for audio upload
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      });
      formData.append('exercise_id', exercise.exercise_id);
      formData.append('exercise_type', exercise.type);
      formData.append('expected_keywords', JSON.stringify(exercise.expected_keywords || []));
      formData.append('min_words', exercise.min_words || 5);

      console.log('📤 Sending audio for assessment...');

      const response = await api.post('/expressive/assess', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000  // 30 second timeout
      });

      if (response.data.success) {
        const { transcription, score, feedback: feedbackMsg, key_phrases } = response.data;
        const isCorrect = score >= 0.7;

        setFeedback({
          correct: isCorrect,
          message: feedbackMsg,
          transcription,
          keyPhrases: key_phrases || [],
          score
        });

        console.log('✅ Assessment complete:', { transcription, score, isCorrect });

        // Save progress
        await saveProgress(isCorrect, score, transcription);

        // Add to results
        setResults([...results, {
          correct: isCorrect,
          response: transcription,
          score
        }]);
        
        setIsProcessing(false);
      } else {
        Alert.alert('Error', 'Failed to process recording');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message.includes('Network'))) {
        console.log(`🔄 Retrying... Attempt ${retryCount + 1}/2`);
        setTimeout(() => {
          processRecording(uri, retryCount + 1);
        }, 1000);
        return;
      }
      
      // All retries exhausted
      let errorMsg = 'Failed to assess recording.';
      if (error.message.includes('Network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      }
      
      Alert.alert('Error', errorMsg);
      setIsProcessing(false);
    }
  };

  const saveProgress = async (isCorrect, score, transcription) => {
    try {
      const exercise = getCurrentExercise();
      const token = await AsyncStorage.getItem('token');

      await api.post('/expressive/progress', {
        exercise_index: currentExercise,
        exercise_id: exercise.exercise_id,
        is_correct: isCorrect,
        score: score,
        transcription: transcription
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Expressive progress saved');
    } catch (error) {
      console.error('Error saving expressive progress:', error);
    }
  };

  const handleNext = () => {
    if (currentExercise >= exercises.length - 1) {
      // All exercises completed
      setShowResults(true);
    } else {
      // Move to next exercise
      setCurrentExercise(currentExercise + 1);
      setFeedback(null);
      setHasPlayedInstruction(false);
    }
  };

  const handleRetry = () => {
    setFeedback(null);
  };

  const handleBackToSelection = () => {
    if (onBack) {
      onBack();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expressive Language</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No exercises available</Text>
        </View>
      </View>
    );
  }

  const exercise = getCurrentExercise();

  if (showResults) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = results.length > 0 ? (correctCount / results.length * 100).toFixed(0) : 0;
    const averageScore = results.length > 0
      ? (results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length * 100).toFixed(0)
      : 0;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>🎉 Session Complete!</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{results.length}</Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{correctCount}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{averageScore}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </View>

            <View style={styles.resultsListContainer}>
              <Text style={styles.resultsListTitle}>Exercise Results:</Text>
              {results.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultIndex}>Exercise {index + 1}</Text>
                    <View style={[
                      styles.resultBadge,
                      { backgroundColor: result.correct ? '#10b98120' : '#f59e0b20' }
                    ]}>
                      <Text style={[
                        styles.resultBadgeText,
                        { color: result.correct ? '#10b981' : '#f59e0b' }
                      ]}>
                        {result.correct ? '✓ Correct' : `${(result.score * 100).toFixed(0)}%`}
                      </Text>
                    </View>
                  </View>
                  {result.response && (
                    <Text style={styles.resultResponse}>
                      "{result.response}"
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expressive Language</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Exercise {currentExercise + 1} of {exercises.length}
          </Text>
          <Text style={styles.levelText}>Level {exercise?.level || 1}</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentExercise + 1) / exercises.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* ML Prediction Card */}
        {prediction && !predictionLoading && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons name="analytics" size={20} color="#8b5cf6" />
              <Text style={styles.predictionTitle}>AI Mastery Prediction</Text>
            </View>
            <View style={styles.predictionContent}>
              <View style={styles.predictionMain}>
                <Text style={styles.predictionDays}>{prediction.predicted_days}</Text>
                <Text style={styles.predictionLabel}>days to expressive mastery</Text>
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

        <View style={styles.exerciseCard}>
          {/* Instructions */}
          <View style={styles.instructionSection}>
            <View style={styles.instructionHeader}>
              <Text style={styles.instructionTitle}>Instructions</Text>
              <TouchableOpacity
                style={styles.speakButton}
                onPress={playInstruction}
                disabled={isSpeaking}
              >
                <Ionicons name="volume-high" size={20} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.instructionText}>{exercise?.instruction}</Text>
          </View>

          {/* Exercise Prompt */}
          {exercise?.type === 'description' && (
            <View style={styles.promptSection}>
              <Text style={styles.promptLabel}>Look at this:</Text>
              <View style={styles.emojiContainer}>
                <Text style={styles.promptEmoji}>{exercise.prompt}</Text>
              </View>
            </View>
          )}

          {exercise?.type === 'sentence' && (
            <View style={styles.promptSection}>
              <Text style={styles.promptLabel}>Use these words:</Text>
              <Text style={styles.promptText}>{exercise.prompt}</Text>
            </View>
          )}

          {exercise?.type === 'retell' && exercise.story && (
            <View style={styles.storySection}>
              <View style={styles.storyHeader}>
                <Text style={styles.storyLabel}>Story:</Text>
                <TouchableOpacity
                  style={styles.speakButton}
                  onPress={() => playStory(exercise.story)}
                  disabled={isSpeaking}
                >
                  <Ionicons name="volume-high" size={20} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
              <View style={styles.storyBox}>
                <Text style={styles.storyText}>{exercise.story}</Text>
              </View>
            </View>
          )}

          {/* Recording Controls */}
          {!feedback && (
            <View style={styles.recordingSection}>
              {!isRecording && !isProcessing && (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={28} color="#FFF" />
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              )}

              {isRecording && (
                <TouchableOpacity
                  style={[styles.recordButton, styles.recordingButton]}
                  onPress={stopRecording}
                >
                  <Ionicons name="stop" size={28} color="#FFF" />
                  <Text style={styles.recordButtonText}>Stop Recording</Text>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                  </View>
                </TouchableOpacity>
              )}

              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={styles.processingText}>Processing your response...</Text>
                </View>
              )}
            </View>
          )}

          {/* Feedback */}
          {feedback && (
            <View style={[
              styles.feedbackSection,
              feedback.correct ? styles.feedbackSuccess : styles.feedbackWarning
            ]}>
              <Text style={styles.feedbackMessage}>
                {feedback.correct ? '✓' : '●'} {feedback.message}
              </Text>
              {feedback.transcription && (
                <View style={styles.feedbackDetail}>
                  <Text style={styles.feedbackLabel}>What you said:</Text>
                  <Text style={styles.feedbackValue}>{feedback.transcription}</Text>
                </View>
              )}
              {feedback.keyPhrases && feedback.keyPhrases.length > 0 && (
                <View style={styles.feedbackDetail}>
                  <Text style={styles.feedbackLabel}>Key phrases found:</Text>
                  <Text style={styles.feedbackValue}>{feedback.keyPhrases.join(', ')}</Text>
                </View>
              )}
              {feedback.score !== undefined && (
                <View style={styles.feedbackDetail}>
                  <Text style={styles.feedbackLabel}>Score:</Text>
                  <Text style={styles.feedbackValue}>{(feedback.score * 100).toFixed(0)}%</Text>
                </View>
              )}

              <View style={styles.feedbackActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.retryButton]}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh" size={18} color="#8b5cf6" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.nextButton]}
                  onPress={handleNext}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  progressContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  levelText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  exerciseCard: {
    margin: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionSection: {
    marginBottom: 20,
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  speakButton: {
    padding: 8,
    backgroundColor: '#8b5cf615',
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  promptSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emojiContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  promptEmoji: {
    fontSize: 64,
  },
  promptText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  storySection: {
    marginBottom: 20,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  storyBox: {
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  storyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  recordButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  recordingIndicator: {
    marginLeft: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  feedbackSection: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  feedbackSuccess: {
    backgroundColor: '#10b98115',
    borderLeftColor: '#10b981',
  },
  feedbackWarning: {
    backgroundColor: '#f59e0b15',
    borderLeftColor: '#f59e0b',
  },
  feedbackMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  feedbackDetail: {
    marginTop: 10,
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 3,
  },
  feedbackValue: {
    fontSize: 14,
    color: '#333',
  },
  feedbackActions: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#8b5cf6',
  },
  retryButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  nextButton: {
    backgroundColor: '#8b5cf6',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  resultsCard: {
    margin: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  resultsListContainer: {
    marginTop: 10,
  },
  resultsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  resultItem: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultResponse: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
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
    borderLeftColor: '#8b5cf6',
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
    color: '#8b5cf6',
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
});

export default ExpressiveLanguageScreen;
