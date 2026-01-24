import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  Accelerometer, 
  Gyroscope, 
  Magnetometer,
  Barometer,
  DeviceMotion,
  Pedometer 
} from 'expo-sensors';
import gaitAnalysisAPI from '../../services/gaitApi';

const GaitAnalysisScreen = ({ onBack, onNavigateToExercisePlan }) => {
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sensorData, setSensorData] = useState({
    accelerometer: [],
    gyroscope: [],
    magnetometer: [],
    barometer: [],
    deviceMotion: [],
  });
  const [pedometerData, setPedometerData] = useState({ steps: 0, start: null, end: null });

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Sensor subscriptions
  const accelerometerSubscription = useRef(null);
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const barometerSubscription = useRef(null);
  const deviceMotionSubscription = useRef(null);
  const pedometerSubscription = useRef(null);
  const timerInterval = useRef(null);

  // Pulse animation for recording button
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Start recording sensor data
  const startRecording = async () => {
    try {
      console.log('=== Starting Sensor Recording ===');
      
      // Set update intervals (100ms = 10Hz)
      Accelerometer.setUpdateInterval(100);
      Gyroscope.setUpdateInterval(100);
      Magnetometer.setUpdateInterval(100);
      Barometer.setUpdateInterval(100);
      DeviceMotion.setUpdateInterval(100);

      // Clear previous data
      setSensorData({ 
        accelerometer: [], 
        gyroscope: [],
        magnetometer: [],
        barometer: [],
        deviceMotion: [],
      });
      setPedometerData({ steps: 0, start: Date.now(), end: null });
      setRecordingTime(0);
      setAnalysisResult(null);

      console.log('Subscribing to accelerometer...');
      // Subscribe to accelerometer
      accelerometerSubscription.current = Accelerometer.addListener((data) => {
        setSensorData((prev) => ({
          ...prev,
          accelerometer: [
            ...prev.accelerometer,
            {
              x: data.x,
              y: data.y,
              z: data.z,
              timestamp: Date.now(),
            },
          ],
        }));
      });

      console.log('Subscribing to gyroscope...');
      // Subscribe to gyroscope
      gyroscopeSubscription.current = Gyroscope.addListener((data) => {
        setSensorData((prev) => ({
          ...prev,
          gyroscope: [
            ...prev.gyroscope,
            {
              x: data.x,
              y: data.y,
              z: data.z,
              timestamp: Date.now(),
            },
          ],
        }));
      });

      console.log('Subscribing to magnetometer...');
      // Subscribe to magnetometer (for orientation/heading)
      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        setSensorData((prev) => ({
          ...prev,
          magnetometer: [
            ...prev.magnetometer,
            {
              x: data.x,
              y: data.y,
              z: data.z,
              timestamp: Date.now(),
            },
          ],
        }));
      });

      console.log('Subscribing to barometer...');
      // Subscribe to barometer (for altitude/elevation changes)
      try {
        barometerSubscription.current = Barometer.addListener((data) => {
          setSensorData((prev) => ({
            ...prev,
            barometer: [
              ...prev.barometer,
              {
                pressure: data.pressure,
                relativeAltitude: data.relativeAltitude,
                timestamp: Date.now(),
              },
            ],
          }));
        });
      } catch (error) {
        console.log('Barometer not available:', error.message);
      }

      console.log('Subscribing to device motion...');
      // Subscribe to device motion (combines accelerometer + gyroscope with filtering)
      deviceMotionSubscription.current = DeviceMotion.addListener((data) => {
        setSensorData((prev) => ({
          ...prev,
          deviceMotion: [
            ...prev.deviceMotion,
            {
              acceleration: data.acceleration,
              accelerationIncludingGravity: data.accelerationIncludingGravity,
              rotation: data.rotation,
              rotationRate: data.rotationRate,
              orientation: data.orientation,
              timestamp: Date.now(),
            },
          ],
        }));
      });

      console.log('Subscribing to pedometer...');
      // Subscribe to pedometer (for step counting)
      try {
        const start = Date.now();
        pedometerSubscription.current = Pedometer.watchStepCount((result) => {
          setPedometerData((prev) => ({
            ...prev,
            steps: result.steps,
          }));
        });
      } catch (error) {
        console.log('Pedometer not available:', error.message);
      }

      // Start timer
      timerInterval.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime % 5 === 0) {
            console.log(`Recording: ${newTime}s`);
          }
          return newTime;
        });
      }, 1000);

      setIsRecording(true);
      console.log('Recording started successfully');
      
      Alert.alert(
        'Recording Started',
        'Walk normally for at least 30 seconds. The app is collecting data from your phone\'s sensors.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to access device sensors: ' + error.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('=== Stopping Recording ===');
    console.log('Accelerometer samples:', sensorData.accelerometer.length);
    console.log('Gyroscope samples:', sensorData.gyroscope.length);
    console.log('Magnetometer samples:', sensorData.magnetometer.length);
    console.log('Barometer samples:', sensorData.barometer.length);
    console.log('DeviceMotion samples:', sensorData.deviceMotion.length);
    console.log('Pedometer steps:', pedometerData.steps);
    
    // Unsubscribe from sensors
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }
    if (gyroscopeSubscription.current) {
      gyroscopeSubscription.current.remove();
      gyroscopeSubscription.current = null;
    }
    if (magnetometerSubscription.current) {
      magnetometerSubscription.current.remove();
      magnetometerSubscription.current = null;
    }
    if (barometerSubscription.current) {
      barometerSubscription.current.remove();
      barometerSubscription.current = null;
    }
    if (deviceMotionSubscription.current) {
      deviceMotionSubscription.current.remove();
      deviceMotionSubscription.current = null;
    }
    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
      pedometerSubscription.current = null;
    }
    
    // Update pedometer end time
    setPedometerData((prev) => ({ ...prev, end: Date.now() }));

    // Stop timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    setIsRecording(false);

    // Check if we have enough data
    if (sensorData.accelerometer.length < 10 || sensorData.gyroscope.length < 10) {
      Alert.alert(
        'Insufficient Data',
        `Only collected ${sensorData.accelerometer.length} samples. Please record for at least 10 seconds.`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setSensorData({ accelerometer: [], gyroscope: [] });
              setRecordingTime(0);
            },
          },
        ]
      );
    } else if (recordingTime < 10) {
      Alert.alert(
        'Recording Too Short',
        'Please record for at least 10 seconds for accurate analysis.',
        [
          {
            text: 'Record Again',
            onPress: () => {
              setSensorData({ accelerometer: [], gyroscope: [] });
              setRecordingTime(0);
            },
          },
          { text: 'Analyze Anyway', onPress: analyzeGait },
        ]
      );
    } else {
      console.log('Data looks good, starting analysis...');
      analyzeGait();
    }
  };

  // Analyze gait data
  const analyzeGait = async () => {
    setIsAnalyzing(true);
    try {
      console.log('=== Starting Gait Analysis ===');
      console.log('Total samples collected:', sensorData.accelerometer.length);
      console.log('Recording duration:', recordingTime, 'seconds');
      
      // Prepare data for backend - match the Python backend format
      const requestData = {
        accelerometer: sensorData.accelerometer,
        gyroscope: sensorData.gyroscope,
        magnetometer: sensorData.magnetometer.length > 0 ? sensorData.magnetometer : undefined,
        barometer: sensorData.barometer.length > 0 ? sensorData.barometer : undefined,
        deviceMotion: sensorData.deviceMotion.length > 0 ? sensorData.deviceMotion : undefined,
        pedometer: pedometerData.steps > 0 ? {
          steps: pedometerData.steps,
          startTime: pedometerData.start,
          endTime: pedometerData.end || Date.now()
        } : undefined,
        session_id: `session_${Date.now()}`,
      };

      console.log('Sending data to backend:', {
        accelerometer_samples: requestData.accelerometer.length,
        gyroscope_samples: requestData.gyroscope.length,
        magnetometer_samples: requestData.magnetometer?.length || 0,
        barometer_samples: requestData.barometer?.length || 0,
        deviceMotion_samples: requestData.deviceMotion?.length || 0,
        pedometer_steps: requestData.pedometer?.steps || 0,
        session_id: requestData.session_id,
      });

      const result = await gaitAnalysisAPI.analyzeGait(requestData);

      console.log('=== Backend Response ===');
      console.log('Full response:', JSON.stringify(result, null, 2));

      // Check if we got valid data back
      if (result && result.success !== false) {
        // Handle different response formats
        const analysisData = result.data || result.analysis || result;
        
        console.log('Analysis data:', analysisData);
        console.log('Exercise plan ID:', analysisData.exercise_plan_id);
        
        setAnalysisResult(analysisData);
        
        const stepCount = analysisData.metrics?.step_count || analysisData.stepCount || 0;
        Alert.alert(
          'Analysis Complete',
          `Found ${stepCount} steps!`,
          [{ text: 'View Results' }]
        );
      } else {
        throw new Error(result.error || 'Analysis returned no data');
      }
    } catch (error) {
      console.error('=== Analysis Error ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors (400) - these are user-facing, not system errors
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        
        // Check if this is a validation error (minimum requirements not met)
        if (errorData.valid === false && errorData.validation) {
          const { duration, steps } = errorData.validation;
          
          let message = errorData.message || 'Gait analysis requirements not met';
          message += '\n\n';
          
          if (!duration.passed) {
            message += `⏱️ Duration: ${duration.value.toFixed(1)}s / ${duration.required}s required\n`;
          }
          if (!steps.passed) {
            message += `👣 Steps: ${steps.value} / ${steps.required} required\n`;
          }
          
          message += '\n' + (errorData.recommendation || 'Please try again with a longer walk.');
          
          setAnalysisResult({
            stepCount: steps.value || 0,
            cadence: 0,
            walkingSpeed: 0,
            symmetryIndex: 0,
            stabilityScore: 0,
            stepLength: 0,
            error: message,
            isValidationError: true,
          });
          
          Alert.alert(
            '⚠️ Analysis Requirements Not Met',
            message,
            [
              { 
                text: 'Try Again', 
                onPress: () => setAnalysisResult(null),
                style: 'default'
              }
            ]
          );
          return;
        }
        
        // Check if user needs to complete exercises first (403)
        if (errorData.allowed === false) {
          const message = errorData.message || 'Please complete today\'s exercises first';
          const details = errorData.exercises_remaining 
            ? `\n\nExercises remaining: ${errorData.exercises_remaining}`
            : '';
          
          setAnalysisResult({
            isValidationError: true,
            is403Error: true,
            error: message + details
          });
          
          return;
        }
      }
      
      // Handle other errors
      setAnalysisResult({
        stepCount: 0,
        cadence: 0,
        walkingSpeed: 0,
        symmetryIndex: 0,
        stabilityScore: 0,
        stepLength: 0,
        error: error.message,
      });
      
      Alert.alert(
        'Analysis Error',
        `Failed to analyze: ${error.message}\n\nPlease try again.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
      }
      if (gyroscopeSubscription.current) {
        gyroscopeSubscription.current.remove();
      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
      if (barometerSubscription.current) {
        barometerSubscription.current.remove();
      }
      if (deviceMotionSubscription.current) {
        deviceMotionSubscription.current.remove();
      }
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gait Analysis</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions Card */}
        {!analysisResult && (
          <View style={styles.instructionsCard}>
            <View style={{alignItems: 'center'}}>
              <Ionicons name="information-circle" size={40} color="#C9302C" />
              <Text style={styles.instructionsTitle}>How to Perform Gait Analysis</Text>
            </View>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Hold your phone in your hand or pocket
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Tap "Start Recording" and begin walking normally
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Walk for at least 30 seconds for best results
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>
                  Tap "Stop Recording" when finished
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recording Section */}
        <View style={styles.recordingSection}>
          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>
              {isRecording ? 'Recording Time' : 'Ready to Record'}
            </Text>
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
            {isRecording && (
              <View>
                <Text style={styles.dataCount}>
                  {sensorData.accelerometer.length} samples collected
                </Text>
              </View>
            )}
          </View>

          {/* Record Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'play'}
                size={60}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.recordButtonLabel}>
            {isRecording ? 'Tap to Stop Recording' : 'Tap to Start Recording'}
          </Text>
        </View>

        {/* Analysis Loading */}
        {isAnalyzing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C9302C" />
            <Text style={styles.loadingText}>Analyzing your gait...</Text>
            <Text style={styles.loadingSubtext}>
              Processing {sensorData.accelerometer.length} sensor readings
            </Text>
          </View>
        )}

        {/* Analysis Results */}
        {analysisResult && !isAnalyzing && (
          <View style={styles.resultsContainer}>
            {/* Show validation error prominently */}
            {analysisResult.isValidationError ? (
              <View style={styles.validationErrorContainer}>
                <Ionicons 
                  name={analysisResult.is403Error ? "lock-closed" : "alert-circle"} 
                  size={60} 
                  color={analysisResult.is403Error ? "#DC2626" : "#FF9800"} 
                />
                <Text style={styles.validationErrorTitle}>
                  {analysisResult.is403Error ? '🔒 Complete Exercises First' : 'Requirements Not Met'}
                </Text>
                <Text style={styles.validationErrorMessage}>
                  {analysisResult.error}
                </Text>
                
                {analysisResult.is403Error && onNavigateToExercisePlan && (
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: '#0066CC', marginBottom: 12 }]}
                    onPress={async () => {
                      try {
                        const response = await exerciseApi.getTodaysPlan();
                        if (response.success && response.plan) {
                          onNavigateToExercisePlan(response.plan._id);
                        } else {
                          Alert.alert('No Plan', 'No exercise plan found.');
                        }
                      } catch (err) {
                        console.error('Error loading plan:', err);
                        Alert.alert('Error', 'Failed to load exercise plan');
                      }
                    }}
                  >
                    <Ionicons name="fitness" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.retryButtonText}>View My Exercises</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setAnalysisResult(null)}
                >
                  <Ionicons name="refresh" size={24} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>{analysisResult.is403Error ? 'Got It' : 'Try Again'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Ionicons name="checkmark-circle" size={40} color="#27AE60" />
                  <Text style={styles.resultsTitle}>Analysis Complete!</Text>
                  <Text style={styles.dataQuality}>
                    Data Quality: {analysisResult.data_quality || 'good'}
                  </Text>
                </View>

                {/* Show error if present */}
                {analysisResult.error && (
                  <View style={styles.errorCard}>
                    <Ionicons name="warning" size={24} color="#FF9800" />
                    <Text style={styles.errorText}>
                      {analysisResult.error}
                    </Text>
                  </View>
                )}

            {/* Metrics Grid - Updated to match backend response */}
            <View style={styles.metricsGrid}>
              {/* Step Count */}
              <View style={styles.metricCardFull}>
                <View style={styles.metricHeader}>
                  <Ionicons name="footsteps" size={24} color="#C9302C" />
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricValue}>
                      {analysisResult.metrics?.step_count || 0}
                    </Text>
                    <Text style={styles.metricLabel}>Steps Detected</Text>
                  </View>
                </View>
                <Text style={styles.metricExplanation}>
                  {analysisResult.metrics?.step_count > 0 
                    ? analysisResult.metrics.step_count < 15
                      ? "Few steps detected. Try walking longer for better analysis."
                      : analysisResult.metrics.step_count < 30
                      ? "Good number of steps for basic analysis."
                      : "Excellent! Enough steps for accurate analysis."
                    : "No steps detected. Make sure to walk while recording."}
                </Text>
              </View>

              {/* Cadence */}
              <View style={styles.metricCard}>
                <Ionicons name="speedometer" size={22} color="#3498DB" />
                <Text style={styles.metricValue}>
                  {analysisResult.metrics?.cadence?.toFixed(1) || '0'}
                </Text>
                <Text style={styles.metricLabel}>Steps/min</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.cadence >= 100 
                    ? "Fast pace"
                    : analysisResult.metrics?.cadence >= 80
                    ? "Normal pace"
                    : analysisResult.metrics?.cadence > 0
                    ? "Slow pace"
                    : "No data"}
                </Text>
              </View>

              {/* Walking Speed */}
              <View style={styles.metricCard}>
                <Ionicons name="walk" size={22} color="#9B59B6" />
                <Text style={styles.metricValue}>
                  {analysisResult.metrics?.velocity?.toFixed(2) || '0'}
                </Text>
                <Text style={styles.metricLabel}>m/s</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.velocity >= 1.2
                    ? "Fast walker"
                    : analysisResult.metrics?.velocity >= 0.8
                    ? "Average speed"
                    : analysisResult.metrics?.velocity > 0
                    ? "Slow walk"
                    : "No movement"}
                </Text>
              </View>

              {/* Gait Symmetry */}
              <View style={styles.metricCard}>
                <Ionicons name="git-compare" size={22} color="#E67E22" />
                <Text style={styles.metricValue}>
                  {((analysisResult.metrics?.gait_symmetry || 0) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.metricLabel}>Symmetry</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.gait_symmetry >= 0.9
                    ? "Excellent!"
                    : analysisResult.metrics?.gait_symmetry >= 0.7
                    ? "Good balance"
                    : analysisResult.metrics?.gait_symmetry > 0
                    ? "Needs attention"
                    : "No data"}
                </Text>
              </View>

              {/* Stability Score */}
              <View style={styles.metricCard}>
                <Ionicons name="shield-checkmark" size={22} color="#27AE60" />
                <Text style={styles.metricValue}>
                  {((analysisResult.metrics?.stability_score || 0) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.metricLabel}>Stability</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.stability_score >= 0.8
                    ? "Very stable"
                    : analysisResult.metrics?.stability_score >= 0.6
                    ? "Moderate"
                    : analysisResult.metrics?.stability_score > 0
                    ? "Unstable"
                    : "No data"}
                </Text>
              </View>

              {/* Stride Length */}
              <View style={styles.metricCard}>
                <Ionicons name="resize" size={22} color="#E74C3C" />
                <Text style={styles.metricValue}>
                  {analysisResult.metrics?.stride_length?.toFixed(2) || '0'}
                </Text>
                <Text style={styles.metricLabel}>Stride (m)</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.stride_length >= 1.2
                    ? "Long strides"
                    : analysisResult.metrics?.stride_length >= 0.8
                    ? "Normal"
                    : analysisResult.metrics?.stride_length > 0
                    ? "Short strides"
                    : "No data"}
                </Text>
              </View>

              {/* Step Regularity */}
              <View style={styles.metricCard}>
                <Ionicons name="pulse" size={22} color="#16A085" />
                <Text style={styles.metricValue}>
                  {((analysisResult.metrics?.step_regularity || 0) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.metricLabel}>Regularity</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.step_regularity >= 0.8
                    ? "Very consistent"
                    : analysisResult.metrics?.step_regularity >= 0.6
                    ? "Fairly regular"
                    : analysisResult.metrics?.step_regularity > 0
                    ? "Irregular"
                    : "No data"}
                </Text>
              </View>

              {/* Vertical Oscillation */}
              <View style={styles.metricCard}>
                <Ionicons name="trending-up" size={22} color="#8E44AD" />
                <Text style={styles.metricValue}>
                  {(analysisResult.metrics?.vertical_oscillation * 100)?.toFixed(1) || '0'}
                </Text>
                <Text style={styles.metricLabel}>Bounce (cm)</Text>
                <Text style={styles.metricSubtext}>
                  {analysisResult.metrics?.vertical_oscillation >= 0.08
                    ? "High bounce"
                    : analysisResult.metrics?.vertical_oscillation >= 0.05
                    ? "Normal"
                    : analysisResult.metrics?.vertical_oscillation > 0
                    ? "Low bounce"
                    : "No data"}
                </Text>
              </View>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📋 Summary</Text>
              <Text style={styles.summaryText}>
                {analysisResult.metrics?.step_count > 0
                  ? `You took ${analysisResult.metrics.step_count} steps in ${analysisResult.analysis_duration?.toFixed(0)}s. ` +
                    `Your walking pattern shows ${
                      analysisResult.metrics.gait_symmetry >= 0.9 ? "excellent" :
                      analysisResult.metrics.gait_symmetry >= 0.7 ? "good" : "fair"
                    } symmetry and ${
                      analysisResult.metrics.stability_score >= 0.8 ? "strong" :
                      analysisResult.metrics.stability_score >= 0.6 ? "moderate" : "low"
                    } stability. ${
                      analysisResult.metrics.step_regularity >= 0.8
                        ? "Your steps are very consistent!"
                        : analysisResult.metrics.step_regularity >= 0.6
                        ? "Your steps show good regularity."
                        : "Try to maintain a more consistent walking rhythm."
                    }`
                  : "No steps were detected during this recording. Make sure to walk normally while recording for at least 30 seconds."}
              </Text>
            </View>

            {/* Detected Problems Section */}
            {analysisResult.detected_problems && analysisResult.detected_problems.length > 0 && (
              <View style={styles.problemsSection}>
                <View style={styles.problemsHeader}>
                  <Text style={styles.problemsTitle}>⚠️ Gait Analysis Findings</Text>
                  <View style={[
                    styles.riskBadge,
                    analysisResult.problem_summary?.risk_level === 'high' && styles.riskHigh,
                    analysisResult.problem_summary?.risk_level === 'moderate' && styles.riskModerate,
                    analysisResult.problem_summary?.risk_level === 'low_moderate' && styles.riskLow
                  ]}>
                    <Text style={styles.riskBadgeText}>
                      {analysisResult.problem_summary?.risk_level === 'high' ? 'High Priority' :
                       analysisResult.problem_summary?.risk_level === 'moderate' ? 'Moderate Priority' :
                       'Low Priority'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.problemsSummary}>
                  {analysisResult.problem_summary?.summary}
                </Text>

                {analysisResult.detected_problems.map((problem, index) => (
                  <View key={index} style={styles.problemCard}>
                    <View style={styles.problemHeader}>
                      <Text style={styles.problemCategory}>{problem.category}</Text>
                      <View style={[
                        styles.severityBadge,
                        problem.severity === 'severe' && styles.severityHigh,
                        problem.severity === 'moderate' && styles.severityModerate,
                        problem.severity === 'mild' && styles.severityMild
                      ]}>
                        <Text style={styles.severityText}>
                          {problem.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.problemDescription}>{problem.description}</Text>
                    
                    <View style={styles.problemMetric}>
                      <Text style={styles.metricLabel}>Your Value:</Text>
                      <Text style={styles.metricValue}>{problem.current_value}</Text>
                      <Text style={styles.metricLabel}>Normal Range:</Text>
                      <Text style={styles.metricNormal}>{problem.normal_range}</Text>
                    </View>

                    {problem.percentile && (
                      <Text style={styles.percentileText}>
                        You are in the {problem.percentile}th percentile
                      </Text>
                    )}

                    <Text style={styles.impactTitle}>Impact:</Text>
                    <Text style={styles.impactText}>{problem.impact}</Text>

                    <Text style={styles.recommendationsTitle}>Recommended Exercises:</Text>
                    {problem.recommendations.slice(0, 3).map((rec, idx) => (
                      <Text key={idx} style={styles.recommendationItem}>• {rec}</Text>
                    ))}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.exercisePlanButton}
                  onPress={() => {
                    if (onNavigateToExercisePlan && analysisResult?.exercise_plan_id) {
                      onNavigateToExercisePlan(analysisResult.exercise_plan_id);
                    } else if (onNavigateToExercisePlan) {
                      Alert.alert(
                        'No Exercise Plan',
                        'Exercise recommendations are being generated. Please try again in a moment.',
                        [{ text: 'OK' }]
                      );
                    } else {
                      Alert.alert(
                        'Exercise Plan',
                        'Exercise recommendations will be available soon!',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Ionicons name="fitness" size={20} color="#FFFFFF" />
                  <Text style={styles.exercisePlanButtonText}>View Exercise Plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* No Problems Detected */}
            {analysisResult.detected_problems && analysisResult.detected_problems.length === 0 && (
              <View style={styles.noProblemCard}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.noProblemsTitle}>Great Job!</Text>
                <Text style={styles.noProblemsText}>
                  Your gait parameters are within normal ranges. Keep up the good work and maintain regular physical activity!
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSensorData({ accelerometer: [], gyroscope: [] });
                  setAnalysisResult(null);
                  setRecordingTime(0);
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>New Analysis</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  // TODO: Save results to database
                  Alert.alert('Success', 'Results saved to your history!');
                }}
              >
                <Ionicons name="save" size={20} color="#C9302C" />
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Save Results
                </Text>
              </TouchableOpacity>
            </View>
            </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#C9302C',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },

  // Instructions Card
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#C9302C',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  stepsList: {
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    paddingTop: 6,
  },

  // Recording Section
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  timerLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#C9302C',
    fontVariant: ['tabular-nums'],
  },
  dataCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '500',
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordButtonLabel: {
    marginTop: 24,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },

  // Results
  resultsContainer: {
    margin: 16,
  },
  resultsHeader: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 10,
  },
  dataQuality: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricCardFull: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricInfo: {
    marginLeft: 12,
    flex: 1,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  metricSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  metricExplanation: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    textAlign: 'justify',
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C9302C',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C9302C',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'justify',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#C9302C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C9302C',
    elevation: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#C9302C',
  },
  
  // Debug and Error Cards
  errorCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  errorText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    flex: 1,
  },
  debugCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Problems Section
  problemsSection: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  problemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  problemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
  },
  riskHigh: {
    backgroundColor: '#FFEBEE',
  },
  riskModerate: {
    backgroundColor: '#FFF3E0',
  },
  riskLow: {
    backgroundColor: '#E8F5E9',
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E65100',
  },
  problemsSummary: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  problemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  problemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  problemCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityHigh: {
    backgroundColor: '#FEE2E2',
  },
  severityModerate: {
    backgroundColor: '#FED7AA',
  },
  severityMild: {
    backgroundColor: '#D1FAE5',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  problemDescription: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 10,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'justify',
  },
  problemMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricNormal: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  percentileText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  impactText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'justify',
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9302C',
    marginTop: 8,
    marginBottom: 6,
  },
  recommendationItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 6,
  },
  exercisePlanButton: {
    flexDirection: 'row',
    backgroundColor: '#C9302C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    elevation: 3,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  exercisePlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noProblemCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  noProblemsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
    marginTop: 12,
    marginBottom: 8,
  },
  noProblemsText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Validation Error Styles
  validationErrorContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  validationErrorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E65100',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  validationErrorMessage: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GaitAnalysisScreen;
