import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = authService.getStoredUser();
      setUser(storedUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.info('Logged out successfully. See you soon!');
    onLogout();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>CVACare</h1>
            <p>Physical & Speech Therapy</p>
          </div>
          <div className="navbar-menu">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <button className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back, {user?.firstName}! 👋</h2>
          <p className="user-type-badge">
            Role: <span className="badge">{user?.role}</span>
          </p>
        </div>

        <div className="info-cards">
          <div className="info-card card-primary">
            <div className="card-icon">🏥</div>
            <h3>Physical Therapy</h3>
            <p>Specialized care for stroke patients with comprehensive rehabilitation programs</p>
          </div>

          <div className="info-card card-secondary">
            <div className="card-icon">💬</div>
            <h3>Speech Therapy</h3>
            <p>Pediatric speech therapy services for children's communication development</p>
          </div>

          <div className="info-card card-accent">
            <div className="card-icon">📊</div>
            <h3>Progress Tracking</h3>
            <p>Monitor patient progress and therapy outcomes with detailed analytics</p>
          </div>
        </div>

        <div className="user-info-section">
          <h3>Your Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{user?.role}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value status-active">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
