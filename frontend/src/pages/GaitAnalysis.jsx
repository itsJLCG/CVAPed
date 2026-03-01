import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './GaitAnalysis.css';
import bodyFullImage from '../assets/body-full.png';
import soleLeftImage from '../assets/sole-left.png';
import soleRightImage from '../assets/sole-right.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function GaitAnalysis({ onLogout }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selectCategory } = useTherapyCategory();

  // Ensure the category is set to 'physical' when this page is loaded
  useEffect(() => {
    selectCategory('physical');
  }, [selectCategory]);

  const [sensorData, setSensorData] = useState({});
  const [isActive, setIsActive] = useState(false);
  const lastUpdateRef = useRef(Date.now());
  const lastFSRValuesRef = useRef({});
  const previousStatusRef = useRef(false);

  // Fetch sensor data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/wearable/data`);
        if (response.ok) {
          const data = await response.json();
          setSensorData(data);
          lastUpdateRef.current = Date.now();
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    // Fetch data every second
    const interval = setInterval(fetchData, 1000);
    fetchData(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  // Update status based on data freshness
  useEffect(() => {
    const checkStatus = () => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      const newStatus = timeSinceUpdate < 2000;
      
      // Show toast only when status changes
      if (newStatus !== previousStatusRef.current) {
        if (newStatus) {
          showToast('System Active - Receiving Data', 'success');
        } else {
          showToast('Waiting for Sensor Data...', 'info');
        }
        previousStatusRef.current = newStatus;
      }
      
      setIsActive(newStatus);
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [showToast]);

  // Helper function to determine FSR sensor class
  const getFSRClass = (voltage, side, sensor) => {
    const sensorKey = `${side}-${sensor}`;
    const lastValue = lastFSRValuesRef.current[sensorKey];

    let className = 'fsr-sensor';

    // High voltage = no pressure (red)
    if (voltage > 2.5) {
      className += ' low';
    }
    // Low voltage = pressure detected
    else if (voltage < 0.8) {
      // If value changed from last reading, show orange, otherwise green
      if (lastValue !== undefined && Math.abs(lastValue - voltage) > 0.1) {
        className += ' medium';
      } else {
        className += ' high';
      }
    }
    // Medium voltage
    else {
      className += ' medium';
    }

    lastFSRValuesRef.current[sensorKey] = voltage;
    return className;
  };

  // Check if MPU sensor has data
  const hasMPUData = (data) => {
    return data && (data.ax !== undefined || data.gx !== undefined);
  };

  // Render MPU tooltip content
  const renderMPUTooltip = (data) => {
    if (!hasMPUData(data)) {
      return <div className="sensor-tooltip">No Data</div>;
    }

    return (
      <div className="sensor-tooltip">
        <div className="tooltip-section">
          <strong>Accelerometer</strong>
          <div>X: {data.ax?.toFixed(2) || '0.00'}</div>
          <div>Y: {data.ay?.toFixed(2) || '0.00'}</div>
          <div>Z: {data.az?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="tooltip-section">
          <strong>Gyroscope</strong>
          <div>X: {data.gx?.toFixed(2) || '0.00'}</div>
          <div>Y: {data.gy?.toFixed(2) || '0.00'}</div>
          <div>Z: {data.gz?.toFixed(2) || '0.00'}</div>
        </div>
      </div>
    );
  };

  // Render MPU sensor data panel
  const renderMPUData = (data, title) => {
    if (!hasMPUData(data)) {
      return <div className="data-label">No Data</div>;
    }

    return (
      <>
        <div className="data-label">Accelerometer</div>
        <div className="data-grid">
          <div className="data-value">X: {data.ax?.toFixed(2) || '0.00'}</div>
          <div className="data-value">Y: {data.ay?.toFixed(2) || '0.00'}</div>
          <div className="data-value">Z: {data.az?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="data-label">Gyroscope</div>
        <div className="data-grid">
          <div className="data-value">X: {data.gx?.toFixed(2) || '0.00'}</div>
          <div className="data-value">Y: {data.gy?.toFixed(2) || '0.00'}</div>
          <div className="data-value">Z: {data.gz?.toFixed(2) || '0.00'}</div>
        </div>
      </>
    );
  };

  // Render FSR tooltip
  const renderFSRTooltip = (voltage, position) => {
    if (voltage === undefined) {
      return (
        <div className="sensor-tooltip">
          <strong>{position}</strong>
          <div>No Data</div>
        </div>
      );
    }

    const pressureStatus = voltage > 2.5 ? 'No Pressure' : voltage < 0.8 ? 'High Pressure' : 'Medium Pressure';
    
    return (
      <div className="sensor-tooltip">
        <strong>{position}</strong>
        <div>Voltage: {voltage.toFixed(2)}V</div>
        <div>Status: {pressureStatus}</div>
      </div>
    );
  };

  return (
    <div className="gait-analysis-page">
      {/* Header */}
      <Header onLogout={onLogout} />

      {/* Gait Analysis Header */}
      <div className="gait-header">
        <h1>Gait Analysis Monitoring System</h1>
        <button className="start-gait-btn" onClick={() => navigate('/gait-recording')}>
          <i className="fas fa-play"></i>
          Start Gait Analysis Now
        </button>
      </div>

      {/* Main Sensor Display */}
      <div className="gait-container">
        {/* Left Foot Panel */}
        <div className="gait-panel">
          <div className="panel-title">Left Foot Pressure</div>
          <div className="foot-container">
            <img src={soleLeftImage} alt="Left Foot" className="foot-image" />
            <div
              className={sensorData.LEFT_FOOT_FSR && sensorData.LEFT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.LEFT_FOOT_FSR[0], 'left', 'toe') 
                : 'fsr-sensor low'}
              style={{ top: '30%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.LEFT_FOOT_FSR?.[0], 'Left Toe')}
            </div>
            <div
              className={sensorData.LEFT_FOOT_FSR && sensorData.LEFT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.LEFT_FOOT_FSR[1], 'left', 'mid') 
                : 'fsr-sensor low'}
              style={{ top: '55%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.LEFT_FOOT_FSR?.[1], 'Left Mid')}
            </div>
            <div
              className={sensorData.LEFT_FOOT_FSR && sensorData.LEFT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.LEFT_FOOT_FSR[2], 'left', 'heel') 
                : 'fsr-sensor low'}
              style={{ top: '80%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.LEFT_FOOT_FSR?.[2], 'Left Heel')}
            </div>
          </div>
          <div className="sensor-label">LEFT_FSR Sensors</div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot low"></div>
              <span>Low (&lt;0.8V)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot medium"></div>
              <span>Medium</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot high"></div>
              <span>High (&gt;2.5V)</span>
            </div>
          </div>
        </div>

        {/* Center Body Panel */}
        <div className="gait-panel">
          <div className="panel-title">MPU6050 Sensor Positions</div>
          <div className="body-container">
            <img src={bodyFullImage} alt="Body Outline" className="body-image" />
            <div
              className={`sensor-indicator sensor-left-waist ${hasMPUData(sensorData.LEFT_WAIST) ? 'active' : ''}`}
              title="Left Waist"
            >
              LW
              {renderMPUTooltip(sensorData.LEFT_WAIST)}
            </div>
            <div
              className={`sensor-indicator sensor-right-waist ${hasMPUData(sensorData.RIGHT_WAIST) ? 'active' : ''}`}
              title="Right Waist"
            >
              RW
              {renderMPUTooltip(sensorData.RIGHT_WAIST)}
            </div>
            <div
              className={`sensor-indicator sensor-left-knee ${hasMPUData(sensorData.LEFT_KNEE) ? 'active' : ''}`}
              title="Left Knee"
            >
              LK
              {renderMPUTooltip(sensorData.LEFT_KNEE)}
            </div>
            <div
              className={`sensor-indicator sensor-right-knee ${hasMPUData(sensorData.RIGHT_KNEE) ? 'active' : ''}`}
              title="Right Knee"
            >
              RK
              {renderMPUTooltip(sensorData.RIGHT_KNEE)}
            </div>
            <div
              className={`sensor-indicator sensor-left-ankle ${hasMPUData(sensorData.LEFT_ANKLE) ? 'active' : ''}`}
              title="Left Ankle"
            >
              LA
              {renderMPUTooltip(sensorData.LEFT_ANKLE)}
            </div>
            <div
              className={`sensor-indicator sensor-right-ankle ${hasMPUData(sensorData.RIGHT_ANKLE) ? 'active' : ''}`}
              title="Right Ankle"
            >
              RA
              {renderMPUTooltip(sensorData.RIGHT_ANKLE)}
            </div>
          </div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot inactive"></div>
              <span>No Detection</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot active"></div>
              <span>Detected</span>
            </div>
          </div>
        </div>

        {/* Right Foot Panel */}
        <div className="gait-panel">
          <div className="panel-title">Right Foot Pressure</div>
          <div className="foot-container">
            <img src={soleRightImage} alt="Right Foot" className="foot-image" />
            <div
              className={sensorData.RIGHT_FOOT_FSR && sensorData.RIGHT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.RIGHT_FOOT_FSR[0], 'right', 'toe') 
                : 'fsr-sensor low'}
              style={{ top: '30%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.RIGHT_FOOT_FSR?.[0], 'Right Toe')}
            </div>
            <div
              className={sensorData.RIGHT_FOOT_FSR && sensorData.RIGHT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.RIGHT_FOOT_FSR[1], 'right', 'mid') 
                : 'fsr-sensor low'}
              style={{ top: '55%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.RIGHT_FOOT_FSR?.[1], 'Right Mid')}
            </div>
            <div
              className={sensorData.RIGHT_FOOT_FSR && sensorData.RIGHT_FOOT_FSR.length >= 3 
                ? getFSRClass(sensorData.RIGHT_FOOT_FSR[2], 'right', 'heel') 
                : 'fsr-sensor low'}
              style={{ top: '80%', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}
            >
              {renderFSRTooltip(sensorData.RIGHT_FOOT_FSR?.[2], 'Right Heel')}
            </div>
          </div>
          <div className="sensor-label">RIGHT_FSR Sensors</div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot low"></div>
              <span>Low (&lt;0.8V)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot medium"></div>
              <span>Medium</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot high"></div>
              <span>High (&gt;2.5V)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GaitAnalysis;
