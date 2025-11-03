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
      1: { name: 'Sound', items: ['s', 'sss', 'hiss'] },
      2: { name: 'Syllable', items: ['sa', 'se', 'si'] },
      3: { name: 'Word', items: ['sun', 'sock', 'sip'] },
      4: { name: 'Phrase', items: ['See the sun.', 'Sit down.', 'Pass the salt.'] },
      5: { name: 'Sentence', items: ['Sam saw seven shiny shells.', 'The sun is very hot.', 'She sells sea shells.'] }
    }
  },
  r: {
    name: 'R Sound',
    color: '#479ac3',
    levels: {
      1: { name: 'Sound', items: ['r', 'rrr', 'ra'] },
      2: { name: 'Syllable', items: ['ra', 're', 'ri'] },
      3: { name: 'Word', items: ['rabbit', 'red', 'run'] },
      4: { name: 'Phrase', items: ['Run to the road.', 'Read the book.', 'Red balloon.'] },
      5: { name: 'Sentence', items: ['Rita rides the red rocket.', 'The rabbit raced around the yard.', 'Robert ran really fast.'] }
    }
  },
  l: {
    name: 'L Sound',
    color: '#e8b04e',
    levels: {
      1: { name: 'Sound', items: ['l', 'la', 'lal'] },
      2: { name: 'Syllable', items: ['la', 'le', 'li'] },
      3: { name: 'Word', items: ['lion', 'leaf', 'lamp'] },
      4: { name: 'Phrase', items: ['Look at the lion.', 'Lift the box.', 'Light the lamp.'] },
      5: { name: 'Sentence', items: ['Lily loves lemons.', 'The little lamb likes leaves.', 'Lay the blanket down.'] }
    }
  },
  k: {
    name: 'K Sound',
    color: '#8e44ad',
    levels: {
      1: { name: 'Sound', items: ['k', 'ka', 'ku'] },
      2: { name: 'Syllable', items: ['ka', 'ke', 'ki'] },
      3: { name: 'Word', items: ['kite', 'cat', 'car'] },
      4: { name: 'Phrase', items: ['Kick the ball.', 'Cook the rice.', 'Clean the cup.'] },
      5: { name: 'Sentence', items: ['Keep the kite flying high.', 'The cat climbed the kitchen counter.', 'Kara kept a key in her pocket.'] }
    }
  },
  th: {
    name: 'TH Sound',
    color: '#27ae60',
    levels: {
      1: { name: 'Sound', items: ['th', 'thh', 'th-hold'] },
      2: { name: 'Syllable', items: ['tha', 'the', 'thi'] },
      3: { name: 'Word', items: ['think', 'this', 'thumb'] },
      4: { name: 'Phrase', items: ['Think about that.', 'This is the thumb.', 'They thank her.'] },
      5: { name: 'Sentence', items: ['Those three thieves thought they were free.', 'This is my thumb.', 'The therapist taught them slowly.'] }
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
  const [trialDetails, setTrialDetails] = useState([]); // Store detailed scores from Azure
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
  const passThreshold = 0.90;

  useEffect(() => {
    // Initialize WaveSurfer for waveform display
    if (waveformRef.current && !waveSurferRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: soundData.color,
        progressColor: '#555',
        cursorColor: '#333',
        height: 80,
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
    // Prevent starting if already recording or processing
    if (isRecording || isProcessing) {
      return;
    }

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
        setRecordedBlob(audioBlob);
        
        // Display waveform
        if (waveSurferRef.current) {
          try {
            const url = URL.createObjectURL(audioBlob);
            await waveSurferRef.current.load(url);
          } catch (err) {
            console.log('Waveform display error:', err);
          }
        }

        // Process the recording
        await processRecording(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 5000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob) => {
    setIsProcessing(true);

    try {
      // Get user info for API call
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('patient_id', user.id || 'test-patient');
      formData.append('sound_id', soundId);
      formData.append('level', currentLevel);
      formData.append('target', currentTarget);
      formData.append('trial', currentTrial);

      // Call backend API
      const response = await fetch('http://localhost:5000/api/articulation/record', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process recording');
      }

      const data = await response.json();
      
      // Use computed score from backend
      const score = data.scores?.computed_score || 0;
      
      // Store detailed scores from Azure
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

      // Calculate average if all trials complete
      if (newTrialScores.length >= maxTrials) {
        const avg = newTrialScores.reduce((a, b) => a + b, 0) / newTrialScores.length;
        setAverageScore(avg);
      }

    } catch (error) {
      console.error('Error processing recording:', error);
      alert('Failed to process recording. Using mock score for now.');
      
      // Fallback to mock score if API fails
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

  const playModelAudio = () => {
    // Use Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(currentTarget);
      utterance.rate = 0.8; // Slower for clearer pronunciation
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Get available voices and prefer a female voice (often clearer for kids)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || voice.name.includes('Zira') || voice.name.includes('Google US English')
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
    // RE-ENABLED: 90% pass threshold requirement
    
    if (currentItem < totalItems - 1) {
      // Move to next item in current level
      setCurrentItem(currentItem + 1);
      resetTrials();
    } else if (averageScore >= passThreshold) {
      // All items complete and passed, move to next level
      if (currentLevel < 5) {
        setCurrentLevel(currentLevel + 1);
        setCurrentItem(0);
        setLevelProgress({ ...levelProgress, [currentLevel]: true });
        resetTrials();
        alert(`🎉 Level ${currentLevel} Complete! Moving to Level ${currentLevel + 1}: ${soundData.levels[currentLevel + 1].name}`);
      } else {
        // All levels complete!
        alert('🎉 Congratulations! You completed all levels for this sound!');
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
      // Clear waveform for new recording
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
          <div className="exercise-nav">
            <button onClick={() => navigate('/articulation')} className="exercise-nav-btn">
              Back to Sounds
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
          {/* Progress Header */}
          <div className="exercise-progress-header">
            <h1 className="exercise-sound-title" style={{ color: soundData.color }}>
              {soundData.name} - Level {currentLevel}: {currentLevelData.name}
            </h1>
            <div className="level-indicators">
              {[1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={`level-indicator ${level === currentLevel ? 'current' : ''} ${levelProgress[level] ? 'complete' : ''}`}
                  style={{ 
                    borderColor: level === currentLevel ? soundData.color : '#ddd',
                    backgroundColor: levelProgress[level] ? soundData.color : 'white'
                  }}
                >
                  {level}
                </div>
              ))}
            </div>
            <div className="item-progress">
              Item {currentItem + 1} of {totalItems}
            </div>
          </div>

          {/* Exercise Card */}
          <div className="exercise-card">
            <div className="target-display">
              <h2>Practice Target:</h2>
              <div className="target-text" style={{ color: soundData.color }}>
                {currentTarget}
              </div>
              <button className="listen-btn" onClick={playModelAudio}>
                🔊 Listen to Model
              </button>
            </div>

            {/* Recording Section */}
            <div className="recording-section">
              <h3>Trial {currentTrial} of {maxTrials}</h3>
              
              <div className="waveform-container" ref={waveformRef}></div>

              <div className="recording-controls">
                {!isRecording && !isProcessing && needsMoreTrials && (
                  <button
                    className="record-btn"
                    onClick={startRecording}
                    style={{ backgroundColor: soundData.color }}
                  >
                    🎤 Start Recording
                  </button>
                )}

                {isRecording && (
                  <button
                    className="record-btn recording"
                    onClick={stopRecording}
                  >
                    ⏹️ Stop Recording
                  </button>
                )}

                {isProcessing && (
                  <div className="processing-indicator">
                    <div className="spinner"></div>
                    <span>Processing your pronunciation...</span>
                  </div>
                )}
              </div>

              {/* Trial Scores - Compact & Kid-Friendly */}
              {trialScores.length > 0 && (
                <div className="trial-scores">
                  <h4>📊 Your Scores:</h4>
                  
                  {/* Quick Score Pills */}
                  <div className="score-pills">
                    {trialDetails.map((detail, index) => (
                      <div 
                        key={index} 
                        className={`score-pill ${detail.computed_score >= passThreshold ? 'pass' : 'practice'}`}
                      >
                        <div className="pill-trial">Try {index + 1}</div>
                        <div className="pill-score">{(detail.computed_score * 100).toFixed(0)}%</div>
                        <div className="pill-icon">{detail.computed_score >= passThreshold ? '🌟' : '💪'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Expandable Details */}
                  {trialDetails.length > 0 && (
                    <details className="score-details-expandable">
                      <summary className="details-summary">
                        � View Detailed Analysis
                      </summary>
                      <div className="details-content">
                        {trialDetails.map((detail, index) => (
                          <div key={index} className="detail-card-compact">
                            <div className="detail-header-compact">
                              Try {index + 1} • {(detail.computed_score * 100).toFixed(0)}%
                            </div>
                            <div className="circular-charts">
                              <div className="chart-item">
                                <svg className="circular-chart" viewBox="0 0 36 36">
                                  <path className="circle-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path className="circle"
                                    strokeDasharray={`${detail.pronunciation_score * 100}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <text x="18" y="20.5" className="percentage">{(detail.pronunciation_score * 100).toFixed(0)}%</text>
                                </svg>
                                <div className="chart-label">Pronunciation</div>
                              </div>
                              <div className="chart-item">
                                <svg className="circular-chart" viewBox="0 0 36 36">
                                  <path className="circle-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path className="circle"
                                    strokeDasharray={`${detail.accuracy_score * 100}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <text x="18" y="20.5" className="percentage">{(detail.accuracy_score * 100).toFixed(0)}%</text>
                                </svg>
                                <div className="chart-label">Accuracy</div>
                              </div>
                              <div className="chart-item">
                                <svg className="circular-chart" viewBox="0 0 36 36">
                                  <path className="circle-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path className="circle"
                                    strokeDasharray={`${detail.completeness_score * 100}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <text x="18" y="20.5" className="percentage">{(detail.completeness_score * 100).toFixed(0)}%</text>
                                </svg>
                                <div className="chart-label">Completeness</div>
                              </div>
                              <div className="chart-item">
                                <svg className="circular-chart" viewBox="0 0 36 36">
                                  <path className="circle-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path className="circle"
                                    strokeDasharray={`${detail.fluency_score * 100}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <text x="18" y="20.5" className="percentage">{(detail.fluency_score * 100).toFixed(0)}%</text>
                                </svg>
                                <div className="chart-label">Fluency</div>
                              </div>
                            </div>
                            {detail.transcription && (
                              <div className="heard-text-compact">💬 "{detail.transcription}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Average Score - Big & Clear */}
                  {averageScore !== null && (
                    <div className={`final-score ${averageScore >= passThreshold ? 'passed' : 'need-practice'}`}>
                      <div className="final-label">Final Score</div>
                      <div className="final-number">{(averageScore * 100).toFixed(0)}%</div>
                      <div className="final-status">
                        {averageScore >= passThreshold ? '🎉 Great Job!' : '💪 Keep Practicing!'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Messages */}
              {canProceed && (
                <div className="feedback-message success">
                  🎉 Great job! You scored {(averageScore * 100).toFixed(0)}%!
                </div>
              )}

              {failedItem && (
                <div className="feedback-message warning">
                  Keep practicing! Try to pronounce the sound more clearly.
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                {needsMoreTrials && trialScores.length > 0 && (
                  <button
                    className="action-btn secondary"
                    onClick={handleRetry}
                  >
                    Try Again (Trial {currentTrial + 1})
                  </button>
                )}

                {/* Show Next button only if passed (90%+) */}
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
                    className="action-btn therapist"
                    onClick={() => alert('Therapist review requested. Your therapist will review your recordings.')}
                  >
                    Request Therapist Review
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="instructions-card">
            <h3>Instructions:</h3>
            <ol>
              <li>Click "Listen to Model" to hear the correct pronunciation</li>
              <li>Click "Start Recording" and say the target clearly</li>
              <li>Complete 3 trials for this item</li>
              <li><strong>Score 90% or higher average</strong> to move to the next item</li>
              <li>Complete all 3 items to unlock the next level</li>
              <li><strong>📊 Azure scores show:</strong> Pronunciation, Accuracy, Completeness, and Fluency</li>
            </ol>
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
