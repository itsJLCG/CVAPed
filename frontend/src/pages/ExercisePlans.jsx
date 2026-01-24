import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './ExercisePlans.css';

function ExercisePlans({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="exercise-plans-page">
      <Header onLogout={onLogout} />
      
      <main className="exercise-plans-main">
        <div className="coming-soon-container">
          <div className="coming-soon-content">
            <div className="coming-soon-icon">
              <i className="fas fa-dumbbell"></i>
            </div>
            
            <h1>Exercise Plans</h1>
            <h2>Coming Soon</h2>
            
            <p className="coming-soon-description">
              We're working on personalized exercise plans based on your gait analysis results. 
              This feature will provide targeted exercises to improve your mobility and address 
              detected gait problems.
            </p>
            
            <div className="features-preview">
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Personalized exercise recommendations</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Video demonstrations</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Progress tracking</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-check-circle"></i>
                <span>Difficulty levels</span>
              </div>
            </div>
            
            <button 
              className="back-btn"
              onClick={() => navigate(-1)}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Results
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ExercisePlans;
