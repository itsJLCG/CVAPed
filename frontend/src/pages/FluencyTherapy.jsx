import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import axios from 'axios';
import { fluencyExerciseService } from '../services/api';
import './FluencyTherapy.css';

const API_URL = 'http://localhost:5000/api';

function FluencyTherapy({ onLogout }) {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState(''); // '', 'inhale', 'hold', 'exhale', 'ready'
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [showSpeakingIndicator, setShowSpeakingIndicator] = useState(false);
  const [hasCompletedBreathing, setHasCompletedBreathing] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [fluencyExercises, setFluencyExercises] = useState({});
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const breathingTimerRef = useRef(null);
  const speechTimeoutRef = useRef(null);

  // Load active exercises from database
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoadingExercises(true);
      try {
        const response = await fluencyExerciseService.getActive();
        console.log('Fluency exercises API response:', response);
        if (response && response.success && response.exercises_by_level) {
          // Backend returns exercises_by_level, not exercises
          setFluencyExercises(response.exercises_by_level);
          console.log('Loaded exercises:', response.exercises_by_level);
        } else {
          console.warn('No exercises in response, keeping empty object');
          setFluencyExercises({});
        }
      } catch (error) {
        console.error('Failed to load fluency exercises:', error);
        // Keep empty object as fallback
        setFluencyExercises({});
      } finally {
        setIsLoadingExercises(false);
      }
    };
    loadExercises();
  }, []);

  // Calculate current exercise data - safely handle empty fluencyExercises
  const currentExercises = fluencyExercises[currentLevel]?.exercises || [];
  const currentExercise = currentExercises[currentExerciseIndex] || null;
  const levelData = fluencyExercises[currentLevel] || null;

  // Load progress on mount - resume where user left off
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await axios.get(`${API_URL}/fluency/progress`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success && response.data.has_progress) {
          // Check if all levels completed
          const allLevelsComplete = response.data.current_level > 5;
          if (allLevelsComplete) {
            // User completed all exercises
            setIsLoadingProgress(false);
            alert('🎉 Congratulations! You have completed all Fluency Therapy exercises!');
            navigate('/speech-therapy');
            return;
          }
          
          // Set progress - resume where user left off
          setCurrentLevel(response.data.current_level);
          setCurrentExerciseIndex(response.data.current_exercise);
        }
      } catch (error) {
        console.error('Error loading fluency progress:', error);
        // On error, just start from beginning - don't block the UI
      } finally {
        // Always stop loading, even if there's an error
        setIsLoadingProgress(false);
      }
    };
    
    loadProgress();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathingTimerRef.current) clearInterval(breathingTimerRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Reset states when exercise changes
  useEffect(() => {
    if (currentExercise && !showResults) {
      setHasPlayedAudio(false);
      setHasCompletedBreathing(false);
      setBreathingPhase('');
      setBreathingTimer(0);
    }
  }, [currentExercise, showResults]);

  // Reset when exercise loads - user will click Start button to begin
  useEffect(() => {
    if (currentExercise && !showResults) {
      setHasPlayedAudio(false);
    }
  }, [currentExercise, showResults]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Text-to-Speech function
  const speakText = (text, repeatCount = 1) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        let currentRepeat = 0;
        
        const speakOnce = () => {
          if (currentRepeat >= repeatCount) {
            setIsSpeaking(false);
            resolve();
            return;
          }
          
          setIsSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.85;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onend = () => {
            currentRepeat++;
            if (currentRepeat < repeatCount) {
              speechTimeoutRef.current = setTimeout(speakOnce, 800);
            } else {
              setIsSpeaking(false);
              resolve();
            }
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            resolve();
          };
          
          window.speechSynthesis.speak(utterance);
        };
        
        speakOnce();
      } else {
        resolve();
      }
    });
  };

  const speakInstruction = (text) => {
    speakText(text, 1);
  };

  const startExercise = () => {
    setHasPlayedAudio(true);
    if (currentExercise.breathing) {
      startBreathing();
    } else {
      startRecording();
    }
  };

  const startBreathing = async () => {
    setIsBreathing(true);
    setHasCompletedBreathing(false);
    
    // Phase 1: Inhale (3 seconds)
    setBreathingPhase('inhale');
    setBreathingTimer(3);
    await speakText('Breathe in slowly through your nose', 1);
    
    for (let i = 3; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 2: Hold (2 seconds)
    setBreathingPhase('hold');
    setBreathingTimer(2);
    await speakText('Hold', 1);
    
    for (let i = 2; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 3: Exhale (4 seconds)
    setBreathingPhase('exhale');
    setBreathingTimer(4);
    await speakText('Now breathe out slowly through your mouth', 1);
    
    for (let i = 4; i > 0; i--) {
      setBreathingTimer(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Phase 4: Ready (1 second)
    setBreathingPhase('ready');
    setBreathingTimer(1);
    await speakText('Get ready to speak', 1);
    
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        await processRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= currentExercise.expectedDuration) {
            stopRecording();
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const convertToWav = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Resample to 16kHz if needed (same as language therapy)
    const targetSampleRate = 16000;
    let wavBuffer;
    
    if (audioBuffer.sampleRate !== targetSampleRate) {
      // Create offline context for resampling
      const offlineContext = new OfflineAudioContext(
        1, // mono
        audioBuffer.duration * targetSampleRate,
        targetSampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);
      
      wavBuffer = await offlineContext.startRendering();
    } else {
      wavBuffer = audioBuffer;
    }
    
    // Create WAV file
    const wavBlob = await audioBufferToWav(wavBuffer);
    await audioContext.close();
    
    return wavBlob;
  };

  // Convert AudioBuffer to WAV Blob (same as language therapy)
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = new Float32Array(buffer.length);
    buffer.copyFromChannel(data, 0);
    
    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const processRecording = async (blob) => {
    try {
      setIsProcessing(true);
      
      // Convert to WAV format
      const wavBlob = await convertToWav(blob);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');
      formData.append('target_text', currentExercise.target);
      formData.append('expected_duration', currentExercise.expectedDuration);
      formData.append('exercise_type', currentExercise.type);
      
      // Send to backend
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/fluency/assess`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const result = {
          exercise: currentExercise.id,
          target: currentExercise.target,
          transcription: response.data.transcription,
          duration: response.data.duration,
          expectedDuration: currentExercise.expectedDuration,
          speakingRate: response.data.speaking_rate,
          fluencyScore: response.data.fluency_score,
          pauseCount: response.data.pause_count,
          disfluencies: response.data.disfluencies,
          passed: response.data.fluency_score >= 70
        };

        setResults(result);
        setShowResults(true);
        
        // Don't auto-speak results - let user control
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      alert('Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = async () => {
    setAllResults([...allResults, results]);
    
    // Save progress to backend
    if (results) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/fluency/progress`, {
          level: currentLevel,
          exercise_index: currentExerciseIndex,
          exercise_id: currentExercise.id,
          speaking_rate: results.speakingRate,
          fluency_score: results.fluencyScore,
          pause_count: results.pauseCount,
          disfluencies: results.disfluencies,
          passed: results.passed
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
    
    if (currentExerciseIndex < currentExercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetExercise();
    } else {
      // Level complete
      if (currentLevel < 5) {
        setCurrentLevel(currentLevel + 1);
        setCurrentExerciseIndex(0);
        resetExercise();
      } else {
        // All levels complete
        showFinalResults();
      }
    }
  };

  const resetExercise = () => {
    setShowResults(false);
    setResults(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setHasCompletedBreathing(false); // Reset breathing state
    setIsBreathing(false);
    setBreathingCount(0);
    setBreathingPhase('');
    setBreathingTimer(0);
    setHasPlayedAudio(false); // Reset audio play state
    setShowSpeakingIndicator(false); // Reset speaking indicator
    setIsRecording(false); // Reset recording state
  };

  const showFinalResults = () => {
    // TODO: Show final assessment results
    alert('Congratulations! You completed all fluency exercises!');
    navigate('/speech-therapy');
  };

  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  // Show loading only while fetching progress or exercises
  if (isLoadingProgress || isLoadingExercises) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{isLoadingExercises ? 'Loading exercises...' : 'Loading your progress...'}</p>
      </div>
    );
  }

  if (!currentExercise || !levelData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>No exercises available. Please contact your therapist.</p>
      </div>
    );
  }

  return (
    <div className="fluency-therapy-page">
      {/* Speaking Indicator */}
      {showSpeakingIndicator && (
        <div className="speaking-indicator">
          <div className="speaking-waves">
            <span className="wave"></span>
            <span className="wave"></span>
            <span className="wave"></span>
          </div>
          <span className="speaking-text">🔊 Audio Playing...</span>
        </div>
      )}

      {/* Header */}
      <header className="fluency-header">
        <div className="fluency-header-container">
          <div className="fluency-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="fluency-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="fluency-header-text" />
          </div>
          <div className="fluency-title-section">
            <h1 className="fluency-exercise-title">Fluency Therapy Assessment</h1>
            <div className="fluency-breadcrumb">
              Level {currentLevel}: {levelData.name} • Exercise {currentExerciseIndex + 1} of {currentExercises.length}
            </div>
          </div>
          <div className="fluency-nav">
            <button onClick={() => navigate('/speech-therapy')} className="fluency-nav-btn">
              ← Back
            </button>
            <button onClick={() => navigate('/profile')} className="fluency-nav-btn profile">
              My Profile
            </button>
            <button onClick={handleLogout} className="fluency-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="fluency-main">
        <div className="fluency-container">
          <div className="fluency-exercise-card">
            {/* Progress Indicator */}
            <div className="exercise-progress">
              <div className="progress-header">
                <span className="progress-label">Level Progress</span>
                <span className="progress-count">{currentExerciseIndex + 1} / {currentExercises.length}</span>
              </div>
              <div className="progress-dots">
                {currentExercises.map((_, index) => (
                  <div 
                    key={index}
                    className={`progress-dot ${index < currentExerciseIndex ? 'completed' : ''} ${index === currentExerciseIndex ? 'current' : ''} ${index > currentExerciseIndex ? 'locked' : ''}`}
                    style={{
                      backgroundColor: index < currentExerciseIndex ? levelData.color : (index === currentExerciseIndex ? '#fff' : '#e5e7eb'),
                      borderColor: index === currentExerciseIndex ? levelData.color : (index < currentExerciseIndex ? levelData.color : '#e5e7eb')
                    }}
                  >
                    {index < currentExerciseIndex && <span className="dot-check">✓</span>}
                    {index > currentExerciseIndex && <span className="dot-lock">🔒</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Instruction Section */}
            <div className="instruction-section">
              {/* Important Notice */}
              <div className="fluency-notice">
                <div className="notice-header">
                  <span className="notice-icon">⚡</span>
                  <strong>Important: This Tests FLUENCY, Not Word Accuracy!</strong>
                </div>
                <p className="notice-text">
                  Don't just read the target text - use it as a starting point and keep talking! 
                  The system measures your <strong>speaking flow</strong> (120-150 words per minute). 
                  Longer, natural speech = Higher scores! 🎯
                </p>
              </div>

              <h2 className="instruction-title">Instructions</h2>
              <p className="instruction-text">{currentExercise.instruction}</p>
            </div>

            {/* Target Text */}
            <div className="target-section" style={{ borderLeftColor: levelData.color }}>
              <div className="target-label" style={{ color: levelData.color }}>
                {currentExercise.type === 'spontaneous' ? 'Question:' : 'Say This:'}
              </div>
              <div className="target-text">"{currentExercise.target}"</div>
              <div className="target-hint">Expected duration: ~{currentExercise.expectedDuration} seconds</div>
            </div>

            {/* Automatic Flow Status */}
            {!showResults && !isProcessing && (
              <div className="flow-status">
                {/* Step 1: Listening to Instructions */}
                {showSpeakingIndicator && (
                  <div className="status-card active">
                    <div className="status-icon">🔊</div>
                    <div className="status-content">
                      <h3>Step 1: Listen to Instructions</h3>
                      <p>Please listen carefully to the instructions...</p>
                    </div>
                  </div>
                )}

                {/* Step 2: Breathing Exercise */}
                {isBreathing && (
                  <div className="status-card active breathing">
                    <div className="status-icon">🌬️</div>
                    <div className="status-content">
                      <h3>Step 2: Breathing Exercise</h3>
                      <p className="breathing-phase-text">
                        {breathingPhase === 'inhale' && 'Breathe in slowly through your nose...'}
                        {breathingPhase === 'hold' && 'Hold your breath...'}
                        {breathingPhase === 'exhale' && 'Breathe out slowly through your mouth...'}
                        {breathingPhase === 'ready' && 'Get ready to speak!'}
                      </p>
                      <div className="breathing-visual">
                        <div className={`breathing-circle ${breathingPhase}`}></div>
                        <div className="breathing-timer-display">{breathingTimer}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Recording */}
                {isRecording && (
                  <div className="status-card active recording">
                    <div className="status-icon">🎤</div>
                    <div className="status-content">
                      <h3>Step 3: Recording - Speak Now!</h3>
                      <p>Say the text clearly at a comfortable pace</p>
                      <div className="recording-active">
                        <div className="recording-indicator">
                          <span className="recording-dot"></span>
                          Recording... {recordingTime.toFixed(1)}s
                        </div>
                        <button 
                          onClick={stopRecording}
                          className="stop-btn"
                        >
                          ⏹️ Stop Recording
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting state - Ready to Start */}
                {!showSpeakingIndicator && !isBreathing && !isRecording && !hasPlayedAudio && (
                  <div className="status-card waiting">
                    <div className="status-icon">📋</div>
                    <div className="status-content">
                      <h3>Ready to Begin Exercise</h3>
                      <p>This exercise has 2 simple steps:</p>
                      <ol className="steps-list">
                        <li>🌬️ <strong>Breathing exercise</strong> - Follow the guided breathing (10 seconds with voice instructions)</li>
                        <li>🎤 <strong>Recording</strong> - Automatically starts after breathing. Speak the text clearly!</li>
                      </ol>
                      <p className="status-note">✨ Everything happens automatically - just click Start!</p>
                      <button 
                        onClick={startExercise}
                        className="start-exercise-btn"
                        style={{ backgroundColor: levelData.color }}
                      >
                        🚀 Start Exercise
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Section */}
            {showResults && results && (
              <div className="results-section">
                <h3 className="results-title" style={{ color: results.passed ? '#10b981' : '#f59e0b' }}>
                  {results.passed ? '✓ Great Job!' : '⚠ Keep Practicing'}
                </h3>
                
                <div className="results-grid">
                  <div className="result-item">
                    <div className="result-label">Speaking Rate</div>
                    <div className="result-value" style={{ color: levelData.color }}>
                      {results.speakingRate} WPM
                    </div>
                    <div className="result-hint">Target: 100-140 WPM</div>
                  </div>
                  
                  <div className="result-item">
                    <div className="result-label">Fluency Score</div>
                    <div className="result-value" style={{ color: results.passed ? '#10b981' : '#f59e0b' }}>
                      {results.fluencyScore}%
                    </div>
                    <div className="result-hint">Minimum: 70%</div>
                  </div>
                  
                  <div className="result-item">
                    <div className="result-label">Duration</div>
                    <div className="result-value" style={{ color: levelData.color }}>
                      {results.duration}s
                    </div>
                    <div className="result-hint">Expected: ~{results.expectedDuration}s</div>
                  </div>
                  
                  <div className="result-item">
                    <div className="result-label">Pauses</div>
                    <div className="result-value" style={{ color: levelData.color }}>
                      {results.pauseCount}
                    </div>
                    <div className="result-hint">{results.pauseCount <= 2 ? 'Good!' : 'Try fewer pauses'}</div>
                  </div>
                </div>

                <div className="results-actions">
                  <button onClick={playRecording} className="play-btn">
                    ▶️ Play Recording
                  </button>
                  <button 
                    onClick={handleNext}
                    className="next-btn"
                    style={{ backgroundColor: levelData.color }}
                  >
                    Next Exercise →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default FluencyTherapy;
