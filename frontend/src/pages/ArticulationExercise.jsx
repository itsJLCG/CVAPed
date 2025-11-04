import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import WaveSurfer from 'wavesurfer.js';
import './ArticulationExercise.css';

// Exercise data for all 5 sounds
const exerciseData = {
  s: {
    name: 'S Sound',
    color: '#ce3630',
    levels: {
      1: { name: 'Sound', items: ['s'] },
      2: { name: 'Syllable', items: ['sa', 'se', 'si'] },
      3: { name: 'Word', items: ['sun', 'sock'] },
      4: { name: 'Phrase', items: ['See the sun.', 'Sit down.'] },
      5: { name: 'Sentence', items: ['Sam saw seven shiny shells.', 'The sun is very hot.'] }
    }
  },
  r: {
    name: 'R Sound',
    color: '#479ac3',
    levels: {
      1: { name: 'Sound', items: ['r'] },
      2: { name: 'Syllable', items: ['ra', 're', 'ri'] },
      3: { name: 'Word', items: ['rabbit', 'red'] },
      4: { name: 'Phrase', items: ['Run to the road.', 'Read the book.'] },
      5: { name: 'Sentence', items: ['Rita rides the red rocket.', 'The rabbit raced around the yard.'] }
    }
  },
  l: {
    name: 'L Sound',
    color: '#e8b04e',
    levels: {
      1: { name: 'Sound', items: ['l'] },
      2: { name: 'Syllable', items: ['la', 'le', 'li'] },
      3: { name: 'Word', items: ['lion', 'leaf'] },
      4: { name: 'Phrase', items: ['Look at the lion.', 'Lift the box.'] },
      5: { name: 'Sentence', items: ['Lily loves lemons.', 'The little lamb likes leaves.'] }
    }
  },
  k: {
    name: 'K Sound',
    color: '#8e44ad',
    levels: {
      1: { name: 'Sound', items: ['k'] },
      2: { name: 'Syllable', items: ['ka', 'ke', 'ki'] },
      3: { name: 'Word', items: ['kite', 'cat'] },
      4: { name: 'Phrase', items: ['Kick the ball.', 'Cook the rice.'] },
      5: { name: 'Sentence', items: ['Keep the kite flying high.', 'The cat climbed the kitchen counter.'] }
    }
  },
  th: {
    name: 'TH Sound',
    color: '#27ae60',
    levels: {
      1: { name: 'Sound', items: ['th'] },
      2: { name: 'Syllable', items: ['tha', 'the', 'thi'] },
      3: { name: 'Word', items: ['think', 'this'] },
      4: { name: 'Phrase', items: ['Think about that.', 'This is the thumb.'] },
      5: { name: 'Sentence', items: ['Those three thieves thought they were free.', 'This is my thumb.'] }
    }
  }
};

