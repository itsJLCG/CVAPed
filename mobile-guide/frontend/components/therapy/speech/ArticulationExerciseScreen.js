import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SOUND_METADATA = {
  s: { name: 'S Sound', color: '#ce3630' },
  r: { name: 'R Sound', color: '#479ac3' },
  l: { name: 'L Sound', color: '#e8b04e' },
  k: { name: 'K Sound', color: '#8e44ad' },
  th: { name: 'TH Sound', color: '#27ae60' }
};

const ArticulationExerciseScreen = ({ route, navigation }) => {
  const { soundId } = route.params;
  
  const [currentLevel, setCurrentLevel] = useState(1); // Start at Level 1 (Sound)
  const [currentItem, setCurrentItem] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [trialScores, setTrialScores] = useState([]);
  const [trialDetails, setTrialDetails] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [averageScore, setAverageScore] = useState(null);
  const [levelProgress, setLevelProgress] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [exercises, setExercises] = useState(null);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  
  const recordingRef = useRef(null);
  const soundObject = useRef(null);
  const autoStopTimerRef = useRef(null);
  const isStoppingRef = useRef(false);

  const soundData = SOUND_METADATA[soundId];
  const currentLevelData = exercises?.levels?.[currentLevel];
  const currentTarget = currentLevelData?.items?.[currentItem];
  const totalItems = currentLevelData?.items?.length || 3;

  // Request audio permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Microphone permission is required to record your speech. Please grant permission in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
      }
    };
    
    requestPermissions();
  }, []);
  const maxTrials = 3;
  const passThreshold = 0.50;

  // Load exercises from database
  useEffect(() => {
    loadExercises();
  }, [soundId]);

  // Load progress when component mounts
  useEffect(() => {
    loadProgress();
  }, [soundId]);

  // Setup audio mode
  useEffect(() => {
    setupAudio();
    return () => {
      // Cleanup on unmount
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundObject.current) {
        soundObject.current.unloadAsync();
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log(`🔍 Loading exercises for sound: ${soundId}`);
      
      const response = await api.get(`/articulation/exercises/active/${soundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Exercises loaded successfully:', response.data);

      if (response.data.success && response.data.exercises_by_level) {
        // Transform database response to match expected format
        const transformedData = {
          name: soundData.name,
          color: soundData.color,
          levels: {}
        };

        Object.keys(response.data.exercises_by_level).forEach(levelKey => {
          const levelNum = parseInt(levelKey);
          const levelData = response.data.exercises_by_level[levelKey];
          
          console.log(`📝 Level ${levelNum} exercises:`, levelData.exercises);
          
          transformedData.levels[levelNum] = {
            name: levelData.level_name,
            items: levelData.exercises
              .sort((a, b) => a.order - b.order)
              .map(ex => {
                console.log(`   → Exercise: ${ex.target} (order: ${ex.order})`);
                return ex.target;
              })
          };
        });

        console.log('📊 Transformed exercises:', transformedData);
        console.log('📋 Level 1 items:', transformedData.levels[1]?.items);
        setExercises(transformedData);
      } else {
        console.warn('⚠️  Invalid response format:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading exercises:');
      console.error('   Error message:', error.message);
      console.error('   Error response:', error.response?.data);
      console.error('   Error status:', error.response?.status);
      
      let errorMessage = 'Failed to load exercises.';
      
      if (error.response?.status === 503) {
        errorMessage = 'Therapy service is not running. Please contact your administrator.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No exercises found for this sound. Please contact your therapist.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error Loading Exercises', errorMessage);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const loadProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log(`📈 Loading progress for sound: ${soundId}`);
      
      const response = await api.get(`/articulation/progress/${soundId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Progress loaded:', response.data);

      if (response.data.success && response.data.has_progress) {
        setCurrentLevel(response.data.current_level);
        setCurrentItem(response.data.current_item);
        
        const newLevelProgress = { 1: false, 2: false, 3: false, 4: false, 5: false };
        Object.keys(response.data.levels || {}).forEach(levelKey => {
          const levelNum = parseInt(levelKey);
          newLevelProgress[levelNum] = response.data.levels[levelKey].is_complete || false;
        });
        setLevelProgress(newLevelProgress);
        
        // Restore trial data for current item if available (web version structure)
        const currentLevelKey = response.data.current_level.toString();
        const currentItemKey = response.data.current_item.toString();
        const currentLevelData = response.data.levels[currentLevelKey];
        
        if (currentLevelData && currentLevelData.items && currentLevelData.items[currentItemKey]) {
          const currentItemData = currentLevelData.items[currentItemKey];
          
          if (currentItemData.trial_details && currentItemData.trial_details.length > 0) {
            console.log(`   📝 Restoring ${currentItemData.trial_details.length} saved trials`);
            setTrialScores(currentItemData.trial_details.map(t => t.computed_score));
            setTrialDetails(currentItemData.trial_details);
            setCurrentTrial(currentItemData.trial_details.length + 1);
            
            if (currentItemData.average_score !== undefined) {
              setAverageScore(currentItemData.average_score);
            }
          }
        }
        
        console.log('📊 Progress state updated');
      } else {
        console.log('ℹ️  No previous progress found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading progress:');
      console.error('   Error message:', error.message);
      console.error('   Error response:', error.response?.data);
      
      // Don't show alert for progress errors - just start fresh
      console.log('ℹ️  Starting with fresh progress');
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || isProcessing) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      // Clear any existing timer
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      // Reset stopping flag
      isStoppingRef.current = false;

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      
      // Use settings that create proper WAV files compatible with Azure
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);

      // Auto-stop after 10 seconds
      autoStopTimerRef.current = setTimeout(() => {
        if (recordingRef.current && !isStoppingRef.current) {
          stopRecording();
        }
      }, 10000);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    // Prevent multiple simultaneous calls
    if (!recordingRef.current || isStoppingRef.current) return;
    
    isStoppingRef.current = true;

    try {
      // Clear auto-stop timer
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      setIsRecording(false);
      
      // Get URI before unloading
      const uri = recordingRef.current.getURI();
      
      // Check if already unloaded to prevent error
      const status = await recordingRef.current.getStatusAsync();
      if (status.canRecord === false && status.isDoneRecording === true) {
        // Already stopped, just get URI and process
        if (uri) {
          await processRecording(uri);
        }
      } else {
        // Stop and unload
        await recordingRef.current.stopAndUnloadAsync();
        if (uri) {
          await processRecording(uri);
        }
      }

      recordingRef.current = null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Try to get URI anyway
      try {
        const uri = recordingRef.current?.getURI();
        if (uri) {
          await processRecording(uri);
        } else {
          Alert.alert('Error', 'Failed to stop recording. Please try again.');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to stop recording. Please try again.');
      }
      recordingRef.current = null;
    } finally {
      isStoppingRef.current = false;
    }
  };

  const processRecording = async (audioUri, retryCount = 0) => {
    // Only set processing true on first attempt
    if (retryCount === 0) {
      setIsProcessing(true);
    }

    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
      const user = userData.user || userData;
      const token = await AsyncStorage.getItem('token');

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'recording.wav'
      });
      formData.append('patient_id', user.id || 'test-patient');
      formData.append('sound_id', soundId);
      formData.append('level', currentLevel.toString());
      formData.append('item_index', currentItem.toString());
      formData.append('target', currentTarget);
      formData.append('trial', currentTrial.toString());

      const response = await api.post('/articulation/record', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000  // 30 second timeout
      });

      if (response.data.success) {
        const score = response.data.scores?.computed_score || 0;
        
        const details = {
          trial: currentTrial,
          computed_score: score,
          pronunciation_score: response.data.scores?.pronunciation_score || 0,
          accuracy_score: response.data.scores?.accuracy_score || 0,
          completeness_score: response.data.scores?.completeness_score || 0,
          fluency_score: response.data.scores?.fluency_score || 0,
          transcription: response.data.transcription || '',
          feedback: response.data.feedback || ''
        };
        
        const newTrialScores = [...trialScores, score];
        const newTrialDetails = [...trialDetails, details];
        
        setTrialScores(newTrialScores);
        setTrialDetails(newTrialDetails);

        if (newTrialScores.length >= maxTrials) {
          const avg = newTrialScores.reduce((a, b) => a + b, 0) / newTrialScores.length;
          setAverageScore(avg);
          
          // Save progress to database after completing all trials
          saveProgressToDatabase(avg, newTrialDetails);
        } else {
          // Automatically increment trial counter for next recording
          setCurrentTrial(currentTrial + 1);
        }
        
        // Success - reset processing flag
        setIsProcessing(false);
      }

    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message.includes('Network'))) {
        console.log(`🔄 Retrying... Attempt ${retryCount + 1}/2`);
        // Keep processing flag true and retry
        setTimeout(() => {
          processRecording(audioUri, retryCount + 1);
        }, 1000);
        return; // Exit without resetting flag
      }
      
      // All retries exhausted - show error and reset flag
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

  const saveProgressToDatabase = async (avgScore, trials) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData') || '{}');
      const user = userData.user || userData;
      const token = await AsyncStorage.getItem('token');

      const progressData = {
        sound_id: soundId,
        level: currentLevel,
        item_index: currentItem,
        completed: avgScore >= passThreshold,
        average_score: avgScore,
        passed: avgScore >= passThreshold,
        trial_details: trials.map(t => ({
          trial: t.trial,
          computed_score: t.computed_score,
          pronunciation_score: t.pronunciation_score,
          accuracy_score: t.accuracy_score,
          completeness_score: t.completeness_score,
          fluency_score: t.fluency_score,
          transcription: t.transcription
        })),
        timestamp: new Date().toISOString()
      };

      await api.post('/articulation/progress', progressData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Progress saved to database');
    } catch (error) {
      console.error('Error saving progress:', error);
      // Don't show alert - this is background operation
    }
  };

  const playModelAudio = async () => {
    try {
      // Stop any currently playing speech
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
      
      // Use text-to-speech to say the target word
      Speech.speak(currentTarget, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.75, // Slightly slower for clarity
      });
      
    } catch (error) {
      console.error('Error playing model audio:', error);
      Alert.alert('Audio Error', 'Could not play model audio. Please try again.');
    }
  };

  const handleNextItem = async () => {
    // Progress already saved after 3rd trial in saveProgressToDatabase
    // No need to save again here
    
    if (currentItem < totalItems - 1) {
      setCurrentItem(currentItem + 1);
      resetTrials();
    } else if (averageScore >= passThreshold) {
      if (currentLevel < 5) {
        Alert.alert(
          'Level Complete!',
          `Great job! Moving to Level ${currentLevel + 1}: ${exercises.levels[currentLevel + 1].name}`,
          [{ text: 'Continue', onPress: () => {
            setCurrentLevel(currentLevel + 1);
            setCurrentItem(0);
            setLevelProgress({ ...levelProgress, [currentLevel]: true });
            resetTrials();
          }}]
        );
      } else {
        Alert.alert(
          'Congratulations!',
          'You completed all levels for this sound!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  };

  const resetTrials = () => {
    setCurrentTrial(1);
    setTrialScores([]);
    setTrialDetails([]);
    setAverageScore(null);
  };

  const handleRetry = () => {
    if (currentTrial < maxTrials) {
      setCurrentTrial(currentTrial + 1);
    }
  };

  const canProceed = averageScore !== null && averageScore >= passThreshold;
  const needsMoreTrials = trialScores.length < maxTrials;
  const failedItem = averageScore !== null && averageScore < passThreshold;

  if (!soundData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Sound not found</Text>
      </View>
    );
  }

  if (isLoadingProgress || isLoadingExercises) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={soundData.color} />
        <Text style={styles.loadingText}>
          {isLoadingExercises ? 'Loading exercises...' : 'Loading your progress...'}
        </Text>
      </View>
    );
  }

  if (!exercises || !exercises.levels || Object.keys(exercises.levels).length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>No exercises available</Text>
        <Text style={styles.errorText}>
          Please contact your therapist to add exercises for this sound.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{soundData.name} Assessment</Text>
          <Text style={styles.headerSubtitle}>
            Level {currentLevel}: {currentLevelData.name} • Item {currentItem + 1}/{totalItems}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLevels}>
            {[1, 2, 3, 4, 5].map(level => (
              <View
                key={level}
                style={[
                  styles.progressLevel,
                  {
                    borderColor: level <= currentLevel ? soundData.color : '#e5e7eb',
                    backgroundColor: level < currentLevel ? soundData.color : level === currentLevel ? 'white' : '#f9fafb',
                  }
                ]}
              >
                <Text
                  style={[
                    styles.levelNum,
                    {
                      color: level < currentLevel ? 'white' : level === currentLevel ? soundData.color : '#9ca3af'
                    }
                  ]}
                >
                  {level}
                </Text>
                <Text
                  style={[
                    styles.levelName,
                    {
                      color: level < currentLevel ? 'white' : level === currentLevel ? soundData.color : '#9ca3af'
                    }
                  ]}
                >
                  {exercises.levels[level]?.name || `Level ${level}`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Target Section */}
        <View style={styles.targetSection}>
          <Text style={styles.sectionLabel}>Target Stimulus</Text>
          <Text style={[styles.targetText, { color: soundData.color }]}>
            "{currentTarget}"
          </Text>
          <TouchableOpacity style={styles.modelBtn} onPress={playModelAudio}>
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.modelBtnText}>Play Model Audio</Text>
          </TouchableOpacity>
        </View>

        {/* Recording Section */}
        <View style={styles.recordingSection}>
          <Text style={styles.sectionLabel}>
            Recording - Trial {currentTrial}/{maxTrials}
          </Text>
          
          <View style={styles.recordingControls}>
            {!isRecording && !isProcessing && needsMoreTrials && (
              <TouchableOpacity
                style={[styles.recordBtn, { backgroundColor: soundData.color }]}
                onPress={startRecording}
              >
                <Ionicons name="mic" size={24} color="white" />
                <Text style={styles.recordBtnText}>Record Response</Text>
              </TouchableOpacity>
            )}

            {isRecording && (
              <TouchableOpacity
                style={[styles.recordBtn, styles.recordingBtn]}
                onPress={stopRecording}
              >
                <Ionicons name="stop" size={24} color="white" />
                <Text style={styles.recordBtnText}>Stop Recording</Text>
              </TouchableOpacity>
            )}

            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color={soundData.color} />
                <Text style={styles.processingText}>Processing assessment...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Results Section */}
        {trialScores.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionLabel}>Assessment Results</Text>
            
            {trialDetails.map((detail, index) => (
              <View key={index} style={styles.trialCard}>
                <View style={styles.trialHeader}>
                  <Text style={styles.trialNum}>Trial {index + 1}</Text>
                  <Text
                    style={[
                      styles.trialScore,
                      { color: detail.computed_score >= passThreshold ? '#27ae60' : '#e67e22' }
                    ]}
                  >
                    {(detail.computed_score * 100).toFixed(0)}%
                  </Text>
                </View>
                
                <View style={styles.metricsContainer}>
                  {[
                    { label: 'Pronunciation', score: detail.pronunciation_score, color: '#3b82f6' },
                    { label: 'Accuracy', score: detail.accuracy_score, color: '#8b5cf6' },
                    { label: 'Completeness', score: detail.completeness_score, color: '#10b981' },
                    { label: 'Fluency', score: detail.fluency_score, color: '#f59e0b' }
                  ].map((metric, idx) => (
                    <View key={idx} style={styles.metricRow}>
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                      <View style={styles.metricBarContainer}>
                        <View style={styles.metricBarBg}>
                          <View
                            style={[
                              styles.metricBarFill,
                              { 
                                width: `${Math.max(5, metric.score * 100)}%`, 
                                backgroundColor: metric.color 
                              }
                            ]}
                          >
                            <Text style={styles.metricBarText}>
                              {(metric.score * 100).toFixed(0)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {detail.transcription && (
                  <Text style={styles.transcription}>
                    You said: "{detail.transcription}"
                  </Text>
                )}
              </View>
            ))}

            {/* Trial Progress Line Chart */}
            {trialDetails.length > 1 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>📈 Overall Score Progress</Text>
                
                {/* Line chart showing average score per trial */}
                <View style={styles.lineChartContainer}>
                  {/* Y-axis */}
                  <View style={styles.yAxis}>
                    <Text style={styles.yAxisLabel}>100%</Text>
                    <Text style={styles.yAxisLabel}>75%</Text>
                    <Text style={styles.yAxisLabel}>50%</Text>
                    <Text style={styles.yAxisLabel}>25%</Text>
                    <Text style={styles.yAxisLabel}>0%</Text>
                  </View>

                  {/* Chart area */}
                  <View style={styles.chartContent}>
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <View key={idx} style={styles.gridLine} />
                    ))}

                    {/* Line and points */}
                    <View style={styles.linesContainer}>
                      {/* Draw connecting lines using small segments */}
                      {trialDetails.map((trial, idx) => {
                        if (idx === trialDetails.length - 1) return null;
                        
                        const score = trial.computed_score * 100;
                        const nextScore = trialDetails[idx + 1]?.computed_score * 100;
                        
                        const x1 = (idx / Math.max(trialDetails.length - 1, 1)) * 100;
                        const x2 = ((idx + 1) / Math.max(trialDetails.length - 1, 1)) * 100;
                        
                        const segments = [];
                        const numSegments = 20; // More segments = smoother line
                        
                        for (let i = 0; i < numSegments; i++) {
                          const t = i / numSegments;
                          const x = x1 + (x2 - x1) * t;
                          const y = score + (nextScore - score) * t;
                          
                          segments.push(
                            <View
                              key={`seg-${idx}-${i}`}
                              style={{
                                position: 'absolute',
                                left: `${x}%`,
                                bottom: `${y}%`,
                                width: 4,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#3b82f6',
                                marginLeft: -2,
                                marginBottom: -2,
                              }}
                            />
                          );
                        }
                        
                        return segments;
                      })}
                      
                      {/* Draw data points on top */}
                      {trialDetails.map((trial, idx) => {
                        const score = trial.computed_score * 100;
                        const leftPos = (idx / Math.max(trialDetails.length - 1, 1)) * 100;

                        return (
                          <View
                            key={`point-${idx}`}
                            style={[
                              styles.dataPoint,
                              {
                                left: `${leftPos}%`,
                                bottom: `${score}%`,
                                backgroundColor: score >= passThreshold * 100 ? '#10b981' : '#f59e0b',
                              }
                            ]}
                          >
                            <Text style={styles.pointValue}>{score.toFixed(0)}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* X-axis labels */}
                    <View style={styles.xAxis}>
                      {trialDetails.map((_, idx) => (
                        <Text key={idx} style={styles.xAxisLabel}>Trial {idx + 1}</Text>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Summary */}
                <View style={styles.progressSummary}>
                  <Text style={styles.progressSummaryText}>
                    {trialScores[trialScores.length - 1] > trialScores[0]
                      ? `📈 Improved by ${((trialScores[trialScores.length - 1] - trialScores[0]) * 100).toFixed(0)}% from first trial!`
                      : trialScores[trialScores.length - 1] < trialScores[0]
                      ? `📉 Decreased by ${((trialScores[0] - trialScores[trialScores.length - 1]) * 100).toFixed(0)}% from first trial`
                      : '➡️ Maintained consistent performance across trials'}
                  </Text>
                </View>
              </View>
            )}

            {averageScore !== null && (
              <View
                style={[
                  styles.averageBox,
                  { borderColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }
                ]}
              >
                <View style={styles.avgRow}>
                  <Text style={styles.avgLabel}>Average Score:</Text>
                  <Text
                    style={[
                      styles.avgValue,
                      { color: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }
                    ]}
                  >
                    {(averageScore * 100).toFixed(0)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.avgStatus,
                    { backgroundColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }
                  ]}
                >
                  <Text style={styles.avgStatusText}>
                    {averageScore >= passThreshold ? 'PASSED' : 'BELOW THRESHOLD'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {needsMoreTrials && trialScores.length > 0 && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={startRecording}>
              <Text style={styles.secondaryBtnText}>Record Trial {currentTrial}</Text>
            </TouchableOpacity>
          )}

          {canProceed && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: soundData.color }]}
              onPress={handleNextItem}
            >
              <Text style={styles.primaryBtnText}>
                {currentItem < totalItems - 1 ? 'Next Item →' : 'Complete Level →'}
              </Text>
            </TouchableOpacity>
          )}

          {failedItem && (
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: soundData.color }]}
              onPress={resetTrials}
            >
              <Ionicons name="refresh" size={20} color={soundData.color} />
              <Text style={[styles.retryBtnText, { color: soundData.color }]}>Retry This Item</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  progressLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLevel: {
    flex: 1,
    marginHorizontal: 2,
    padding: 8,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  levelNum: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelName: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  targetSection: {
    backgroundColor: 'white',
    margin: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  targetText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  modelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4b5563',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modelBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordingSection: {
    backgroundColor: 'white',
    margin: 8,
    padding: 20,
    borderRadius: 12,
  },
  recordingControls: {
    alignItems: 'center',
    minHeight: 60,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  recordingBtn: {
    backgroundColor: '#e74c3c',
  },
  recordBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  resultsSection: {
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 12,
  },
  trialCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  trialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  trialNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  trialScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricsContainer: {
    marginBottom: 8,
  },
  metricRow: {
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
    marginBottom: 4,
  },
  metricBarContainer: {
    width: '100%',
  },
  metricBarBg: {
    height: 28,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 40,
  },
  metricBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  transcription: {
    fontSize: 12,
    color: '#4b5563',
    fontStyle: 'italic',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  lineChartContainer: {
    flexDirection: 'row',
    height: 180,
    marginBottom: 16,
  },
  yAxis: {
    width: 45,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#9ca3af',
    paddingBottom: 30,
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#e5e7eb',
    top: 0,
  },
  linesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dataPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
    marginLeft: -8,
    marginBottom: -8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  pointValue: {
    position: 'absolute',
    top: -22,
    left: -12,
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lineWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lineSegment: {
    zIndex: 10,
    marginBottom: -1.5, // Center the line vertically (height is 3)
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '700',
  },
  progressSummary: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  progressSummaryText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
    textAlign: 'center',
  },
  averageBox: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avgLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  avgValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  avgStatus: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  avgStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionSection: {
    padding: 16,
  },
  secondaryBtn: {
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    padding: 16,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ArticulationExerciseScreen;
