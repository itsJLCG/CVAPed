import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/api';
import axios from 'axios';
import { API_URL } from '../../../config/apiConfig';

const FluencyTherapyScreen = ({ onBack }) => {
  const [exercises, setExercises] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [levelProgress, setLevelProgress] = useState({
    1: false, 2: false, 3: false, 4: false, 5: false
  });
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(true);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState(''); // 'inhale', 'hold', 'exhale', 'ready'
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [hasCompletedBreathing, setHasCompletedBreathing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const recordingRef = useRef(null);

  useEffect(() => {
    // Load exercises first, then progress
    const initialize = async () => {
      await loadExercises();
      await loadProgress();
      await fetchPrediction();
    };
    initialize();
  }, []);

  const loadExercises = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('📡 Fetching fluency exercises...');
      const response = await api.get('/fluency/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📥 Response received:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        const levels = response.data.levels;
        setExercises(levels);
        console.log(`📚 Loaded ${response.data.total_exercises} fluency exercises`);
        console.log('Levels structure:', Object.keys(levels).map(key => `Level ${key}: ${levels[key].exercises?.length || 0} exercises`));
      } else {
        console.error('❌ API returned success: false');
        Alert.alert('Error', 'Failed to load exercises');
      }
    } catch (error) {
      console.error('❌ Error loading exercises:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/fluency/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.has_progress) {
        const progressLevel = response.data.current_level;
        const progressExercise = response.data.current_exercise;
        
        console.log('✅ Progress loaded - Level:', progressLevel, 'Exercise:', progressExercise);
        
        // Set the current level and exercise directly from validated backend response
        setCurrentLevel(progressLevel);
        setCurrentExercise(progressExercise);
        
        // Update level progress based on backend data
        const newLevelProgress = { 1: false, 2: false, 3: false, 4: false, 5: false };
        if (response.data.level_completion) {
          Object.keys(response.data.level_completion).forEach(levelKey => {
            const levelNum = parseInt(levelKey);
            newLevelProgress[levelNum] = response.data.level_completion[levelKey];
          });
        }
        setLevelProgress(newLevelProgress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const fetchPrediction = async () => {
    try {
      setLoadingPrediction(true);
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/fluency/predict-mastery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPrediction(response.data.prediction);
        console.log('✅ Fluency prediction loaded:', response.data.prediction);
      }
    } catch (error) {
      console.log('Prediction not available:', error.message);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const getCurrentLevelExercises = (level = currentLevel) => {
    if (!exercises || !exercises[level]) {
      return [];
    }
    const levelData = exercises[level];
    const exerciseArray = levelData.exercises || [];
    return exerciseArray;
  };

  const getCurrentExercise = () => {
    const levelExercises = getCurrentLevelExercises();
    if (!levelExercises || levelExercises.length === 0) {
      console.log(`⚠️  No exercises available for level ${currentLevel}`);
      return null;
    }
    if (currentExercise >= levelExercises.length) {
      console.log(`⚠️  Exercise index ${currentExercise} out of bounds (max: ${levelExercises.length - 1})`);
      return null;
    }
    return levelExercises[currentExercise];
  };

  const startBreathing = async () => {
    setIsBreathing(true);
    setHasCompletedBreathing(false);
    
    // Phase 1: Inhale (3 seconds)
    setBreathingPhase('inhale');
    setBreathingTimer(3);
    Speech.speak('Breathe in slowly through your nose', { rate: 0.85 });
    
    for (let i = 3; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 2: Hold (2 seconds)
    setBreathingPhase('hold');
    setBreathingTimer(2);
    Speech.speak('Hold', { rate: 0.85 });
    
    for (let i = 2; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 3: Exhale (4 seconds)
    setBreathingPhase('exhale');
    setBreathingTimer(4);
    Speech.speak('Now breathe out slowly through your mouth', { rate: 0.85 });
    
    for (let i = 4; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 4: Ready (1 second)
    setBreathingPhase('ready');
    setBreathingTimer(1);
    Speech.speak('Get ready to speak', { rate: 0.85 });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete breathing and auto-start recording
    setIsBreathing(false);
    setBreathingPhase('');
    setHasCompletedBreathing(true);
    
    // Auto-start recording after breathing
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  const startRecording = async () => {
    if (isRecording || isProcessing) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await recording.startAsync();
      setRecording(recording);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTimer(0);
      
      // Start timer and auto-stop after 3 seconds
      const interval = setInterval(async () => {
        setRecordingTimer((prev) => {
          const newTime = prev + 0.1;
          if (newTime >= 3) {
            // Auto-stop after 3 seconds
            clearInterval(interval);
            setRecordingInterval(null);
            
            // Stop recording and process
            (async () => {
              try {
                setIsRecording(false);
                setRecordingTimer(0);
                
                const rec = recordingRef.current;
                if (rec) {
                  const status = await rec.getStatusAsync();
                  if (status.isRecording) {
                    await rec.stopAndUnloadAsync();
                    console.log('🛑 Recording auto-stopped at 3 seconds');
                    
                    const uri = rec.getURI();
                    recordingRef.current = null;
                    setRecording(null);
                    await processRecording(uri);
                  }
                }
              } catch (err) {
                console.error('Error auto-stopping:', err);
              }
            })();
            
            return 3;
          }
          return newTime;
        });
      }, 100);
      
      setRecordingInterval(interval);
      
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Clear timer interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      setIsRecording(false);
      setRecordingTimer(0);
      
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
        console.log('🛑 Recording stopped');
        
        const uri = recording.getURI();
        recordingRef.current = null;
        setRecording(null);
        await processRecording(uri);
      } else {
        recordingRef.current = null;
        setRecording(null);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setRecording(null);
    }
  };

  const processRecording = async (uri, retryCount = 0) => {
    if (retryCount === 0) {
      setIsProcessing(true);
      setAssessmentResult(null);
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const exercise = getCurrentExercise();

      if (!exercise) {
        Alert.alert('Error', 'Unable to process recording: exercise not found');
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/wav',
        name: 'fluency_recording.wav',
      });
      formData.append('target_text', exercise.target);
      formData.append('expected_duration', exercise.expected_duration.toString());

      console.log('📤 Sending fluency assessment request');
      console.log('   Target:', exercise.target);
      
      const response = await api.post('/fluency/assess', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000  // 30 second timeout
      });

      if (response.data.success) {
        console.log('✅ Assessment complete');
        console.log('   Fluency Score:', response.data.fluency_score);
        console.log('   Speaking Rate:', response.data.speaking_rate, 'WPM');
        
        setAssessmentResult(response.data);
        
        // Automatically save progress if passed
        if (response.data.fluency_score >= 60) {
          await saveProgress(response.data);
        }
        
        setIsProcessing(false);
      } else {
        Alert.alert('Assessment Failed', response.data.message || 'Please try again');
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
      let errorMsg = 'Failed to process recording.';
      if (error.message.includes('Network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      }
      
      Alert.alert('Error', errorMsg);
      setIsProcessing(false);
    }
  };

  const saveProgress = async (result) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const exercise = getCurrentExercise();

      if (!exercise) {
        console.error('❌ Cannot save progress: exercise is null');
        return;
      }

      const progressData = {
        level: currentLevel,
        exercise_index: currentExercise,
        exercise_id: exercise.exercise_id,
        speaking_rate: result.speaking_rate,
        fluency_score: result.fluency_score,
        pause_count: result.pause_count,
        disfluencies: result.disfluencies,
        passed: result.fluency_score >= 60
      };

      await api.post('/fluency/progress', progressData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Progress saved to database');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = async () => {
    const levelExercises = getCurrentLevelExercises();
    
    // Clear current state
    setAssessmentResult(null);
    setHasStarted(false);
    setHasCompletedBreathing(false);
    setIsBreathing(false);
    setBreathingPhase('');
    setRecordingTimer(0);
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    if (currentExercise < levelExercises.length - 1) {
      // Move to next exercise in current level
      const nextExercise = currentExercise + 1;
      setCurrentExercise(nextExercise);
      console.log(`➡️  Moving to Level ${currentLevel}, Exercise ${nextExercise + 1}/${levelExercises.length}`);
    } else {
      // Level complete - reload progress from server to get correct next position
      console.log(`✅ Level ${currentLevel} complete! Reloading progress...`);
      await loadProgress();
      
      if (currentLevel < 5) {
        Alert.alert(
          'Level Complete!',
          `Great job! You completed Level ${currentLevel}. Moving to Level ${currentLevel + 1}!`
        );
      } else {
        Alert.alert(
          'Congratulations!',
          'You completed all fluency exercises!',
          [{ text: 'OK', onPress: onBack }]
        );
      }
    }
  };

  const playModelAudio = () => {
    const exercise = getCurrentExercise();
    if (!exercise || !exercise.target) {
      console.log('⚠️  Cannot play model audio: exercise or target is missing');
      Alert.alert('Error', 'No exercise available to play');
      return;
    }
    console.log(`🔊 Playing model audio: "${exercise.target}"`);
    Speech.speak(exercise.target, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.75,
    });
  };

  const startExercise = () => {
    setHasStarted(true);
    const exercise = getCurrentExercise();
    
    if (!exercise) {
      console.error('❌ Cannot start exercise: exercise is null');
      Alert.alert('Error', 'Unable to load exercise');
      return;
    }
    
    if (exercise?.breathing) {
      startBreathing();
    } else {
      startRecording();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8e44ad" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </View>
    );
  }

  if (!exercises || Object.keys(exercises).length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fluency Therapy</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No exercises available</Text>
        </View>
      </View>
    );
  }

  const exercise = getCurrentExercise();
  const levelInfo = exercises[currentLevel];
  const canProceed = assessmentResult && assessmentResult.fluency_score >= 60;

  // Safety check for exercise
  if (!exercise) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fluency Therapy</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load current exercise</Text>
          <Text style={styles.errorText}>Level: {currentLevel}, Exercise: {currentExercise}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fluency Therapy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Level Progress */}
        <View style={styles.levelProgressContainer}>
          <Text style={styles.levelProgressTitle}>Your Progress</Text>
          <View style={styles.levelDotsContainer}>
            {[1, 2, 3, 4, 5].map(level => (
              <View
                key={level}
                style={[
                  styles.levelDot,
                  level === currentLevel && styles.levelDotActive,
                  levelProgress[level] && styles.levelDotComplete
                ]}
              >
                <Text style={[
                  styles.levelDotText,
                  (level === currentLevel || levelProgress[level]) && styles.levelDotTextActive
                ]}>
                  {level}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mastery Prediction */}
        {prediction && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons name="time-outline" size={20} color="#8e44ad" />
              <Text style={styles.predictionTitle}>TIME TO FLUENCY MASTERY</Text>
            </View>
            <Text style={styles.predictionDays}>
              {prediction.predicted_days} days
            </Text>
            <Text style={styles.predictionConfidence}>
              {Math.round(prediction.confidence * 100)}% confidence
            </Text>
            {prediction.current_level > 1 && (
              <Text style={styles.predictionProgress}>
                Current: Level {prediction.current_level}
              </Text>
            )}
          </View>
        )}

        {/* Current Exercise */}
        <View style={[styles.exerciseCard, { borderLeftColor: levelInfo?.color || '#8e44ad' }]}>
          <Text style={styles.levelName}>{levelInfo?.name || `Level ${currentLevel}`}</Text>
          <Text style={styles.exerciseNumber}>
            Exercise {currentExercise + 1} of {getCurrentLevelExercises().length}
          </Text>
          
          <View style={styles.instructionBox}>
            <Text style={styles.instructionLabel}>Instruction:</Text>
            <Text style={styles.instructionText}>{exercise?.instruction || 'No instruction available'}</Text>
          </View>

          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Say this:</Text>
            <Text style={styles.targetText}>{exercise?.target || 'No target available'}</Text>
          </View>

          {/* Model Audio Button */}
          <TouchableOpacity style={styles.modelButton} onPress={playModelAudio}>
            <Ionicons name="volume-high" size={24} color="#FFF" />
            <Text style={styles.modelButtonText}>Play Model</Text>
          </TouchableOpacity>
        </View>

        {/* Recording Controls */}
        <View style={styles.recordingSection}>
          {isBreathing ? (
            <View style={styles.breathingCircle}>
              <View style={[
                styles.breathingInnerCircle,
                breathingPhase === 'inhale' && styles.breathingInhale,
                breathingPhase === 'exhale' && styles.breathingExhale,
                breathingPhase === 'hold' && styles.breathingHold,
                breathingPhase === 'ready' && styles.breathingReady
              ]}>
                <Text style={styles.breathingNumber}>{breathingTimer}</Text>
                <Text style={styles.breathingPhaseText}>
                  {breathingPhase === 'inhale' ? 'Breathe In' :
                   breathingPhase === 'hold' ? 'Hold' :
                   breathingPhase === 'exhale' ? 'Breathe Out' :
                   breathingPhase === 'ready' ? 'Ready!' : ''}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                (isProcessing || canProceed) && styles.recordButtonDisabled
              ]}
              onPress={isRecording ? stopRecording : (!hasStarted ? startExercise : startRecording)}
              disabled={isProcessing || canProceed}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic'}
                size={48}
                color="#FFF"
              />
              {isRecording && (
                <Text style={styles.recordingTimerText}>
                  {recordingTimer.toFixed(1)}s / 3.0s
                </Text>
              )}
            </TouchableOpacity>
          )}
          <Text style={styles.recordHint}>
            {isBreathing ? `${breathingPhase}...` :
             isRecording ? 'Tap to stop recording' : 
             isProcessing ? 'Processing...' : 
             !hasStarted ? 'Tap to start' : 'Tap to record'}
          </Text>
        </View>

        {/* Results */}
        {assessmentResult && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Assessment Results</Text>
            
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Fluency Score:</Text>
              <Text style={[
                styles.scoreValue,
                assessmentResult.fluency_score >= 60 ? styles.scorePass : styles.scoreFail
              ]}>
                {assessmentResult.fluency_score}/100
              </Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{assessmentResult.speaking_rate}</Text>
                <Text style={styles.metricLabel}>WPM</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{assessmentResult.pause_count}</Text>
                <Text style={styles.metricLabel}>Pauses</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{assessmentResult.disfluencies}</Text>
                <Text style={styles.metricLabel}>Disfluencies</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{assessmentResult.word_count}</Text>
                <Text style={styles.metricLabel}>Words</Text>
              </View>
            </View>

            <Text style={styles.feedbackText}>{assessmentResult.feedback}</Text>

            {canProceed && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next Exercise</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            )}

            {!canProceed && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => setAssessmentResult(null)}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  levelProgressContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 10,
  },
  levelProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  levelDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelDotActive: {
    backgroundColor: '#8e44ad',
  },
  levelDotComplete: {
    backgroundColor: '#27ae60',
  },
  levelDotText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  levelDotTextActive: {
    color: '#FFF',
  },
  exerciseCard: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  levelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  exerciseNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  instructionBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  instructionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
  },
  targetBox: {
    backgroundColor: '#EEF2FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  targetLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  targetText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  modelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8e44ad',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8e44ad',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  recordButtonActive: {
    backgroundColor: '#E74C3C',
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordingTimerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  recordHint: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
  },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  breathingInnerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#8e44ad',
  },
  breathingInhale: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  breathingHold: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FBC02D',
  },
  breathingExhale: {
    backgroundColor: '#F3E5F5',
    borderColor: '#8e44ad',
  },
  breathingReady: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  breathingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  breathingPhaseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 5,
  },
  resultsCard: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scorePass: {
    color: '#27ae60',
  },
  scoreFail: {
    color: '#E74C3C',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8e44ad',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Prediction Card Styles
  predictionCard: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8e44ad',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e44ad',
    letterSpacing: 1,
    marginLeft: 8,
  },
  predictionDays: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  predictionConfidence: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  predictionProgress: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default FluencyTherapyScreen;
