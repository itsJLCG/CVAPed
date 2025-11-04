import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import TherapySelection from './pages/TherapySelection';
import PhysicalTherapy from './pages/PhysicalTherapy';
import SpeechTherapy from './pages/SpeechTherapy';
import ArticulationTherapy from './pages/ArticulationTherapy';
import ArticulationExercise from './pages/ArticulationExercise';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/therapy-selection" /> : <Landing />} 
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/therapy-selection" /> : <Login onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/register" 
              element={
                isAuthenticated ? <Navigate to="/therapy-selection" /> : <Register onLogin={handleLogin} />
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
                isAuthenticated ? <Navigate to="/therapy-selection" /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/therapy-selection" 
              element={
                isAuthenticated ? <TherapySelection onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/physical-therapy" 
              element={
                isAuthenticated ? <PhysicalTherapy onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/speech-therapy" 
              element={
                isAuthenticated ? <SpeechTherapy onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/articulation" 
              element={
                isAuthenticated ? <ArticulationTherapy onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/articulation/:soundId" 
              element={
                isAuthenticated ? <ArticulationExercise onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
