import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import { languageService, languageExerciseService, receptiveExerciseService } from '../services/api';
import './LanguageTherapy.css';

// Language Therapy mode metadata (exercises loaded from database)
const languageExercises = {
  receptive: {
    name: 'Receptive Language',
    description: 'Understanding & Comprehension',
    color: '#3b82f6'
  },
  expressive: {
    name: 'Expressive Language',
    description: 'Communication & Expression',
    color: '#8b5cf6'
  }
};

function LanguageTherapy({ onLogout }) {
  const navigate = useNavigate();
  
  // State for exercises - both will be loaded from database
  const [expressiveExercises, setExpressiveExercises] = useState([]);
  const [receptiveExercises, setReceptiveExercises] = useState([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  
  const [therapyMode, setTherapyMode] = useState(null); // 'receptive' or 'expressive'
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userResponse, setUserResponse] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [exerciseResults, setExerciseResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechTimeoutRef = useRef(null);

  // Load expressive exercises from database when component mounts
  useEffect(() => {
    const loadExpressiveExercises = async () => {
      setIsLoadingExercises(true);
      try {
        const response = await languageExerciseService.getActive('expressive');
        console.log('Loading expressive exercises from database:', response);
        
        if (response && response.success && response.exercises_by_level) {
          // Transform grouped data to flat array format
          const exercisesArray = [];
          Object.entries(response.exercises_by_level).forEach(([level, levelData]) => {
            if (levelData.exercises && Array.isArray(levelData.exercises)) {
              levelData.exercises.forEach(ex => {
                exercisesArray.push({
                  id: ex.exercise_id,
                  type: ex.type,
                  level: ex.level,
                  instruction: ex.instruction,
                  prompt: ex.prompt,
                  expectedKeywords: ex.expected_keywords || [],
                  minWords: ex.min_words || 5,
                  story: ex.story || undefined
                });
              });
            }
          });
          
          console.log(`Loaded ${exercisesArray.length} expressive exercises from database`);
          setExpressiveExercises(exercisesArray);
        }
      } catch (error) {
        console.error('Failed to load expressive exercises:', error);
        // Keep empty array on error
      } finally {
        setIsLoadingExercises(false);
      }
    };

    loadExpressiveExercises();
  }, []);

  // Load receptive exercises from database when component mounts
  useEffect(() => {
    const loadReceptiveExercises = async () => {
      setIsLoadingExercises(true);
      try {
        const response = await receptiveExerciseService.getActive();
        console.log('Loading receptive exercises from database:', response);
        
        if (response && response.success && response.exercises_by_level) {
          // Transform grouped data to flat array format
          const exercisesArray = [];
          Object.entries(response.exercises_by_level).forEach(([level, levelData]) => {
            if (levelData.exercises && Array.isArray(levelData.exercises)) {
              levelData.exercises.forEach(ex => {
                exercisesArray.push({
                  id: ex.exercise_id,
                  type: ex.type,
                  level: ex.level,
                  instruction: ex.instruction,
                  target: ex.target,
                  options: ex.options || []
                });
              });
            }
          });
          
          console.log(`Loaded ${exercisesArray.length} receptive exercises from database`);
          setReceptiveExercises(exercisesArray);
        }
      } catch (error) {
        console.error('Failed to load receptive exercises:', error);
        // Keep empty array on error
      } finally {
        setIsLoadingExercises(false);
      }
    };

    loadReceptiveExercises();
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const selectTherapyMode = async (mode) => {
    setTherapyMode(mode);
    setExerciseResults([]);
    setShowResults(false);
    setHasPlayedAudio(false); // Reset audio flag when selecting mode
    setIsLoadingProgress(true); // Mark that we're loading progress
    
    // Load progress from backend
    try {
      const progressData = await languageService.getProgress(mode);
      console.log('Progress data for', mode, ':', progressData);
      
      if (progressData.success && progressData.has_progress) {
        // Resume from where user left off
        const totalExercises = mode === 'expressive' 
          ? expressiveExercises.length 
          : receptiveExercises.length;
        
        console.log('Total exercises available:', totalExercises);
        console.log('Current exercise from progress:', progressData.current_exercise);
        
        // Check if user completed all exercises
        if (progressData.current_exercise >= totalExercises) {
          console.log(`${mode} therapy completed! Showing results.`);
          
          // Load all exercise results from progress data
          const results = [];
          for (let i = 0; i < totalExercises; i++) {
            const exerciseData = progressData.exercises[i];
            if (exerciseData) {
              results.push({
                type: mode,
                correct: exerciseData.is_correct,
                score: exerciseData.score || (exerciseData.is_correct ? 1 : 0),
                transcription: exerciseData.user_answer || exerciseData.transcription
              });
            }
          }
          
          setExerciseResults(results);
          setCurrentExerciseIndex(0);
          setShowResults(true);
        } else {
          setCurrentExerciseIndex(progressData.current_exercise);
          console.log(`Resuming ${mode} therapy from exercise ${progressData.current_exercise}`);
        }
      } else {
        // Start from beginning
        setCurrentExerciseIndex(0);
        console.log(`Starting ${mode} therapy from beginning`);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setCurrentExerciseIndex(0);
    } finally {
      setIsLoadingProgress(false); // Done loading progress
    }
  };

  // Get current exercises based on mode
  const currentExercises = therapyMode 
    ? (therapyMode === 'expressive' ? expressiveExercises : receptiveExercises)
    : [];
  const currentExercise = currentExercises[currentExerciseIndex];

  // Text-to-Speech for instructions with visual feedback
  const speakText = (text, repeatCount = 2) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
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
            // Add delay between repeats
            speechTimeoutRef.current = setTimeout(() => {
              speakOnce();
            }, 800);
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

  // Auto-play audio when exercise loads (Receptive only)
  useEffect(() => {
    // Don't play audio while we're still loading progress
    if (isLoadingProgress) {
      console.log('Skipping audio - still loading progress');
      return;
    }
    
    if (therapyMode === 'receptive' && currentExercise && !hasPlayedAudio && !feedback) {
      // Play instruction first
      const playInstructions = async () => {
        console.log('Playing audio for exercise:', {
          index: currentExerciseIndex,
          id: currentExercise.id,
          type: currentExercise.type,
          target: currentExercise.target
        });
        
        // Cancel any ongoing speech first
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        
        // Wait a moment for page to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Speak instruction
        await speakText(currentExercise.instruction, 1);
        
        // Short pause
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Speak the target word/phrase 2 times
        let targetText = '';
        if (currentExercise.type === 'vocabulary') {
          targetText = `Find the ${currentExercise.target}`;
        } else if (currentExercise.type === 'directions') {
          targetText = `Point to the ${currentExercise.target}`;
        } else if (currentExercise.type === 'comprehension') {
          targetText = currentExercise.target;
        }
        
        console.log('Speaking target text:', targetText);
        await speakText(targetText, 2);
        setHasPlayedAudio(true);
      };
      
      playInstructions();
    }
    
    return () => {
      // Cleanup
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, [therapyMode, currentExerciseIndex, currentExercise, hasPlayedAudio, feedback, isLoadingProgress]);

  // Text-to-Speech for manual play button
  const speakInstruction = (text) => {
    speakText(text, 1);
  };

  // Handle Receptive Exercise Selection
  const handleReceptiveSelection = async (optionId) => {
    if (feedback) return; // Already answered
    
    const selectedOption = currentExercise.options.find(opt => opt.id === optionId);
    const isCorrect = selectedOption.correct;
    
    setUserResponse(optionId);
    setFeedback({
      correct: isCorrect,
      message: isCorrect ? 'Correct! Well done.' : 'Incorrect. Try again next time.'
    });

    // Store result
    const result = {
      exerciseId: currentExercise.id,
      type: 'receptive',
      level: currentExercise.level,
      correct: isCorrect,
      response: selectedOption.text,
      timestamp: new Date().toISOString()
    };
    setExerciseResults([...exerciseResults, result]);

    // Save progress to database
    try {
      await languageService.saveProgress({
        mode: 'receptive',
        exercise_index: currentExerciseIndex,
        exercise_id: currentExercise.id,
        is_correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        user_answer: selectedOption.text
      });
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Convert audio blob to WAV format using Web Audio API
  const convertToWav = async (audioBlob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to WAV format (16-bit PCM, 16kHz, mono)
    const sampleRate = 16000;
    const numChannels = 1;
    const length = audioBuffer.duration * sampleRate;
    const wavBuffer = audioContext.createBuffer(numChannels, length, sampleRate);
    
    // Downsample and convert to mono
    const channelData = audioBuffer.getChannelData(0);
    const wavData = wavBuffer.getChannelData(0);
    const step = audioBuffer.sampleRate / sampleRate;
    
    for (let i = 0; i < length; i++) {
      const index = Math.floor(i * step);
      wavData[i] = channelData[index];
    }
    
    // Create WAV file
    const wavBlob = await audioBufferToWav(wavBuffer);
    await audioContext.close();
    
    return wavBlob;
  };
  
  // Convert AudioBuffer to WAV Blob
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

  // Handle Expressive Exercise Recording
  const startRecording = async () => {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          // Convert to proper WAV format
          const wavBlob = await convertToWav(audioBlob);
          setRecordedBlob(wavBlob);
          processExpressiveResponse(wavBlob);
        } catch (error) {
          console.error('Error converting audio:', error);
          // Fallback: try with original blob
          setRecordedBlob(audioBlob);
          processExpressiveResponse(audioBlob);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processExpressiveResponse = async (audioBlob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'response.wav');
      formData.append('exercise_id', currentExercise.id);
      formData.append('exercise_type', currentExercise.type);
      formData.append('expected_keywords', JSON.stringify(currentExercise.expectedKeywords));
      formData.append('min_words', currentExercise.minWords);

      const response = await fetch('http://localhost:5000/api/language/assess-expressive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        const isCorrect = result.score >= 0.7;
        
        setFeedback({
          correct: isCorrect,
          message: result.feedback,
          transcription: result.transcription,
          keyPhrases: result.key_phrases,
          score: result.score
        });

        // Store result
        const exerciseResult = {
          exerciseId: currentExercise.id,
          type: 'expressive',
          level: currentExercise.level,
          transcription: result.transcription,
          keyPhrases: result.key_phrases,
          score: result.score,
          feedback: result.feedback,
          timestamp: new Date().toISOString()
        };
        setExerciseResults([...exerciseResults, exerciseResult]);

        // Save progress to database
        try {
          await languageService.saveProgress({
            mode: 'expressive',
            exercise_index: currentExerciseIndex,
            exercise_id: currentExercise.id,
            is_correct: isCorrect,
            score: result.score,
            transcription: result.transcription
          });
          console.log('Expressive progress saved successfully');
        } catch (error) {
          console.error('Error saving expressive progress:', error);
        }
      } else {
        setFeedback({
          correct: false,
          message: 'Error processing response. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error processing expressive response:', error);
      setFeedback({
        correct: false,
        message: 'Error processing response. Please try again.'
      });
    }

    setIsProcessing(false);
  };

  const handleNext = () => {
    // Don't allow next if exercise not completed
    if (!feedback) {
      alert('Please complete the current exercise before moving to the next one.');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    setIsSpeaking(false);
    
    if (currentExerciseIndex < currentExercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      resetExercise();
    } else {
      setShowResults(true);
    }
  };

  const resetExercise = () => {
    setUserResponse(null);
    setFeedback(null);
    setRecordedBlob(null);
    setHasPlayedAudio(false);
    setIsSpeaking(false);
  };

  const handleRetry = () => {
    resetExercise();
  };

  const calculateOverallScore = () => {
    if (exerciseResults.length === 0) return 0;
    
    let totalScore = 0;
    exerciseResults.forEach(result => {
      if (result.type === 'receptive') {
        totalScore += result.correct ? 1 : 0;
      } else {
        totalScore += result.score || 0;
      }
    });
    
    return ((totalScore / exerciseResults.length) * 100).toFixed(0);
  };

  if (!therapyMode) {
    return (
      <div className="language-therapy-page">
        {/* Header */}
        <header className="language-header">
          <div className="language-header-container">
            <div className="language-logo-group">
              <img src={images.logo} alt="CVAPed Logo" className="language-header-logo" />
              <img src={images.cvacareText} alt="CVAPed" className="language-header-text" />
            </div>
            <div className="language-nav">
              <button onClick={() => navigate('/speech-therapy')} className="language-nav-btn">
                ← Back
              </button>
              <button onClick={() => navigate('/profile')} className="language-nav-btn profile">
                My Profile
              </button>
              <button onClick={handleLogout} className="language-nav-btn logout">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Mode Selection */}
        <main className="language-main">
          <div className="language-container">
            <div className="language-selection-header">
              <h1 className="language-title">Language Therapy Assessment</h1>
              <p className="language-subtitle">Choose your therapy focus area</p>
            </div>

            <div className="language-modes-grid">
              <div className="language-mode-card" onClick={() => selectTherapyMode('receptive')}>
                <div className="mode-icon" style={{ backgroundColor: languageExercises.receptive.color }}>
                  👂
                </div>
                <h2 className="mode-title">{languageExercises.receptive.name}</h2>
                <p className="mode-description">{languageExercises.receptive.description}</p>
                <div className="mode-features">
                  <div className="feature-item">✓ Listening Comprehension</div>
                  <div className="feature-item">✓ Following Directions</div>
                  <div className="feature-item">✓ Vocabulary Recognition</div>
                  <div className="feature-item">✓ Sentence Understanding</div>
                </div>
                <button 
                  className="mode-btn" 
                  style={{ backgroundColor: languageExercises.receptive.color }}
                  disabled={isLoadingExercises || receptiveExercises.length === 0}
                >
                  {isLoadingExercises 
                    ? 'Loading Exercises...' 
                    : receptiveExercises.length === 0 
                      ? 'No Exercises Available' 
                      : 'Begin Receptive Assessment'}
                </button>
              </div>

              <div className="language-mode-card" onClick={() => selectTherapyMode('expressive')}>
                <div className="mode-icon" style={{ backgroundColor: languageExercises.expressive.color }}>
                  💬
                </div>
                <h2 className="mode-title">{languageExercises.expressive.name}</h2>
                <p className="mode-description">{languageExercises.expressive.description}</p>
                <div className="mode-features">
                  <div className="feature-item">✓ Picture Description</div>
                  <div className="feature-item">✓ Sentence Formation</div>
                  <div className="feature-item">✓ Story Retelling</div>
                  <div className="feature-item">✓ Verbal Expression</div>
                </div>
                <button 
                  className="mode-btn" 
                  style={{ backgroundColor: languageExercises.expressive.color }}
                  disabled={isLoadingExercises || expressiveExercises.length === 0}
                >
                  {isLoadingExercises 
                    ? 'Loading Exercises...' 
                    : expressiveExercises.length === 0 
                      ? 'No Exercises Available' 
                      : 'Begin Expressive Assessment'}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="language-footer">
          <div className="language-footer-container">
            <p>&copy; 2025 CVAPed. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  if (showResults) {
    const overallScore = calculateOverallScore();
    const passed = overallScore >= 70;

    return (
      <div className="language-therapy-page">
        <header className="language-header">
          <div className="language-header-container">
            <div className="language-logo-group">
              <img src={images.logo} alt="CVAPed Logo" className="language-header-logo" />
              <img src={images.cvacareText} alt="CVAPed" className="language-header-text" />
            </div>
            <div className="language-nav">
              <button onClick={() => setTherapyMode(null)} className="language-nav-btn">
                ← Back to Selection
              </button>
              <button onClick={() => navigate('/profile')} className="language-nav-btn profile">
                My Profile
              </button>
              <button onClick={handleLogout} className="language-nav-btn logout">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="language-main">
          <div className="language-container">
            <div className="results-card">
              <h1 className="results-title">Assessment Complete!</h1>
              
              <div className="overall-score-box" style={{ 
                borderColor: passed ? '#10b981' : '#f59e0b',
                backgroundColor: passed ? '#d4edda' : '#fff3cd'
              }}>
                <div className="score-label">Overall Score</div>
                <div className="score-value" style={{ color: passed ? '#10b981' : '#f59e0b' }}>
                  {overallScore}%
                </div>
                <div className="score-status" style={{ 
                  backgroundColor: passed ? '#10b981' : '#f59e0b',
                  color: 'white'
                }}>
                  {passed ? '✓ EXCELLENT PERFORMANCE' : '⚠ NEEDS IMPROVEMENT'}
                </div>
              </div>

              <div className="results-breakdown">
                <h3>Exercise Breakdown</h3>
                {exerciseResults.map((result, index) => (
                  <div key={index} className="result-item">
                    <div className="result-header">
                      <span className="result-exercise">Exercise {index + 1}</span>
                      <span className="result-score" style={{ 
                        color: (result.type === 'receptive' ? result.correct : result.score >= 0.7) ? '#10b981' : '#f59e0b'
                      }}>
                        {result.type === 'receptive' 
                          ? (result.correct ? '✓ Correct' : '✗ Incorrect')
                          : `${(result.score * 100).toFixed(0)}%`
                        }
                      </span>
                    </div>
                    {result.type === 'expressive' && result.transcription && (
                      <div className="result-transcription">
                        <strong>Your response:</strong> {result.transcription}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="results-actions">
                <button 
                  className="results-btn primary"
                  onClick={() => {
                    setTherapyMode(null);
                    setCurrentExerciseIndex(0);
                    setExerciseResults([]);
                    setShowResults(false);
                  }}
                  style={{ backgroundColor: languageExercises[therapyMode].color }}
                >
                  Try Another Assessment
                </button>
                <button 
                  className="results-btn secondary"
                  onClick={() => navigate('/speech-therapy')}
                >
                  Back to Speech Therapy
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="language-footer">
          <div className="language-footer-container">
            <p>&copy; 2025 CVAPed. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  const modeData = languageExercises[therapyMode];

  return (
    <div className="language-therapy-page">
      {/* Header */}
      <header className="language-header">
        <div className="language-header-container">
          <div className="language-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="language-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="language-header-text" />
          </div>
          <div className="language-title-section">
            <h1 className="language-exercise-title">{modeData.name} Assessment</h1>
            <div className="language-breadcrumb">
              Exercise {currentExerciseIndex + 1} of {currentExercises.length} • Level {currentExercise?.level || 1}
            </div>
          </div>
          <div className="language-nav">
            <button onClick={() => setTherapyMode(null)} className="language-nav-btn">
              ← Back
            </button>
            <button onClick={() => navigate('/profile')} className="language-nav-btn profile">
              My Profile
            </button>
            <button onClick={handleLogout} className="language-nav-btn logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Exercise */}
      <main className="language-main">
        <div className="language-container">
          <div className="exercise-card">
            {/* Progress Indicator */}
            <div className="exercise-progress">
              <div className="progress-header">
                <span className="progress-label">Exercise Progress</span>
                <span className="progress-count">{currentExerciseIndex + 1} / {currentExercises.length}</span>
              </div>
              <div className="progress-dots">
                {currentExercises.map((_, index) => {
                  const isCompleted = index < currentExerciseIndex || (index === currentExerciseIndex && feedback);
                  const isCurrent = index === currentExerciseIndex;
                  const isLocked = index > currentExerciseIndex;
                  
                  return (
                    <div 
                      key={index}
                      className={`progress-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                      style={{
                        backgroundColor: isCompleted ? modeData.color : (isCurrent ? '#fff' : '#e5e7eb'),
                        borderColor: isCurrent ? modeData.color : (isCompleted ? modeData.color : '#e5e7eb')
                      }}
                      title={`Exercise ${index + 1}${isLocked ? ' (Locked)' : ''}`}
                    >
                      {isCompleted && <span className="dot-check">✓</span>}
                      {isLocked && <span className="dot-lock">🔒</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Speaking Indicator */}
            {isSpeaking && (
              <div className="speaking-indicator">
                <div className="speaking-icon">🔊</div>
                <div className="speaking-text">
                  <strong>Audio Playing...</strong>
                  <p>Please turn up your volume if you can't hear</p>
                </div>
                <div className="speaking-animation">
                  <div className="wave"></div>
                  <div className="wave"></div>
                  <div className="wave"></div>
                </div>
              </div>
            )}

            <div className="instruction-section">
              <div className="instruction-header">
                <h2 className="instruction-title">Instructions</h2>
                <button 
                  className="speak-btn"
                  onClick={() => speakInstruction(currentExercise.instruction)}
                  style={{ backgroundColor: modeData.color }}
                  disabled={isSpeaking}
                >
                  🔊 Replay Instructions
                </button>
              </div>
              <p className="instruction-text">{currentExercise.instruction}</p>
            </div>

            {therapyMode === 'receptive' && (
              <div className="receptive-exercise">
                {/* Replay Target Audio Button */}
                <div className="replay-section">
                  <button 
                    className="replay-target-btn"
                    onClick={() => {
                      let targetText = '';
                      if (currentExercise.type === 'vocabulary') {
                        targetText = `Find the ${currentExercise.target}`;
                      } else if (currentExercise.type === 'directions') {
                        targetText = `Point to the ${currentExercise.target}`;
                      } else if (currentExercise.type === 'comprehension') {
                        targetText = currentExercise.target;
                      }
                      speakText(targetText, 2);
                    }}
                    disabled={isSpeaking || feedback !== null}
                    style={{ 
                      backgroundColor: feedback ? '#6b7280' : modeData.color,
                      cursor: (isSpeaking || feedback) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🔊 Replay Target (2x)
                  </button>
                </div>

                {currentExercise.type === 'vocabulary' && (
                  <div className="options-grid">
                    {currentExercise.options.map(option => (
                      <button
                        key={option.id}
                        className={`option-btn ${userResponse === option.id ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                        onClick={() => handleReceptiveSelection(option.id)}
                        disabled={feedback !== null || isSpeaking}
                      >
                        <div className="option-image">{option.image}</div>
                        <div className="option-text">{option.text}</div>
                      </button>
                    ))}
                  </div>
                )}

                {currentExercise.type === 'directions' && (
                  <div className="options-grid">
                    {currentExercise.options.map(option => (
                      <button
                        key={option.id}
                        className={`option-btn ${userResponse === option.id ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                        onClick={() => handleReceptiveSelection(option.id)}
                        disabled={feedback !== null || isSpeaking}
                      >
                        <div className="option-shape">{option.shape}</div>
                        <div className="option-text">{option.text}</div>
                      </button>
                    ))}
                  </div>
                )}

                {currentExercise.type === 'comprehension' && (
                  <div className="options-list">
                    {currentExercise.options.map(option => (
                      <button
                        key={option.id}
                        className={`option-btn-list ${userResponse === option.id ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                        onClick={() => handleReceptiveSelection(option.id)}
                        disabled={feedback !== null || isSpeaking}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {therapyMode === 'expressive' && (
              <div className="expressive-exercise">
                {currentExercise.type === 'description' && (
                  <div className="prompt-section">
                    <div className="prompt-visual">{currentExercise.prompt}</div>
                  </div>
                )}

                {currentExercise.type === 'sentence' && (
                  <div className="prompt-section">
                    <div className="prompt-text">{currentExercise.prompt}</div>
                  </div>
                )}

                {currentExercise.type === 'retell' && (
                  <div className="story-section">
                    <div className="story-box">
                      <p className="story-text">{currentExercise.story}</p>
                      <button 
                        className="speak-story-btn"
                        onClick={() => speakInstruction(currentExercise.story)}
                        style={{ backgroundColor: modeData.color }}
                      >
                        🔊 Listen to Story
                      </button>
                    </div>
                  </div>
                )}

                <div className="recording-section">
                  {!isRecording && !isProcessing && !feedback && (
                    <button
                      className="record-btn"
                      onClick={startRecording}
                      style={{ backgroundColor: modeData.color }}
                    >
                      <span className="btn-icon">●</span> Start Recording
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
                      <span>Processing your response...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {feedback && (
              <div className={`feedback-section ${feedback.correct ? 'success' : 'warning'}`}>
                <div className="feedback-message">
                  {feedback.correct ? '✓' : '✗'} {feedback.message}
                </div>
                {feedback.transcription && (
                  <div className="feedback-transcription">
                    <strong>What you said:</strong> {feedback.transcription}
                  </div>
                )}
                {feedback.keyPhrases && feedback.keyPhrases.length > 0 && (
                  <div className="feedback-keyphrases">
                    <strong>Key phrases identified:</strong> {feedback.keyPhrases.join(', ')}
                  </div>
                )}
                {feedback.score !== undefined && (
                  <div className="feedback-score">
                    <strong>Score:</strong> {(feedback.score * 100).toFixed(0)}%
                  </div>
                )}

                <div className="feedback-actions">
                  <button 
                    className="feedback-btn retry"
                    onClick={handleRetry}
                    style={{ borderColor: modeData.color, color: modeData.color }}
                  >
                    ↻ Try Again
                  </button>
                  <button 
                    className={`feedback-btn next ${!feedback ? 'locked' : ''}`}
                    onClick={handleNext}
                    style={{ 
                      backgroundColor: feedback ? modeData.color : '#9ca3af',
                      cursor: feedback ? 'pointer' : 'not-allowed',
                      opacity: feedback ? 1 : 0.6
                    }}
                    title={!feedback ? 'Complete the exercise first' : ''}
                  >
                    {!feedback && '🔒 '}
                    {currentExerciseIndex < currentExercises.length - 1 ? 'Next Exercise →' : 'View Results →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="language-footer">
        <div className="language-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LanguageTherapy;
