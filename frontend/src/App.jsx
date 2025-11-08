import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TherapistDashboard from './pages/TherapistDashboard';
import TherapySelection from './pages/TherapySelection';
import PhysicalTherapy from './pages/PhysicalTherapy';
import SpeechTherapy from './pages/SpeechTherapy';
import ArticulationTherapy from './pages/ArticulationTherapy';
import ArticulationExercise from './pages/ArticulationExercise';
import LanguageTherapy from './pages/LanguageTherapy';
import FluencyTherapy from './pages/FluencyTherapy';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    setLoading(false);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Component to handle role-based redirect
  const RoleBasedRedirect = () => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (userRole === 'admin') return <Navigate to="/admin" />;
    if (userRole === 'therapist') return <Navigate to="/therapist" />;
    return <Navigate to="/therapy-selection" />;
  };

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/" 
              element={<RoleBasedRedirect />} 
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <RoleBasedRedirect /> : <Login onLogin={handleLogin} />
              } 
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
            <Route 
              path="/language-therapy" 
              element={
                isAuthenticated ? <LanguageTherapy onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/fluency-therapy" 
              element={
                isAuthenticated ? <FluencyTherapy onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/profile" 
              element={
                isAuthenticated ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />
              } 
            />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