function ArticulationExercise({ onLogout }) {
  const { soundId } = useParams();
  const navigate = useNavigate();
  
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
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const waveformRef = useRef(null);
  const waveSurferRef = useRef(null);

  const soundData = exerciseData[soundId];
  const currentLevelData = soundData?.levels[currentLevel];
  const currentTarget = currentLevelData?.items[currentItem];
  const totalItems = currentLevelData?.items.length || 3;
  const maxTrials = 3;
  const passThreshold = 0.50;

  useEffect(() => {
    if (waveformRef.current && !waveSurferRef.current) {
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
  }, [soundData.color]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

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
      formData.append('target', currentTarget);
      formData.append('trial', currentTrial);

      const response = await fetch('http://localhost:5000/api/articulation/record', {
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
        feedback: data.feedback || ''
      };
      
      const newTrialScores = [...trialScores, score];
      const newTrialDetails = [...trialDetails, details];
      
      setTrialScores(newTrialScores);
      setTrialDetails(newTrialDetails);

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
      window.speechSynthesis.cancel();

      // Get phonetic representation if it exists, otherwise use original
      const textToSpeak = phoneticMap[currentTarget.toLowerCase()] || currentTarget;
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // For isolated sounds (level 1), use slower rate and emphasize the sound
      if (currentLevel === 1) {
        utterance.rate = 0.6;  // Very slow for isolated sounds
        utterance.pitch = 1.1;  // Slightly higher pitch for clarity
      } else if (currentLevel === 2) {
        utterance.rate = 0.7;  // Slow for syllables
        utterance.pitch = 1.0;
      } else {
        utterance.rate = 0.85;  // Near-normal for words/phrases/sentences
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

      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Please say: "${currentTarget}"`);
    }
  };

  const handleNextItem = () => {
    if (currentItem < totalItems - 1) {
      setCurrentItem(currentItem + 1);
      resetTrials();
    } else if (averageScore >= passThreshold) {
      if (currentLevel < 5) {
        setCurrentLevel(currentLevel + 1);
        setCurrentItem(0);
        setLevelProgress({ ...levelProgress, [currentLevel]: true });
        resetTrials();
        alert(`Level ${currentLevel} Complete! Moving to Level ${currentLevel + 1}: ${soundData.levels[currentLevel + 1].name}`);
      } else {
        alert('Congratulations! You completed all levels for this sound!');
        navigate('/articulation');
      }
    }
  };

  const resetTrials = () => {
    setCurrentTrial(1);
    setTrialScores([]);
    setTrialDetails([]);
    setAverageScore(null);
    setRecordedBlob(null);
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

  return (
    <div className="articulation-exercise-page">
      {/* Header */}
      <header className="exercise-header">
        <div className="exercise-header-container">
          <div className="exercise-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="exercise-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="exercise-header-text" />
          </div>
          <div className="exercise-title-section">
            <h1 className="exercise-sound-title">{soundData.name} Assessment</h1>
            <div className="level-breadcrumb">
              Level {currentLevel}: {currentLevelData.name} • Item {currentItem + 1}/{totalItems}
            </div>
          </div>
          <div className="exercise-nav">
            <button onClick={() => navigate('/articulation')} className="exercise-nav-btn">
              ← Back
            </button>
            <button onClick={handleLogout} className="exercise-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

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
                  <span className="level-name">{soundData.levels[level].name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Card - Compact 2-Column Layout */}
          <div className="exercise-card">
            <div className="exercise-grid">
              {/* Left Column - Target & Recording */}
              <div className="target-column">
                <div className="target-section">
                  <label className="section-label">Target Stimulus</label>
                  <div className="target-text" style={{ color: soundData.color }}>
                    "{currentTarget}"
                  </div>
                  <button className="model-btn" onClick={playModelAudio}>
                    <span className="btn-icon">▶</span> Play Model Audio
                  </button>
                </div>

                <div className="recording-box">
                  <div className="recording-header">
                    <label className="section-label">Recording - Trial {currentTrial}/{maxTrials}</label>
                  </div>
                  
                  <div className="waveform-container" ref={waveformRef}></div>

                  <div className="recording-controls">
                    {!isRecording && !isProcessing && needsMoreTrials && (
                      <button
                        className="record-btn"
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

              {/* Right Column - Results & Actions */}
              <div className="results-column">
                {trialScores.length > 0 && (
                  <div className="scores-section">
                    <label className="section-label">Assessment Results</label>
                    
                    {/* Compact 4-Metric Progress Bars per Trial */}
                    <div className="trials-compact">
                      {trialDetails.map((detail, index) => (
                        <div key={index} className="trial-metrics-card">
                          <div className="trial-header">
                            <span className="trial-num">Trial {index + 1}</span>
                            <span className="trial-score" style={{ color: detail.computed_score >= passThreshold ? '#27ae60' : '#e67e22' }}>
                              {(detail.computed_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="metrics-bars">
                            <div className="metric-bar-row">
                              <span className="metric-label">Pronunciation</span>
                              <div className="metric-bar-bg">
                                <div className="metric-bar-fill" style={{ width: `${detail.pronunciation_score * 100}%`, backgroundColor: '#3b82f6' }}></div>
                              </div>
                              <span className="metric-value">{(detail.pronunciation_score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="metric-bar-row">
                              <span className="metric-label">Accuracy</span>
                              <div className="metric-bar-bg">
                                <div className="metric-bar-fill" style={{ width: `${detail.accuracy_score * 100}%`, backgroundColor: '#8b5cf6' }}></div>
                              </div>
                              <span className="metric-value">{(detail.accuracy_score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="metric-bar-row">
                              <span className="metric-label">Completeness</span>
                              <div className="metric-bar-bg">
                                <div className="metric-bar-fill" style={{ width: `${detail.completeness_score * 100}%`, backgroundColor: '#10b981' }}></div>
                              </div>
                              <span className="metric-value">{(detail.completeness_score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="metric-bar-row">
                              <span className="metric-label">Fluency</span>
                              <div className="metric-bar-bg">
                                <div className="metric-bar-fill" style={{ width: `${detail.fluency_score * 100}%`, backgroundColor: '#f59e0b' }}></div>
                              </div>
                              <span className="metric-value">{(detail.fluency_score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 4-Metric Line Chart */}
                    {trialDetails.length > 1 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <span className="chart-title">Metric Comparison Across Trials</span>
                        </div>
                        <div className="line-chart">
                          <svg width="100%" height="140" viewBox="0 0 320 140">
                            {/* Grid lines */}
                            <line x1="50" y1="20" x2="300" y2="20" stroke="#f3f4f6" strokeWidth="1"/>
                            <line x1="50" y1="45" x2="300" y2="45" stroke="#f3f4f6" strokeWidth="1"/>
                            <line x1="50" y1="70" x2="300" y2="70" stroke="#f3f4f6" strokeWidth="1"/>
                            <line x1="50" y1="95" x2="300" y2="95" stroke="#f3f4f6" strokeWidth="1"/>
                            
                            {/* Y-axis labels */}
                            <text x="5" y="24" fontSize="9" fill="#9ca3af">100</text>
                            <text x="12" y="49" fontSize="9" fill="#9ca3af">75</text>
                            <text x="12" y="74" fontSize="9" fill="#9ca3af">50</text>
                            <text x="12" y="99" fontSize="9" fill="#9ca3af">25</text>
                            <text x="18" y="116" fontSize="9" fill="#9ca3af">0</text>
                            
                            {/* Pronunciation line */}
                            <polyline
                              points={trialDetails.map((detail, index) => {
                                const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                                const y = 110 - (detail.pronunciation_score * 90);
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                            {/* Pronunciation points */}
                            {trialDetails.map((detail, index) => {
                              const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                              const y = 110 - (detail.pronunciation_score * 90);
                              return <circle key={`p${index}`} cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5"/>;
                            })}
                            
                            {/* Accuracy line */}
                            <polyline
                              points={trialDetails.map((detail, index) => {
                                const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                                const y = 110 - (detail.accuracy_score * 90);
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#8b5cf6"
                              strokeWidth="2"
                            />
                            {/* Accuracy points */}
                            {trialDetails.map((detail, index) => {
                              const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                              const y = 110 - (detail.accuracy_score * 90);
                              return <circle key={`a${index}`} cx={x} cy={y} r="4" fill="#8b5cf6" stroke="white" strokeWidth="1.5"/>;
                            })}
                            
                            {/* Completeness line */}
                            <polyline
                              points={trialDetails.map((detail, index) => {
                                const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                                const y = 110 - (detail.completeness_score * 90);
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                            {/* Completeness points */}
                            {trialDetails.map((detail, index) => {
                              const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                              const y = 110 - (detail.completeness_score * 90);
                              return <circle key={`c${index}`} cx={x} cy={y} r="4" fill="#10b981" stroke="white" strokeWidth="1.5"/>;
                            })}
                            
                            {/* Fluency line */}
                            <polyline
                              points={trialDetails.map((detail, index) => {
                                const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                                const y = 110 - (detail.fluency_score * 90);
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2"
                            />
                            {/* Fluency points */}
                            {trialDetails.map((detail, index) => {
                              const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                              const y = 110 - (detail.fluency_score * 90);
                              return <circle key={`f${index}`} cx={x} cy={y} r="4" fill="#f59e0b" stroke="white" strokeWidth="1.5"/>;
                            })}
                            
                            {/* X-axis labels */}
                            {trialDetails.map((detail, index) => {
                              const x = 50 + (index * (250 / Math.max(1, trialDetails.length - 1)));
                              return (
                                <text key={index} x={x} y="130" fontSize="10" fill="#6b7280" textAnchor="middle">T{index + 1}</text>
                              );
                            })}
                          </svg>
                        </div>
                        <div className="chart-legend">
                          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span> Pronunciation</div>
                          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></span> Accuracy</div>
                          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span> Completeness</div>
                          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span> Fluency</div>
                        </div>
                      </div>
                    )}

                    {/* Average Score */}
                    {averageScore !== null && (
                      <div className="average-score-box" style={{ borderColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }}>
                        <div className="avg-row">
                          <span className="avg-label">Average Score:</span>
                          <span className="avg-value" style={{ color: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }}>
                            {(averageScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="avg-status" style={{ backgroundColor: averageScore >= passThreshold ? '#27ae60' : '#e67e22' }}>
                          {averageScore >= passThreshold ? 'PASSED' : 'BELOW THRESHOLD'}
                        </div>
                      </div>
                    )}

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
            </div>
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
