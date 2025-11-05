import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import { languageService } from '../services/api';
import './LanguageTherapy.css';

// Language Therapy Exercise Data
const languageExercises = {
  receptive: {
    name: 'Receptive Language',
    description: 'Understanding & Comprehension',
    color: '#3b82f6',
    exercises: [
      // Level 1: Vocabulary Matching (5 items)
      {
        id: 'vocab-1',
        type: 'vocabulary',
        level: 1,
        instruction: 'Listen to the word and select the correct picture.',
        target: 'apple',
        options: [
          { id: 1, text: 'Apple', image: '🍎', correct: true },
          { id: 2, text: 'Banana', image: '🍌', correct: false },
          { id: 3, text: 'Orange', image: '🍊', correct: false },
          { id: 4, text: 'Grape', image: '🍇', correct: false }
        ]
      },
      {
        id: 'vocab-2',
        type: 'vocabulary',
        level: 1,
        instruction: 'Listen to the word and select the correct picture.',
        target: 'dog',
        options: [
          { id: 1, text: 'Cat', image: '🐱', correct: false },
          { id: 2, text: 'Dog', image: '🐶', correct: true },
          { id: 3, text: 'Bird', image: '🐦', correct: false },
          { id: 4, text: 'Fish', image: '🐟', correct: false }
        ]
      },
      {
        id: 'vocab-3',
        type: 'vocabulary',
        level: 1,
        instruction: 'Listen to the word and select the correct picture.',
        target: 'car',
        options: [
          { id: 1, text: 'Bus', image: '🚌', correct: false },
          { id: 2, text: 'Bicycle', image: '🚲', correct: false },
          { id: 3, text: 'Car', image: '🚗', correct: true },
          { id: 4, text: 'Train', image: '🚂', correct: false }
        ]
      },
      {
        id: 'vocab-4',
        type: 'vocabulary',
        level: 1,
        instruction: 'Listen to the word and select the correct picture.',
        target: 'book',
        options: [
          { id: 1, text: 'Book', image: '📖', correct: true },
          { id: 2, text: 'Pencil', image: '✏️', correct: false },
          { id: 3, text: 'Paper', image: '📄', correct: false },
          { id: 4, text: 'Bag', image: '🎒', correct: false }
        ]
      },
      {
        id: 'vocab-5',
        type: 'vocabulary',
        level: 1,
        instruction: 'Listen to the word and select the correct picture.',
        target: 'sun',
        options: [
          { id: 1, text: 'Moon', image: '🌙', correct: false },
          { id: 2, text: 'Star', image: '⭐', correct: false },
          { id: 3, text: 'Sun', image: '☀️', correct: true },
          { id: 4, text: 'Cloud', image: '☁️', correct: false }
        ]
      },
      // Level 2: Following Directions (5 items)
      {
        id: 'directions-1',
        type: 'directions',
        level: 2,
        instruction: 'Follow the direction: "Point to the blue circle."',
        target: 'blue circle',
        options: [
          { id: 1, text: 'Red Square', shape: '🟥', correct: false },
          { id: 2, text: 'Blue Circle', shape: '🔵', correct: true },
          { id: 3, text: 'Green Triangle', shape: '🟩', correct: false },
          { id: 4, text: 'Yellow Star', shape: '⭐', correct: false }
        ]
      },
      {
        id: 'directions-2',
        type: 'directions',
        level: 2,
        instruction: 'Follow the direction: "Point to the red square."',
        target: 'red square',
        options: [
          { id: 1, text: 'Red Square', shape: '🟥', correct: true },
          { id: 2, text: 'Blue Circle', shape: '🔵', correct: false },
          { id: 3, text: 'Green Diamond', shape: '🔶', correct: false },
          { id: 4, text: 'Purple Heart', shape: '💜', correct: false }
        ]
      },
      {
        id: 'directions-3',
        type: 'directions',
        level: 2,
        instruction: 'Follow the direction: "Point to the yellow star."',
        target: 'yellow star',
        options: [
          { id: 1, text: 'Blue Circle', shape: '🔵', correct: false },
          { id: 2, text: 'Yellow Star', shape: '⭐', correct: true },
          { id: 3, text: 'Red Heart', shape: '❤️', correct: false },
          { id: 4, text: 'Green Square', shape: '🟩', correct: false }
        ]
      },
      {
        id: 'directions-4',
        type: 'directions',
        level: 2,
        instruction: 'Follow the direction: "Point to the green square."',
        target: 'green square',
        options: [
          { id: 1, text: 'Red Square', shape: '🟥', correct: false },
          { id: 2, text: 'Yellow Circle', shape: '🟡', correct: false },
          { id: 3, text: 'Green Square', shape: '🟩', correct: true },
          { id: 4, text: 'Blue Star', shape: '💙', correct: false }
        ]
      },
      {
        id: 'directions-5',
        type: 'directions',
        level: 2,
        instruction: 'Follow the direction: "Point to the purple heart."',
        target: 'purple heart',
        options: [
          { id: 1, text: 'Red Heart', shape: '❤️', correct: false },
          { id: 2, text: 'Purple Heart', shape: '💜', correct: true },
          { id: 3, text: 'Yellow Star', shape: '⭐', correct: false },
          { id: 4, text: 'Blue Circle', shape: '🔵', correct: false }
        ]
      },
      // Level 3: Sentence Comprehension (5 items)
      {
        id: 'comprehension-1',
        type: 'comprehension',
        level: 3,
        instruction: 'Listen: "The cat is sleeping under the table." What is the cat doing?',
        target: 'sleeping',
        options: [
          { id: 1, text: 'Eating', correct: false },
          { id: 2, text: 'Sleeping', correct: true },
          { id: 3, text: 'Running', correct: false },
          { id: 4, text: 'Playing', correct: false }
        ]
      },
      {
        id: 'comprehension-2',
        type: 'comprehension',
        level: 3,
        instruction: 'Listen: "The boy is playing with a red ball." What color is the ball?',
        target: 'red',
        options: [
          { id: 1, text: 'Blue', correct: false },
          { id: 2, text: 'Red', correct: true },
          { id: 3, text: 'Green', correct: false },
          { id: 4, text: 'Yellow', correct: false }
        ]
      },
      {
        id: 'comprehension-3',
        type: 'comprehension',
        level: 3,
        instruction: 'Listen: "Mom is cooking dinner in the kitchen." Where is Mom?',
        target: 'kitchen',
        options: [
          { id: 1, text: 'Bedroom', correct: false },
          { id: 2, text: 'Kitchen', correct: true },
          { id: 3, text: 'Garden', correct: false },
          { id: 4, text: 'Bathroom', correct: false }
        ]
      },
      {
        id: 'comprehension-4',
        type: 'comprehension',
        level: 3,
        instruction: 'Listen: "The bird is flying high in the sky." Where is the bird?',
        target: 'sky',
        options: [
          { id: 1, text: 'Tree', correct: false },
          { id: 2, text: 'Sky', correct: true },
          { id: 3, text: 'Ground', correct: false },
          { id: 4, text: 'Water', correct: false }
        ]
      },
      {
        id: 'comprehension-5',
        type: 'comprehension',
        level: 3,
        instruction: 'Listen: "Dad is reading a book to the children." What is Dad doing?',
        target: 'reading',
        options: [
          { id: 1, text: 'Reading', correct: true },
          { id: 2, text: 'Writing', correct: false },
          { id: 3, text: 'Singing', correct: false },
          { id: 4, text: 'Dancing', correct: false }
        ]
      }
    ]
  },
  expressive: {
    name: 'Expressive Language',
    description: 'Communication & Expression',
    color: '#8b5cf6',
    exercises: [
      {
        id: 'picture-description',
        type: 'description',
        level: 1,
        instruction: 'Look at the picture and describe what you see.',
        prompt: '🏠🌳👨‍👩‍👧',
        expectedKeywords: ['house', 'tree', 'family', 'people', 'home'],
        minWords: 5
      },
      {
        id: 'sentence-formation',
        type: 'sentence',
        level: 2,
        instruction: 'Use these words to make a sentence: "boy, ball, playing"',
        prompt: 'Words: boy, ball, playing',
        expectedKeywords: ['boy', 'ball', 'playing'],
        minWords: 4
      },
      {
        id: 'story-retell',
        type: 'retell',
        level: 3,
        instruction: 'Listen to the story and retell it in your own words.',
        story: 'A little bird wanted to fly. It tried many times but failed. The bird did not give up. Finally, it flew high in the sky.',
        expectedKeywords: ['bird', 'fly', 'tried', 'sky'],
        minWords: 10
      }
    ]
  }
};

