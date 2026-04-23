import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import { TherapyCategoryProvider } from './components/TherapyCategoryContext';
import { VoiceSettingsProvider } from './components/VoiceSettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import audioManager from './services/audioManager';
import { authService, clearStoredAuth, wakeBackend } from './services/api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import FacilityLogin from './pages/FacilityLogin';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TherapistDashboard from './pages/TherapistDashboard';
import TherapySelection from './pages/TherapySelection';
import PhysicalTherapy from './pages/PhysicalTherapy';
import GaitAnalysis from './pages/GaitAnalysis';
import GaitRecording from './pages/GaitRecording';
import GaitProblems from './pages/GaitProblems';
import ExercisePlans from './pages/ExercisePlans';
import DetectionProblems from './pages/DetectionProblems';
import ExerciseRecommendations from './pages/ExerciseRecommendations';
import SpeechTherapy from './pages/SpeechTherapy';
import ArticulationTherapy from './pages/ArticulationTherapy';
import ArticulationExercise from './pages/ArticulationExercise';
import LanguageTherapy from './pages/LanguageTherapy';
import FluencyTherapy from './pages/FluencyTherapy';
import HealthLogs from './pages/HealthLogs';
import Appointments from './pages/Appointments';
import Prediction from './pages/Prediction';
import Prescription from './pages/Prescription';
import Profile from './pages/Profile';
import SuccessStoryPage from './pages/SuccessStoryPage';
import Diagnostic from './pages/Diagnostic';
import { images } from './assets/images';
import './App.css';

const SPLASH_MIN_DURATION_MS = 3000;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSplashReady, setIsSplashReady] = useState(false);

  const loading = !isAuthReady || !isSplashReady;

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setIsSplashReady(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => {
      window.clearTimeout(splashTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      wakeBackend();

      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (!token || !user) {
        if (isMounted) {
          setIsAuthReady(true);
        }
        return;
      }

      try {
        await authService.getMe();
        if (!isMounted) return;

        setIsAuthenticated(true);
        try {
          const userData = JSON.parse(user);
          setUserRole(userData.role);
        } catch (error) {
          console.error('Error parsing user data:', error);
          await clearStoredAuth();
          if (!isMounted) return;
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        await clearStoredAuth();
        if (!isMounted) return;
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const handleFacilityExit = () => {
    const therapistToken = localStorage.getItem('therapistToken');
    const therapistUser = localStorage.getItem('therapistUser');
    if (therapistToken && therapistUser) {
      localStorage.setItem('token', therapistToken);
      localStorage.setItem('user', therapistUser);
    }
    localStorage.removeItem('facilityMode');
    localStorage.removeItem('therapistToken');
    localStorage.removeItem('therapistUser');
    handleLogin();
  };

  const handleLogout = async () => {
    // Immediately stop any active Azure/Web Speech TTS or audio playback
    audioManager.stopAll();

    await clearStoredAuth();

    // Clear gait analysis result
    localStorage.removeItem('gaitAnalysisResult');

    // Update app state
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loading) {
    return (
      <div className="loading-splash" role="status" aria-live="polite" aria-busy="true">
        <span className="loading-splash-sr">Loading CVAPed</span>
        <img src={images.logo} alt="" aria-hidden="true" className="loading-splash-logo" />
      </div>
    );
  }

  // Component to handle role-based redirect
  const RoleBasedRedirect = () => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (userRole === 'admin') return <Navigate to="/admin" />;
    if (userRole === 'therapist') return <Navigate to="/therapist" />;
    return <Navigate to="/therapy-selection" />;
  };

  return (
    <ErrorBoundary>
    <ToastProvider>
      <VoiceSettingsProvider>
      <TherapyCategoryProvider>
        <Router>
          <div className="App">
            <Routes>
            <Route 
              path="/" 
              element={<Landing />} 
            />
            <Route 
              path="/home" 
              element={<Landing />} 
            />
            <Route 
              path="/success-story/:storyId" 
              element={<SuccessStoryPage />} 
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <RoleBasedRedirect /> : <Login onLogin={handleLogin} />
              } 
            />
            <Route
              path="/facility-login"
              element={<FacilityLogin onLogin={handleLogin} />}
            />
            <Route 
              path="/register" 
              element={
                isAuthenticated ? <RoleBasedRedirect /> : <Register onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/complete-profile" 
              element={
                isAuthenticated ? <CompleteProfile onLogin={handleLogin} /> : <Navigate to="/register" />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? <RoleBasedRedirect /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/admin" 
              element={
                isAuthenticated && userRole === 'admin' ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route
              path="/therapist"
              element={
                isAuthenticated && userRole === 'therapist' ? <TherapistDashboard onLogout={handleLogout} /> : <Navigate to="/login" />
              }
            />
            <Route 
              path="/therapy-selection" 
              element={
                isAuthenticated ? <TherapySelection onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/physical-therapy" 
              element={
                isAuthenticated ? <PhysicalTherapy onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/gait-analysis" 
              element={
                isAuthenticated ? <GaitAnalysis onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/gait-recording" 
              element={
                isAuthenticated ? <GaitRecording onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/gait-problems" 
              element={
                isAuthenticated ? <GaitProblems onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/exercise-plans" 
              element={
                isAuthenticated ? <ExercisePlans onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route
              path="/detection-problems"
              element={
                isAuthenticated ? <DetectionProblems onLogout={handleLogout} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/exercise-recommendations"
              element={
                isAuthenticated ? <ExerciseRecommendations onLogout={handleLogout} /> : <Navigate to="/login" />
              }
            />
            <Route 
              path="/speech-therapy" 
              element={
                isAuthenticated ? <SpeechTherapy onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/articulation" 
              element={
                isAuthenticated ? <ArticulationTherapy onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/articulation/:soundId" 
              element={
                isAuthenticated ? <ArticulationExercise onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/language-therapy" 
              element={
                isAuthenticated ? <LanguageTherapy onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/fluency-therapy" 
              element={
                isAuthenticated ? <FluencyTherapy onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/health-logs" 
              element={
                isAuthenticated ? <HealthLogs onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/appointments" 
              element={
                isAuthenticated ? <Appointments onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/prediction" 
              element={
                isAuthenticated ? <Prediction onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/prescription" 
              element={
                isAuthenticated ? <Prescription onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/profile" 
              element={
                isAuthenticated ? <Profile onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              } 
            />
            <Route
              path="/diagnostic"
              element={
                isAuthenticated ? <Diagnostic onLogout={handleLogout} onFacilityExit={handleFacilityExit} /> : <Navigate to="/login" />
              }
            />
          </Routes>
        </div>
      </Router>
      </TherapyCategoryProvider>
      </VoiceSettingsProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
