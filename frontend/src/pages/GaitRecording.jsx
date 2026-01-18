import React, { useEffect } from 'react';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './GaitRecording.css';

function GaitRecording({ onLogout }) {
  const { selectCategory } = useTherapyCategory();

  useEffect(() => {
    selectCategory('physical');
  }, [selectCategory]);

  return (
    <div className="blank-page">
      <Header onLogout={onLogout} />
      <main className="blank-page-content">
        <div className="gait-recording-container">
          <div className="recording-header">
            <h1>
              <i className="fas fa-walking"></i>
              Gait Recording Session
            </h1>
            <p>Position yourself and click start when ready</p>
          </div>

          <div className="skeleton-display">
            <div className="skeleton-wrapper">
              {/* Head */}
              <div className="skeleton-head"></div>
              
              {/* Torso */}
              <div className="skeleton-torso"></div>
              
              {/* Left Waist Sensor */}
              <div className="sensor-point left-waist" data-label="LW">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Left Waist</span>
              </div>
              
              {/* Right Waist Sensor */}
              <div className="sensor-point right-waist" data-label="RW">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Right Waist</span>
              </div>
              
              {/* Left Leg */}
              <div className="skeleton-leg left">
                <div className="thigh"></div>
                <div className="shin"></div>
              </div>
              
              {/* Right Leg */}
              <div className="skeleton-leg right">
                <div className="thigh"></div>
                <div className="shin"></div>
              </div>
              
              {/* Left Knee Sensor */}
              <div className="sensor-point left-knee" data-label="LK">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Left Knee</span>
              </div>
              
              {/* Right Knee Sensor */}
              <div className="sensor-point right-knee" data-label="RK">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Right Knee</span>
              </div>
              
              {/* Left Ankle Sensor */}
              <div className="sensor-point left-ankle" data-label="LA">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Left Ankle</span>
              </div>
              
              {/* Right Ankle Sensor */}
              <div className="sensor-point right-ankle" data-label="RA">
                <div className="sensor-pulse"></div>
                <span className="sensor-label">Right Ankle</span>
              </div>
              
              {/* Left Foot */}
              <div className="skeleton-foot left"></div>
              
              {/* Right Foot */}
              <div className="skeleton-foot right"></div>
            </div>
          </div>

          <div className="recording-controls">
            <button className="control-btn start-btn">
              <i className="fas fa-play"></i>
              Start Recording
            </button>
            <button className="control-btn stop-btn" disabled>
              <i className="fas fa-stop"></i>
              Stop Recording
            </button>
          </div>

          <div className="sensor-legend">
            <h3>Active Sensors (6)</h3>
            <div className="legend-grid">
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Left Waist (LW)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Right Waist (RW)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Left Knee (LK)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Right Knee (RK)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Left Ankle (LA)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot"></div>
                <span>Right Ankle (RA)</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default GaitRecording;