function LanguageTherapy({ onLogout }) {
  const navigate = useNavigate();
  
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
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechTimeoutRef = useRef(null);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const selectTherapyMode = async (mode) => {
    setTherapyMode(mode);
    setExerciseResults([]);
    setShowResults(false);
    
    // Load progress from backend
    try {
      const progressData = await languageService.getProgress(mode);
      if (progressData.success && progressData.has_progress) {
        // Resume from where user left off
        setCurrentExerciseIndex(progressData.current_exercise);
        console.log(`Resuming ${mode} therapy from exercise ${progressData.current_exercise}`);
      } else {
        // Start from beginning
        setCurrentExerciseIndex(0);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setCurrentExerciseIndex(0);
    }
  };

  const currentExercises = therapyMode ? languageExercises[therapyMode].exercises : [];
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
    if (therapyMode === 'receptive' && currentExercise && !hasPlayedAudio && !feedback) {
      // Play instruction first
      const playInstructions = async () => {
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
  }, [therapyMode, currentExerciseIndex, currentExercise, hasPlayedAudio, feedback]);

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

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        processExpressiveResponse(audioBlob);
        
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
                >
                  Begin Receptive Assessment
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
                >
                  Begin Expressive Assessment
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
              Exercise {currentExerciseIndex + 1} of {currentExercises.length} • Level {currentExercise.level}
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
                    className="feedback-btn next"
                    onClick={handleNext}
                    style={{ backgroundColor: modeData.color }}
                  >
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
