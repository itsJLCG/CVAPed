import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import { useVoiceSettings } from '../components/VoiceSettingsContext';
import WaveSurfer from 'wavesurfer.js';
import { articulationService, articulationExerciseService } from '../services/api';
import audioManager from '../services/audioManager';
import './ArticulationExercise.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Exercise data will be loaded from database
// Keeping this for metadata only (colors, names, etc.)
const soundMetadata = {
  s: { name: 'S Sound', color: '#ce3630' },
  r: { name: 'R Sound', color: '#479ac3' },
  l: { name: 'L Sound', color: '#e8b04e' },
  k: { name: 'K Sound', color: '#8e44ad' },
  th: { name: 'TH Sound', color: '#27ae60' }
};

function ArticulationExercise({ onLogout, onFacilityExit }) {
  const { soundId } = useParams();
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const { voiceSpeed, setVoiceSpeed } = useVoiceSettings();
  
  // Ensure the category is set to 'speech' when this page is loaded
  useEffect(() => {
    selectCategory('speech');
  }, [selectCategory]);

  // Stop all speech synthesis when this component unmounts (e.g. on logout)
  useEffect(() => {
    // Register with audioManager so Header logout can cancel speech immediately,
    // before React unmounts this component
    const unregister = audioManager.registerAbortCallback('ArticulationExercise', () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    });
    return () => {
      unregister();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentItem, setCurrentItem] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [trialScores, setTrialScores] = useState([]);
  const [trialDetails, setTrialDetails] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [averageScore, setAverageScore] = useState(null);
  const [levelProgress, setLevelProgress] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [exercises, setExercises] = useState(null); // Database exercises
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [showRecordButton, setShowRecordButton] = useState(false); // Show record button after model audio
  const [showTrialResult, setShowTrialResult] = useState(false); // Show trial result after recording
  const [currentTrialResult, setCurrentTrialResult] = useState(null); // Current trial's result data
  const [showFinalAssessment, setShowFinalAssessment] = useState(false); // Show final assessment after trial 3
  const [assessmentTab, setAssessmentTab] = useState('average'); // 'average' or 'trials'
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const waveformRef = useRef(null);
  const waveSurferRef = useRef(null);

  // Get sound metadata and exercise data
  const soundData = soundMetadata[soundId];
  const currentLevelData = exercises?.levels?.[currentLevel];
  const currentTarget = currentLevelData?.items?.[currentItem];
  const totalItems = currentLevelData?.items?.length || 3;
  const maxTrials = 3;
  const passThreshold = 0.50;

  // Load exercises from database
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const response = await articulationExerciseService.getActive(soundId);
        if (response.success && response.exercises_by_level) {
          // Transform database response to match current code structure
          const transformedData = {
            name: soundData.name,
            color: soundData.color,
            levels: {}
          };

          // Convert exercises_by_level to the expected format
          Object.keys(response.exercises_by_level).forEach(levelKey => {
            const levelNum = parseInt(levelKey);
            const levelData = response.exercises_by_level[levelKey];
            
            transformedData.levels[levelNum] = {
              name: levelData.level_name,
              items: levelData.exercises
                .sort((a, b) => a.order - b.order) // Sort by order field
                .map(ex => ex.target) // Extract target strings
            };
          });

          setExercises(transformedData);
        }
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setIsLoadingExercises(false);
      }
    };

    loadExercises();
  }, [soundId]);

  // Load progress when component mounts
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progressData = await articulationService.getProgress(soundId);
        
        if (progressData.success && progressData.has_progress) {
          console.log('Loaded progress:', progressData);
          
          // Set current level and item from saved progress
          setCurrentLevel(progressData.current_level);
          setCurrentItem(progressData.current_item);
          
          // Update level progress
          const newLevelProgress = { 1: false, 2: false, 3: false, 4: false, 5: false };
          Object.keys(progressData.levels || {}).forEach(levelKey => {
            const levelNum = parseInt(levelKey);
            newLevelProgress[levelNum] = progressData.levels[levelKey].is_complete || false;
          });
          setLevelProgress(newLevelProgress);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [soundId]);

  useEffect(() => {
    if (waveformRef.current && !waveSurferRef.current && soundData) {
      waveSurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: soundData.color,
        progressColor: '#555',
        cursorColor: '#333',
        height: 60,
        barWidth: 2,
        responsive: true
      });
    }

    return () => {
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
      }
    };
  }, [soundData]);

  const startRecording = async () => {
    if (isRecording || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Check if audio was actually recorded
        if (audioBlob.size === 0 || audioChunksRef.current.length === 0) {
          console.error('No audio data recorded');
          alert('Recording failed - no audio captured. Please try again.');
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setRecordedBlob(audioBlob);
        
        if (waveSurferRef.current) {
          try {
            const url = URL.createObjectURL(audioBlob);
            await waveSurferRef.current.load(url);
          } catch (err) {
            console.log('Waveform display error:', err);
          }
        }

        await processRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto-stop after 10 seconds (longer time for phrases/sentences)
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 10000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob) => {
    setIsProcessing(true);

    try {
      // Double check audio blob is valid
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio recording');
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('patient_id', user.id || 'test-patient');
      formData.append('sound_id', soundId);
      formData.append('level', currentLevel);
      formData.append('item_index', currentItem);
      formData.append('target', currentTarget);
      formData.append('trial', currentTrial);

      const response = await fetch(`${API_URL}/articulation/record`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process recording');
      }

      const data = await response.json();
      
      const score = data.scores?.computed_score || 0;
      
      const details = {
        trial: currentTrial,
        computed_score: score,
        pronunciation_score: data.scores?.pronunciation_score || 0,
        accuracy_score: data.scores?.accuracy_score || 0,
        completeness_score: data.scores?.completeness_score || 0,
        fluency_score: data.scores?.fluency_score || 0,
        transcription: data.transcription || '',
        feedback: data.feedback || '',
        azure_details: data.azure_details || {},
        words: data.words || [],
        phonemes: data.phonemes || []
      };
      
      const newTrialScores = [...trialScores, score];
      const newTrialDetails = [...trialDetails, details];
      
      setTrialScores(newTrialScores);
      setTrialDetails(newTrialDetails);
      
      // Show current trial result immediately
      setCurrentTrialResult(details);
      setShowTrialResult(true);

      if (newTrialScores.length >= maxTrials) {
        const avg = newTrialScores.reduce((a, b) => a + b, 0) / newTrialScores.length;
        setAverageScore(avg);
      }

    } catch (error) {
      console.error('Error processing recording:', error);
      alert('Failed to process recording. Using mock score for now.');
      
      const mockScore = 0.85 + Math.random() * 0.15;
      const newTrialScores = [...trialScores, mockScore];
      setTrialScores(newTrialScores);

      if (newTrialScores.length >= maxTrials) {
        const avg = newTrialScores.reduce((a, b) => a + b, 0) / newTrialScores.length;
        setAverageScore(avg);
      }
    }

    setIsProcessing(false);
  };

  // Phonetic pronunciation map - only for TH sound which needs special handling
  const phoneticMap = {
    // TH sound - prevent "tee aitch" pronunciation
    'th': 'thuh',
    
    // Syllables - clear pronunciation
    'sa': 'sah',
    'se': 'seh',
    'si': 'see',
    
    'ra': 'rah',
    're': 'reh',
    'ri': 'ree',
    
    'la': 'lah',
    'le': 'leh',
    'li': 'lee',
    
    'ka': 'kah',
    'ke': 'keh',
    'ki': 'kee',
    
    'tha': 'thah',
    'the': 'thuh',
    'thi': 'thee'
  };

  const playModelAudio = () => {
    if ('speechSynthesis' in window) {
      // Always cancel any in-progress speech before starting a new utterance.
      // No isCancelledRef needed here — playModelAudio is a one-shot synchronous
      // speak() call, not an async chain, so cancel() alone is sufficient.
      window.speechSynthesis.cancel();

      // Get phonetic representation if it exists, otherwise use original
      const textToSpeak = phoneticMap[currentTarget.toLowerCase()] || currentTarget;
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // For isolated sounds (level 1), use slower rate and emphasize the sound
      // Multiply base rate by user-selected voice speed
      if (currentLevel === 1) {
        utterance.rate = 0.6 * voiceSpeed;
        utterance.pitch = 1.1;
      } else if (currentLevel === 2) {
        utterance.rate = 0.7 * voiceSpeed;
        utterance.pitch = 1.0;
      } else {
        utterance.rate = 0.85 * voiceSpeed;
        utterance.pitch = 1.0;
      }
      
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Zira') || 
        voice.name.includes('Google US English') ||
        voice.name.includes('Microsoft') ||
        voice.lang === 'en-US'
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Show record button after audio completes
      utterance.onend = () => {
        setShowRecordButton(true);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Please say: "${currentTarget}"`);
    }
  };

  const saveProgressToServer = async (completed = false) => {
    try {
      const progressPayload = {
        sound_id: soundId,
        level: currentLevel,
        item_index: currentItem,
        completed: completed,
        average_score: averageScore,
        trial_details: trialDetails.map(d => ({
          trial: d.trial,
          computed_score: d.computed_score,
          pronunciation_score: d.pronunciation_score,
          accuracy_score: d.accuracy_score,
          completeness_score: d.completeness_score,
          fluency_score: d.fluency_score,
          transcription: d.transcription
        }))
      };
      await articulationService.saveProgress(progressPayload);
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNextItem = async () => {
    // Save progress for current item before moving
    await saveProgressToServer(averageScore >= passThreshold);

    if (currentItem < totalItems - 1) {
      setCurrentItem(currentItem + 1);
      resetTrials();
      setShowRecordButton(false); // Reset record button - user must play model audio first
    } else if (averageScore >= passThreshold) {
      if (currentLevel < 5) {
        setCurrentLevel(currentLevel + 1);
        setCurrentItem(0);
        setLevelProgress({ ...levelProgress, [currentLevel]: true });
        resetTrials();
        setShowRecordButton(false); // Reset record button - user must play model audio first
        alert(`Level ${currentLevel} Complete! Moving to Level ${currentLevel + 1}: ${exercises.levels[currentLevel + 1].name}`);
      } else {
        alert('Congratulations! You completed all levels for this sound!');
        navigate('/articulation');
      }
    }
  };

  const handleNextTrial = () => {
    if (currentTrial < maxTrials) {
      // Move to next trial
      setCurrentTrial(currentTrial + 1);
      setShowTrialResult(false);
      setCurrentTrialResult(null);
      setShowRecordButton(true); // For trials 2 and 3, show record button immediately
      setRecordedBlob(null);
      if (waveSurferRef.current) {
        waveSurferRef.current.empty();
      }
    }
  };

  const handleShowAssessment = () => {
    setShowTrialResult(false);
    setShowFinalAssessment(true);
  };

  const resetTrials = () => {
    setCurrentTrial(1);
    setTrialScores([]);
    setTrialDetails([]);
    setAverageScore(null);
    setRecordedBlob(null);
    setShowTrialResult(false);
    setCurrentTrialResult(null);
    setShowRecordButton(false);
    setShowFinalAssessment(false);
    setAssessmentTab('average');
    if (waveSurferRef.current) {
      waveSurferRef.current.empty();
    }
  };

  const handleRetry = () => {
    if (currentTrial < maxTrials) {
      setCurrentTrial(currentTrial + 1);
      setRecordedBlob(null);
      if (waveSurferRef.current) {
        waveSurferRef.current.empty();
      }
    }
  };

  const canProceed = averageScore !== null && averageScore >= passThreshold;
  const needsMoreTrials = trialScores.length < maxTrials;
  const failedItem = averageScore !== null && averageScore < passThreshold;

  if (!soundData) {
    return <div>Sound not found</div>;
  }

  if (isLoadingProgress || isLoadingExercises) {
    return (
      <div className="articulation-exercise-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '1.5rem', color: '#2c3e50' }}>
            {isLoadingExercises ? 'Loading exercises...' : 'Loading your progress...'}
          </div>
          <div style={{ fontSize: '1rem', color: '#6b7280' }}>Please wait</div>
        </div>
      </div>
    );
  }

  if (!exercises || !exercises.levels || Object.keys(exercises.levels).length === 0) {
    return (
      <div className="articulation-exercise-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '1.5rem', color: '#2c3e50' }}>No exercises available</div>
          <div style={{ fontSize: '1rem', color: '#6b7280' }}>
            Please contact your therapist to add exercises for this sound.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="articulation-exercise-page">
      {/* Header */}
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />

      {/* Main Content */}
      <main className="exercise-main">
        <div className="exercise-container">
          {/* Compact Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-levels">
              {[1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={`progress-level ${level === currentLevel ? 'active' : ''} ${level < currentLevel ? 'completed' : ''} ${level > currentLevel ? 'locked' : ''}`}
                  style={{
                    borderColor: level <= currentLevel ? soundData.color : '#e5e7eb',
                    backgroundColor: level < currentLevel ? soundData.color : level === currentLevel ? 'white' : '#f9fafb',
                    color: level < currentLevel ? 'white' : level === currentLevel ? soundData.color : '#9ca3af'
                  }}
                >
                  <span className="level-num">{level}</span>
                  <span className="level-name">{exercises.levels[level]?.name || `Level ${level}`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Card - Centered Layout */}
          <div className="exercise-card">
            {/* Show Target & Recording sections only when NOT showing trial result and NOT showing final assessment */}
            {!showTrialResult && !showFinalAssessment && (
              <>
                {/* Centered Target Stimulus - Always Visible */}
                <div className={`centered-target-section ${showRecordButton ? 'compact' : ''}`}>
                  <label className="section-label">Target Stimulus</label>
                  <div className="target-text" style={{ color: soundData.color }}>
                    "{currentTarget}"
                  </div>
                  <button className="model-btn" onClick={playModelAudio}>
                    <span className="btn-icon">▶</span> Play Model Audio
                  </button>
                  <div className="voice-speed-control">
                    <span className="voice-speed-label">🔊 Voice Speed</span>
                    <div className="voice-speed-slider-row">
                      <span className="speed-tag">Slow</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="voice-speed-slider"
                        style={{ accentColor: soundData.color }}
                      />
                      <span className="speed-tag">Fast</span>
                    </div>
                    <span className="voice-speed-value">{voiceSpeed === 1.0 ? 'Normal' : voiceSpeed < 1.0 ? `${voiceSpeed}x (Slower)` : `${voiceSpeed}x (Faster)`}</span>
                  </div>
                </div>

                {/* Recording Section - Shows after audio play */}
                {showRecordButton && (
                  <div className="centered-recording-section">
                <div className="recording-box-centered">
                  <div className="recording-header">
                    <label className="section-label">Recording - Trial {currentTrial}/{maxTrials}</label>
                  </div>
                  
                  <div className="waveform-container" ref={waveformRef}></div>

                  <div className="recording-controls">
                    {!isRecording && !isProcessing && (
                      <button
                        className="record-btn centered-record"
                        onClick={startRecording}
                        style={{ backgroundColor: soundData.color }}
                      >
                        <span className="btn-icon">●</span> Record Response
                      </button>
                    )}

                    {isRecording && (
                      <button
                        className="record-btn recording"
                        onClick={stopRecording}
                      >
                        <span className="btn-icon">■</span> Stop Recording
                      </button>
                    )}

                    {isProcessing && (
                      <div className="processing-indicator">
                        <div className="spinner"></div>
                        <span>Processing assessment...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
              </>
            )}

            {/* Show Trial Result after recording (for all trials including trial 3) */}
            {showTrialResult && currentTrialResult && !showFinalAssessment && (
              <div className="trial-result-display">
                <h3 className="trial-result-title">Trial {currentTrialResult.trial} Result</h3>
                
                <div className="trial-result-card active-trial">
                  <div className="trial-card-header">
                    <span className="trial-badge">Trial {currentTrialResult.trial}</span>
                    <span className="trial-overall-score" style={{ 
                      color: currentTrialResult.computed_score >= passThreshold ? '#27ae60' : '#e67e22' 
                    }}>
                      {(currentTrialResult.computed_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="trial-transcription">
                    <span className="transcription-label">You said:</span>
                    <span className="transcription-value">"{currentTrialResult.transcription}"</span>
                  </div>

                  <div className="trial-metrics-detailed">
                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-icon" style={{ backgroundColor: '#3b82f6' }}>🗣️</span>
                        <span className="metric-name">Pronunciation</span>
                      </div>
                      <div className="metric-bar-wrapper">
                        <div className="metric-progress-bg">
                          <div 
                            className="metric-progress-fill" 
                            style={{ 
                              width: `${currentTrialResult.pronunciation_score * 100}%`,
                              backgroundColor: '#3b82f6'
                            }}
                          ></div>
                        </div>
                        <span className="metric-percent">{(currentTrialResult.pronunciation_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-icon" style={{ backgroundColor: '#8b5cf6' }}>🎯</span>
                        <span className="metric-name">Accuracy</span>
                      </div>
                      <div className="metric-bar-wrapper">
                        <div className="metric-progress-bg">
                          <div 
                            className="metric-progress-fill" 
                            style={{ 
                              width: `${currentTrialResult.accuracy_score * 100}%`,
                              backgroundColor: '#8b5cf6'
                            }}
                          ></div>
                        </div>
                        <span className="metric-percent">{(currentTrialResult.accuracy_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-icon" style={{ backgroundColor: '#10b981' }}>✓</span>
                        <span className="metric-name">Completeness</span>
                      </div>
                      <div className="metric-bar-wrapper">
                        <div className="metric-progress-bg">
                          <div 
                            className="metric-progress-fill" 
                            style={{ 
                              width: `${currentTrialResult.completeness_score * 100}%`,
                              backgroundColor: '#10b981'
                            }}
                          ></div>
                        </div>
                        <span className="metric-percent">{(currentTrialResult.completeness_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-info">
                        <span className="metric-icon" style={{ backgroundColor: '#f59e0b' }}>⚡</span>
                        <span className="metric-name">Fluency</span>
                      </div>
                      <div className="metric-bar-wrapper">
                        <div className="metric-progress-bg">
                          <div 
                            className="metric-progress-fill" 
                            style={{ 
                              width: `${currentTrialResult.fluency_score * 100}%`,
                              backgroundColor: '#f59e0b'
                            }}
                          ></div>
                        </div>
                        <span className="metric-percent">{(currentTrialResult.fluency_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Trial Button */}
                <div className="trial-action-section">
                  {currentTrial < maxTrials ? (
                    <button
                      className="action-btn primary"
                      onClick={handleNextTrial}
                      style={{ backgroundColor: soundData.color }}
                    >
                      Next Trial ({currentTrial + 1}/{maxTrials}) →
                    </button>
                  ) : (
                    <button
                      className="action-btn primary"
                      onClick={handleShowAssessment}
                      style={{ backgroundColor: soundData.color }}
                    >
                      Show Assessment Results →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Assessment Results - Show after clicking "Show Assessment Results" */}
            {showFinalAssessment && (
              <div className="assessment-results-centered">
                <h2 className="assessment-title">Assessment Complete!</h2>
                
                {/* Assessment Tabs */}
                <div className="assessment-tabs">
                  <button
                    className={`assessment-tab ${assessmentTab === 'average' ? 'active' : ''}`}
                    onClick={() => setAssessmentTab('average')}
                    style={{
                      borderBottomColor: assessmentTab === 'average' ? soundData.color : 'transparent',
                      color: assessmentTab === 'average' ? soundData.color : '#6b7280'
                    }}
                  >
                    Average Score
                  </button>
                  <button
                    className={`assessment-tab ${assessmentTab === 'trials' ? 'active' : ''}`}
                    onClick={() => setAssessmentTab('trials')}
                    style={{
                      borderBottomColor: assessmentTab === 'trials' ? soundData.color : 'transparent',
                      color: assessmentTab === 'trials' ? soundData.color : '#6b7280'
                    }}
                  >
                    Trial Results
                  </button>
                </div>

                {/* Average Score Tab Content */}
                {assessmentTab === 'average' && (
                  <div className="assessment-score-display">
                    <div className="assessment-score-circle" style={{ 
                      borderColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22' 
                    }}>
                      <div className="assessment-score-value" style={{ 
                        color: averageScore >= passThreshold ? '#27ae60' : '#e67e22' 
                      }}>
                        {(averageScore * 100).toFixed(0)}%
                      </div>
                      <div className="assessment-score-label">Average Score</div>
                    </div>
                    <div className="assessment-status" style={{ 
                      color: averageScore >= passThreshold ? '#27ae60' : '#e67e22',
                      backgroundColor: averageScore >= passThreshold ? '#d4edda' : '#fff3cd',
                      borderColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22'
                    }}>
                      {averageScore >= passThreshold ? '✓ PASSED' : '⚠ BELOW THRESHOLD'}
                    </div>
                  </div>
                )}

                {/* Trials Results Tab Content */}
                {assessmentTab === 'trials' && (
                  <div className="all-trials-display">
                    {trialDetails.map((detail, index) => (
                      <div key={index} className="trial-result-card">
                        <div className="trial-card-header">
                          <span className="trial-badge">Trial {index + 1}</span>
                          <span className="trial-overall-score" style={{ 
                            color: detail.computed_score >= passThreshold ? '#27ae60' : '#e67e22' 
                          }}>
                            {(detail.computed_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="trial-transcription">
                          <span className="transcription-label">You said:</span>
                          <span className="transcription-value">"{detail.transcription}"</span>
                        </div>

                        <div className="trial-metrics-detailed">
                          <div className="metric-row">
                            <div className="metric-info">
                              <span className="metric-icon" style={{ backgroundColor: '#3b82f6' }}>🗣️</span>
                              <span className="metric-name">Pronunciation</span>
                            </div>
                            <div className="metric-bar-wrapper">
                              <div className="metric-progress-bg">
                                <div 
                                  className="metric-progress-fill" 
                                  style={{ 
                                    width: `${detail.pronunciation_score * 100}%`,
                                    backgroundColor: '#3b82f6'
                                  }}
                                ></div>
                              </div>
                              <span className="metric-percent">{(detail.pronunciation_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          <div className="metric-row">
                            <div className="metric-info">
                              <span className="metric-icon" style={{ backgroundColor: '#8b5cf6' }}>🎯</span>
                              <span className="metric-name">Accuracy</span>
                            </div>
                            <div className="metric-bar-wrapper">
                              <div className="metric-progress-bg">
                                <div 
                                  className="metric-progress-fill" 
                                  style={{ 
                                    width: `${detail.accuracy_score * 100}%`,
                                    backgroundColor: '#8b5cf6'
                                  }}
                                ></div>
                              </div>
                              <span className="metric-percent">{(detail.accuracy_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          <div className="metric-row">
                            <div className="metric-info">
                              <span className="metric-icon" style={{ backgroundColor: '#10b981' }}>✓</span>
                              <span className="metric-name">Completeness</span>
                            </div>
                            <div className="metric-bar-wrapper">
                              <div className="metric-progress-bg">
                                <div 
                                  className="metric-progress-fill" 
                                  style={{ 
                                    width: `${detail.completeness_score * 100}%`,
                                    backgroundColor: '#10b981'
                                  }}
                                ></div>
                              </div>
                              <span className="metric-percent">{(detail.completeness_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          <div className="metric-row">
                            <div className="metric-info">
                              <span className="metric-icon" style={{ backgroundColor: '#f59e0b' }}>⚡</span>
                              <span className="metric-name">Fluency</span>
                            </div>
                            <div className="metric-bar-wrapper">
                              <div className="metric-progress-bg">
                                <div 
                                  className="metric-progress-fill" 
                                  style={{ 
                                    width: `${detail.fluency_score * 100}%`,
                                    backgroundColor: '#f59e0b'
                                  }}
                                ></div>
                              </div>
                              <span className="metric-percent">{(detail.fluency_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="action-section">
                  {needsMoreTrials && trialScores.length > 0 && (
                    <button
                      className="action-btn secondary"
                      onClick={handleRetry}
                    >
                      Record Trial {currentTrial + 1}
                    </button>
                  )}

                  {canProceed && (
                    <button
                      className="action-btn primary"
                      onClick={handleNextItem}
                      style={{ backgroundColor: soundData.color }}
                    >
                      {currentItem < totalItems - 1 ? 'Next Item →' : 'Complete Level →'}
                    </button>
                  )}

                  {failedItem && (
                    <button
                      className="action-btn retry"
                      onClick={resetTrials}
                      style={{ borderColor: soundData.color, color: soundData.color }}
                    >
                      ↻ Retry This Item
                    </button>
                  )}

                  {canProceed && (
                    <div className="status-message success">
                      ✓ Assessment passed. Proceed to next item.
                    </div>
                  )}

                  {failedItem && (
                    <div className="status-message warning">
                      ⚠ Score below 80%. Retry recommended.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="exercise-footer">
        <div className="exercise-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default ArticulationExercise;
