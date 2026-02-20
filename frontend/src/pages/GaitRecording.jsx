import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './GaitRecording.css';

function GaitRecording({ onLogout }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sensorStatus, setSensorStatus] = useState('disconnected'); // 'disconnected', 'connected', 'recording'
  const [stepCount, setStepCount] = useState(0);
  const [leftFootActive, setLeftFootActive] = useState(false);
  const [rightFootActive, setRightFootActive] = useState(false);
  // Load analysis result from localStorage on mount
  const [analysisResult, setAnalysisResult] = useState(() => {
    const saved = localStorage.getItem('gaitAnalysisResult');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  
  // Data buffers
  const sensorBuffer = useRef({
    LEFT_WAIST: [],
    RIGHT_WAIST: [],
    LEFT_KNEE: [],
    RIGHT_KNEE: [],
    LEFT_ANKLE: [],
    RIGHT_ANKLE: [],
    LEFT_TOE: [],
    RIGHT_TOE: []
  });
  
  const fsrBuffer = useRef({
    LEFT_HEEL: [],
    LEFT_MID: [],
    LEFT_TOE: [],
    RIGHT_HEEL: [],
    RIGHT_MID: [],
    RIGHT_TOE: []
  });
  
  const timerRef = useRef(null);
  const pollingRef = useRef(null);
  const lastDataTimeRef = useRef(Date.now());
  const isRecordingRef = useRef(false);  // Track recording state for interval callback
  const lastLeftHeelPressure = useRef(null);  // Will be set on first reading
  const lastRightHeelPressure = useRef(null); // Will be set on first reading

  useEffect(() => {
    selectCategory('physical');
    
    // Start polling backend for sensor data
    checkSensorConnection();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectCategory]);

  const checkSensorConnection = async () => {
    // Poll backend every 500ms to check if ESP32 is sending data
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:5000/api/wearable/data');
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          // Data is being received from ESP32
          if (!isRecordingRef.current) {
            setSensorStatus('connected');
          }
          setError(null);
          lastDataTimeRef.current = Date.now();
          
          // If recording, buffer the data
          if (isRecordingRef.current) {
            handleSensorData(data);
          }
        } else {
          // No data for 3 seconds = disconnected
          if (Date.now() - lastDataTimeRef.current > 3000) {
            setSensorStatus('disconnected');
          }
        }
      } catch (err) {
        console.error('Failed to fetch sensor data:', err);
        if (Date.now() - lastDataTimeRef.current > 3000) {
          setSensorStatus('disconnected');
          setError('Cannot connect to backend. Make sure backend server is running.');
        }
      }
    }, 500); // Poll every 500ms
  };

  const handleSensorData = (data) => {
    // Use ref to check recording state (avoids stale closure)
    if (!isRecordingRef.current) {
      console.log('⏸️ Not recording, skipping data buffer');
      return;
    }
    
    const timestamp = Date.now();
    
    // Buffer IMU data - map backend structure to frontend structure
    const sensorMapping = {
      'LEFT_WAIST': 'LEFT_WAIST',
      'RIGHT_WAIST': 'RIGHT_WAIST',
      'LEFT_KNEE': 'LEFT_KNEE',
      'RIGHT_KNEE': 'RIGHT_KNEE',
      'LEFT_ANKLE': 'LEFT_ANKLE',
      'RIGHT_ANKLE': 'RIGHT_ANKLE',
      'LEFT_TOE': 'LEFT_TOE',
      'RIGHT_TOE': 'RIGHT_TOE'
    };
    
    let bufferedCount = 0;
    Object.keys(sensorMapping).forEach(sensor => {
      if (data[sensor] && sensorBuffer.current[sensor]) {
        sensorBuffer.current[sensor].push({
          timestamp: timestamp,
          ax: data[sensor].ax || 0,
          ay: data[sensor].ay || 0,
          az: data[sensor].az || 0,
          gx: data[sensor].gx || 0,
          gy: data[sensor].gy || 0,
          gz: data[sensor].gz || 0
        });
        bufferedCount++;
      }
    });
    
    // Log buffering progress every 20 samples
    const totalBuffered = sensorBuffer.current.LEFT_KNEE?.length || 0;
    if (totalBuffered > 0 && totalBuffered % 20 === 0) {
      console.log(`📊 Buffered ${totalBuffered} samples, ${bufferedCount} sensors active`);
    }
    
    // Buffer FSR data - handle both object and array formats
    if (data.LEFT_FOOT_FSR) {
      let heel, mid, toe;
      if (Array.isArray(data.LEFT_FOOT_FSR)) {
        // Array format: [toe, mid, heel]
        [toe, mid, heel] = data.LEFT_FOOT_FSR;
      } else if (typeof data.LEFT_FOOT_FSR === 'object') {
        // Object format: {heel, mid, toe}
        heel = data.LEFT_FOOT_FSR.heel;
        mid = data.LEFT_FOOT_FSR.mid;
        toe = data.LEFT_FOOT_FSR.toe;
      }
      if (fsrBuffer.current.LEFT_HEEL) fsrBuffer.current.LEFT_HEEL.push(heel || 0);
      if (fsrBuffer.current.LEFT_MID) fsrBuffer.current.LEFT_MID.push(mid || 0);
      if (fsrBuffer.current.LEFT_TOE) fsrBuffer.current.LEFT_TOE.push(toe || 0);
      
      // Initialize on first reading
      if (lastLeftHeelPressure.current === null) {
        lastLeftHeelPressure.current = heel;
        console.log(`🔵 LEFT heel baseline: ${heel.toFixed(2)}V`);
      } else {
        // Detect LEFT heel strike using PRESSURE CHANGE
        // FSR is inverted: high voltage = no pressure, low voltage = pressure
        // Detect step when voltage DROPS significantly (pressure increases)
        const voltageDrop = lastLeftHeelPressure.current - heel;  // Positive = pressure increased
        const STEP_THRESHOLD = 0.2;  // Reduced threshold for better sensitivity
        
        if (voltageDrop > STEP_THRESHOLD) {
          setStepCount(prev => prev + 1);
          setLeftFootActive(true);
          setTimeout(() => setLeftFootActive(false), 300); // Visual feedback for 300ms
          console.log(`👣 LEFT STEP #${stepCount + 1}! ${lastLeftHeelPressure.current.toFixed(2)}V → ${heel.toFixed(2)}V (Δ${voltageDrop.toFixed(2)}V)`);
          lastLeftHeelPressure.current = heel;
        } else if (heel > lastLeftHeelPressure.current + 0.15) {
          // Foot lifted (voltage increased), update baseline
          lastLeftHeelPressure.current = heel;
        }
      }
    }
    
    // RIGHT foot FSR data - handle both object and array formats
    if (data.RIGHT_FOOT_FSR) {
      let heel, mid, toe;
      if (Array.isArray(data.RIGHT_FOOT_FSR)) {
        // Array format: [toe, mid, heel]
        [toe, mid, heel] = data.RIGHT_FOOT_FSR;
      } else if (typeof data.RIGHT_FOOT_FSR === 'object') {
        // Object format: {heel, mid, toe}
        heel = data.RIGHT_FOOT_FSR.heel;
        mid = data.RIGHT_FOOT_FSR.mid;
        toe = data.RIGHT_FOOT_FSR.toe;
      }
      if (fsrBuffer.current.RIGHT_HEEL) fsrBuffer.current.RIGHT_HEEL.push(heel || 0);
      if (fsrBuffer.current.RIGHT_MID) fsrBuffer.current.RIGHT_MID.push(mid || 0);
      if (fsrBuffer.current.RIGHT_TOE) fsrBuffer.current.RIGHT_TOE.push(toe || 0);
      
      // Initialize on first reading
      if (lastRightHeelPressure.current === null) {
        lastRightHeelPressure.current = heel;
        console.log(`🔵 RIGHT heel baseline: ${heel.toFixed(2)}V`);
      } else {
        // Detect RIGHT heel strike using PRESSURE CHANGE
        const voltageDrop = lastRightHeelPressure.current - heel;  // Positive = pressure increased
        const STEP_THRESHOLD = 0.2;  // Reduced threshold for better sensitivity
        
        if (voltageDrop > STEP_THRESHOLD) {
          setStepCount(prev => prev + 1);
          setRightFootActive(true);
          setTimeout(() => setRightFootActive(false), 300); // Visual feedback for 300ms
          console.log(`👣 RIGHT STEP #${stepCount + 1}! ${lastRightHeelPressure.current.toFixed(2)}V → ${heel.toFixed(2)}V (Δ${voltageDrop.toFixed(2)}V)`);
          lastRightHeelPressure.current = heel;
        } else if (heel > lastRightHeelPressure.current + 0.15) {
          // Foot lifted (voltage increased), update baseline
          lastRightHeelPressure.current = heel;
        }
      }
    }
  };

  const startRecording = () => {
    if (sensorStatus !== 'connected') {
      setError('ESP32 not connected. Please connect hardware first.');
      return;
    }
    
    // Clear buffers
    Object.keys(sensorBuffer.current).forEach(key => {
      sensorBuffer.current[key] = [];
    });
    Object.keys(fsrBuffer.current).forEach(key => {
      fsrBuffer.current[key] = [];
    });
    
    setIsRecording(true);
    isRecordingRef.current = true;  // Update ref immediately for interval callback
    setSensorStatus('recording');
    setRecordingTime(0);
    setStepCount(0);
    setError(null);
    setAnalysisResult(null);
    localStorage.removeItem('gaitAnalysisResult'); // Clear previous analysis from localStorage
    setLeftFootActive(false);
    setRightFootActive(false);
    
    // Reset FSR references to null so first reading initializes them
    lastLeftHeelPressure.current = null;
    lastRightHeelPressure.current = null;
    
    console.log('🎬 Recording started - waiting for steps...');
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;  // Update ref immediately for interval callback
    setSensorStatus('connected');
    clearInterval(timerRef.current);
    
    // Check if recording is less than 30 seconds
    if (recordingTime < 30) {
      setError(`Recording too short. You recorded for ${recordingTime} seconds. Please record for at least 30 seconds for accurate analysis.`);
      return;
    }
    
    // Check if we have enough data - use first available sensor
    const activeSensors = Object.keys(sensorBuffer.current).filter(key => sensorBuffer.current[key].length > 0);
    const totalDataPoints = activeSensors.length > 0 ? sensorBuffer.current[activeSensors[0]].length : 0;
    console.log('\n' + '='.repeat(60));
    console.log('📊 RECORDING STOPPED - DATA SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Recording duration: ${recordingTime} seconds`);
    console.log(`👣 Steps counted: ${stepCount}`);
    console.log(`📦 Sensor data collected:`);
    Object.keys(sensorBuffer.current).forEach(sensor => {
      console.log(`   ${sensor}: ${sensorBuffer.current[sensor].length} samples`);
    });
    console.log(`📦 FSR data collected:`);
    Object.keys(fsrBuffer.current).forEach(sensor => {
      console.log(`   ${sensor}: ${fsrBuffer.current[sensor].length} samples`);
    });
    console.log('='.repeat(60) + '\n');
    
    if (totalDataPoints < 50) {
      setError(`Not enough sensor data. Only ${totalDataPoints} data points collected. Make sure sensors are properly connected and record for at least 30 seconds.`);
      return;
    }
    
    // Send data to backend for analysis
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 Sending data to backend for analysis...');
      
      const response = await fetch('http://localhost:5000/api/hardware/gait/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sensors: sensorBuffer.current,
          fsr: fsrBuffer.current
        })
      });
      
      const result = await response.json();
      console.log('📥 Backend response:', result);
      
      if (result.success) {
        console.log('✅ Gait analysis successful!');
        console.log('📍 Saved to MongoDB with ID:', result.gait_id);
        // Save to both state and localStorage
        setAnalysisResult(result.data);
        localStorage.setItem('gaitAnalysisResult', JSON.stringify(result.data));
        setError(null);
      } else {
        console.error('❌ Analysis failed:', result.message);
        setError(result.message || 'Analysis failed');
      }
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(`Failed to analyze gait data: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

          {/* Two-Column Layout for Disconnected State */}
          {sensorStatus === 'disconnected' && !isAnalyzing && !analysisResult && (
            <div className="disconnected-grid">
              {/* Connection Status Card - Clean Design */}
              <div className="connection-status-card disconnected">
                <div className="status-icon">
                  <i className="fas fa-plug"></i>
                </div>
                <h2>Hardware Not Connected</h2>
                <p className="status-message">Waiting for ESP32 wearable sensors...</p>
                
                <div className="connection-steps">
                  <div className="step">
                    <i className="fas fa-check-circle"></i>
                    <span>Make sure ESP32 is powered on</span>
                  </div>
                  <div className="step">
                    <i className="fas fa-check-circle"></i>
                    <span>Check that sensors are properly attached</span>
                  </div>
                  <div className="step">
                    <i className="fas fa-check-circle"></i>
                    <span>Verify backend server is running</span>
                  </div>
                </div>
                
                <div className="waiting-indicator">
                  <div className="pulse-dot"></div>
                  <span>Scanning for hardware...</span>
                </div>
              </div>

              {/* Hardware Setup Info */}
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <i className="fas fa-microchip"></i>
                </div>
                <h2>Hardware Setup Required</h2>
                <p>Connect your wearable sensors to begin gait analysis.</p>
                
                <div className="hardware-list">
                  <div className="hardware-item">
                    <i className="fas fa-check-circle"></i>
                    <span>6 × MPU6050 IMU Sensors (Accelerometer + Gyroscope)</span>
                  </div>
                  <div className="hardware-item">
                    <i className="fas fa-check-circle"></i>
                    <span>6 × FSR Pressure Sensors (Force Sensitive Resistors)</span>
                  </div>
                  <div className="hardware-item">
                    <i className="fas fa-check-circle"></i>
                    <span>ESP32 Microcontroller (WiFi + Bluetooth)</span>
                  </div>
                </div>

                <div className="setup-info">
                  <h3>Sensor Placement:</h3>
                  <ul>
                    <li><strong>Left Waist & Right Waist</strong> - Hip/waist area (optional)</li>
                    <li><strong>Left Knee & Right Knee</strong> - Knee joints</li>
                    <li><strong>Left Ankle & Right Ankle</strong> - Ankle area</li>
                    <li><strong>Left Toe & Right Toe</strong> - Toe/foot area (optional)</li>
                    <li><strong>FSR Sensors</strong> - 3 per foot (heel, mid, toe)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sensor Status - Only show when connected or recording */}
          {sensorStatus !== 'disconnected' && (
            <div className={`sensor-status ${sensorStatus}`}>
              <div className="status-indicator">
                <i className={`fas fa-circle ${sensorStatus === 'connected' || sensorStatus === 'recording' ? 'connected' : ''}`}></i>
                <span>
                  {sensorStatus === 'connected' && 'ESP32 Connected - Ready to record'}
                  {sensorStatus === 'recording' && 'Recording In Progress'}
                </span>
              </div>
            </div>
          )}

          {/* Error message - only show during recording/analysis issues */}
          {error && (isRecording || isAnalyzing || analysisResult) && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {/* Recording Controls - Only show when connected */}
          {sensorStatus !== 'disconnected' && !analysisResult && (
            <div className="recording-controls-enhanced">
              {/* Live Statistics Card */}
              <div className="stats-card">
                <div className="stats-header">
                  <i className="fas fa-chart-line"></i>
                  <h3>Live Gait Statistics</h3>
                </div>
                
                <div className="stats-grid">
                  {/* Recording Time */}
                  <div className="stat-box">
                    <div className={`stat-icon time-icon ${recordingTime >= 30 ? 'time-ready' : ''}`}>
                      <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{formatTime(recordingTime)}</div>
                      <div className="stat-label">
                        {recordingTime < 30 ? 'Recording Time' : 'Ready to Analyze!'}
                      </div>
                    </div>
                  </div>

                  {/* Step Count with Footprints */}
                  <div className="stat-box step-count-box">
                    <div className="footprints-container">
                      <div className={`footprint left-foot ${leftFootActive ? 'active' : ''}`}>
                        <i className="fas fa-shoe-prints"></i>
                        <span className="foot-label">L</span>
                      </div>
                      <div className={`footprint right-foot ${rightFootActive ? 'active' : ''}`}>
                        <i className="fas fa-shoe-prints"></i>
                        <span className="foot-label">R</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="control-card">
                <div className="control-header">
                  <i className="fas fa-sliders-h"></i>
                  <h3>Recording Control</h3>
                </div>
                
                <div className="control-body">
                  {!isRecording ? (
                    <>
                      <button 
                        className="control-btn start-btn"
                        onClick={startRecording}
                        disabled={sensorStatus !== 'connected' || isAnalyzing}
                      >
                        <i className="fas fa-play"></i>
                        <span>Start Recording</span>
                      </button>
                      <p className="control-hint">
                        <i className="fas fa-info-circle"></i>
                        Click to begin gait analysis recording
                      </p>
                    </>
                  ) : (
                    <>
                      <button className="control-btn stop-btn" onClick={stopRecording}>
                        <i className="fas fa-stop"></i>
                        <span>Stop & Analyze</span>
                      </button>
                      <p className="control-hint recording">
                        <i className="fas fa-circle recording-dot"></i>
                        {recordingTime < 30 
                          ? `Recording... ${30 - recordingTime}s remaining (minimum 30s)`
                          : 'Ready! Click to stop and analyze'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Loading */}
          {isAnalyzing && (
            <div className="analyzing-overlay">
              <div className="spinner"></div>
              <p>Analyzing gait data...</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="analysis-results">
              <div className="results-header">
                <i className="fas fa-check-circle" style={{color: '#27AE60', fontSize: '2.5rem'}}></i>
                <h2>Gait Analysis Complete!</h2>
                <div className="data-quality-badge">
                  <i className="fas fa-award"></i>
                  Data Quality: <strong>{analysisResult.data_quality}</strong>
                </div>
                <div className="duration-badge">
                  <i className="fas fa-clock"></i>
                  Duration: <strong>{analysisResult.analysis_duration}s</strong>
                </div>
              </div>
              
              {/* Step Count - Full Width Card */}
              <div className="metric-card-full">
                <div className="metric-header">
                  <i className="fas fa-shoe-prints" style={{color: '#C9302C', fontSize: '1.5rem'}}></i>
                  <div className="metric-info">
                    <span className="metric-value-large">{analysisResult.metrics.step_count}</span>
                    <span className="metric-label">Steps Detected</span>
                  </div>
                </div>
                <div className="metric-explanation">
                  {analysisResult.metrics.step_count > 0 
                    ? analysisResult.metrics.step_count < 15
                      ? "Few steps detected. Try walking longer for better analysis."
                      : analysisResult.metrics.step_count < 30
                      ? "Good number of steps for basic analysis."
                      : "Excellent! Enough steps for accurate analysis."
                    : "No steps detected. Make sure to walk while recording."}
                </div>
              </div>

              {/* Metrics Grid - 2 columns */}
              <div className="metrics-grid-detailed">
                {/* Cadence */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#3498DB20'}}>
                    <i className="fas fa-tachometer-alt" style={{color: '#3498DB'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{analysisResult.metrics.cadence.toFixed(1)}</span>
                    <span className="metric-label">Steps/min</span>
                    <span className="metric-status">
                      {analysisResult.metrics.cadence >= 100 
                        ? "Fast pace"
                        : analysisResult.metrics.cadence >= 80
                        ? "Normal pace"
                        : analysisResult.metrics.cadence > 0
                        ? "Slow pace"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Walking Speed */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#9B59B620'}}>
                    <i className="fas fa-walking" style={{color: '#9B59B6'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{analysisResult.metrics.velocity.toFixed(2)}</span>
                    <span className="metric-label">m/s</span>
                    <span className="metric-status">
                      {analysisResult.metrics.velocity >= 1.2
                        ? "Fast walker"
                        : analysisResult.metrics.velocity >= 0.8
                        ? "Average speed"
                        : analysisResult.metrics.velocity > 0
                        ? "Slow walk"
                        : "No movement"}
                    </span>
                  </div>
                </div>

                {/* Gait Symmetry */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#E67E2220'}}>
                    <i className="fas fa-balance-scale" style={{color: '#E67E22'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{(analysisResult.metrics.gait_symmetry * 100).toFixed(0)}%</span>
                    <span className="metric-label">Symmetry</span>
                    <span className="metric-status">
                      {analysisResult.metrics.gait_symmetry >= 0.9
                        ? "Excellent!"
                        : analysisResult.metrics.gait_symmetry >= 0.7
                        ? "Good balance"
                        : analysisResult.metrics.gait_symmetry > 0
                        ? "Needs attention"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Stability Score */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#27AE6020'}}>
                    <i className="fas fa-shield-alt" style={{color: '#27AE60'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{(analysisResult.metrics.stability_score * 100).toFixed(0)}%</span>
                    <span className="metric-label">Stability</span>
                    <span className="metric-status">
                      {analysisResult.metrics.stability_score >= 0.8
                        ? "Very stable"
                        : analysisResult.metrics.stability_score >= 0.6
                        ? "Moderate"
                        : analysisResult.metrics.stability_score > 0
                        ? "Unstable"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Stride Length */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#E74C3C20'}}>
                    <i className="fas fa-ruler-horizontal" style={{color: '#E74C3C'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{analysisResult.metrics.stride_length.toFixed(2)}</span>
                    <span className="metric-label">Stride (m)</span>
                    <span className="metric-status">
                      {analysisResult.metrics.stride_length >= 1.2
                        ? "Long strides"
                        : analysisResult.metrics.stride_length >= 0.8
                        ? "Normal"
                        : analysisResult.metrics.stride_length > 0
                        ? "Short strides"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Step Regularity */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#16A08520'}}>
                    <i className="fas fa-heartbeat" style={{color: '#16A085'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{(analysisResult.metrics.step_regularity * 100).toFixed(0)}%</span>
                    <span className="metric-label">Regularity</span>
                    <span className="metric-status">
                      {analysisResult.metrics.step_regularity >= 0.8
                        ? "Very consistent"
                        : analysisResult.metrics.step_regularity >= 0.6
                        ? "Fairly regular"
                        : analysisResult.metrics.step_regularity > 0
                        ? "Irregular"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Vertical Oscillation */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#8E44AD20'}}>
                    <i className="fas fa-arrows-alt-v" style={{color: '#8E44AD'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">{(analysisResult.metrics.vertical_oscillation * 100).toFixed(1)}</span>
                    <span className="metric-label">Bounce (cm)</span>
                    <span className="metric-status">
                      {analysisResult.metrics.vertical_oscillation >= 0.08
                        ? "High bounce"
                        : analysisResult.metrics.vertical_oscillation >= 0.05
                        ? "Normal"
                        : analysisResult.metrics.vertical_oscillation > 0
                        ? "Low bounce"
                        : "No data"}
                    </span>
                  </div>
                </div>

                {/* Sensors Used */}
                <div className="metric-card-detailed">
                  <div className="metric-icon" style={{backgroundColor: '#34495E20'}}>
                    <i className="fas fa-microchip" style={{color: '#34495E'}}></i>
                  </div>
                  <div className="metric-content">
                    <span className="metric-value">
                      {Object.values(analysisResult.sensors_used).filter(v => v === true).length}
                    </span>
                    <span className="metric-label">Sensors Active</span>
                    <span className="metric-status">
                      Accel + Gyro
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="summary-card">
                <div className="summary-header">
                  <i className="fas fa-clipboard-list"></i>
                  <h3>Analysis Summary</h3>
                </div>
                <p className="summary-text">
                  {analysisResult.metrics.step_count > 0
                    ? `You took ${analysisResult.metrics.step_count} steps in ${analysisResult.analysis_duration.toFixed(0)}s. ` +
                      `Your walking pattern shows ${
                        analysisResult.metrics.gait_symmetry >= 0.9 ? "excellent" :
                        analysisResult.metrics.gait_symmetry >= 0.7 ? "good" : "fair"
                      } symmetry and ${
                        analysisResult.metrics.stability_score >= 0.8 ? "strong" :
                        analysisResult.metrics.stability_score >= 0.6 ? "moderate" : "low"
                      } stability. ${
                        analysisResult.metrics.step_regularity >= 0.8
                          ? "Your steps are very consistent!"
                          : analysisResult.metrics.step_regularity >= 0.6
                          ? "Your steps show good regularity."
                          : "Try to maintain a more consistent walking rhythm."
                      }`
                    : "No steps were detected during this recording. Make sure to walk normally while recording for at least 30 seconds."}
                </p>
              </div>

              {/* Detected Problems Section */}
              {analysisResult.detected_problems && analysisResult.detected_problems.length > 0 && (
                <div className="problems-section">
                  <div className="problems-header">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Detected Gait Problems</h3>
                    {analysisResult.problem_summary && (
                      <div className="risk-badge" data-risk={analysisResult.problem_summary.risk_level}>
                        <i className="fas fa-shield-alt"></i>
                        Risk: {analysisResult.problem_summary.risk_level.replace('_', ' ')}
                      </div>
                    )}
                  </div>

                  {analysisResult.problem_summary && (
                    <div className="problem-summary-text">
                      <p>{analysisResult.problem_summary.summary}</p>
                      <div className="problem-counts">
                        {analysisResult.problem_summary.severe_count > 0 && (
                          <span className="count-badge severe">
                            <i className="fas fa-exclamation-circle"></i>
                            {analysisResult.problem_summary.severe_count} Severe
                          </span>
                        )}
                        {analysisResult.problem_summary.moderate_count > 0 && (
                          <span className="count-badge moderate">
                            <i className="fas fa-info-circle"></i>
                            {analysisResult.problem_summary.moderate_count} Moderate
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="problems-grid">
                    {analysisResult.detected_problems.map((problem, index) => (
                      <div key={index} className={`problem-card-compact ${problem.severity}`}>
                        <div className="problem-card-header">
                          <div className="problem-icon">
                            {problem.severity === 'severe' ? (
                              <i className="fas fa-exclamation-circle"></i>
                            ) : (
                              <i className="fas fa-info-circle"></i>
                            )}
                          </div>
                          <div className="problem-info">
                            <h4 className="problem-name">{problem.problem.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                            <span className={`severity-tag ${problem.severity}`}>
                              {problem.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="problem-values">
                          <div className="value-row">
                            <span className="value-label">Current:</span>
                            <span className="value-data">{problem.current_value}</span>
                          </div>
                          <div className="value-row">
                            <span className="value-label">Normal:</span>
                            <span className="value-data">{problem.normal_range}</span>
                          </div>
                        </div>

                        <div className="problem-brief">
                          <p>{problem.description}</p>
                        </div>

                        <div className="problem-recommendations-compact">
                          <strong>Recommended:</strong>
                          <ul>
                            {problem.recommendations.slice(0, 2).map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                            {problem.recommendations.length > 2 && (
                              <li className="more-exercises">+{problem.recommendations.length - 2} more exercises</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Problems Detected */}
              {analysisResult.detected_problems && analysisResult.detected_problems.length === 0 && (
                <div className="no-problems-section">
                  <div className="no-problems-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h3>Great News!</h3>
                  <p>No significant gait problems detected. Your walking parameters are within normal ranges.</p>
                  <p className="tip">Continue regular physical activity to maintain your mobility.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button 
                  className="action-btn exercise-plans"
                  onClick={() => navigate('/exercise-plans')}
                >
                  <i className="fas fa-dumbbell"></i>
                  Exercise Plans
                </button>

                <button 
                  className="action-btn primary"
                  onClick={() => {
                    // Clear buffers
                    Object.keys(sensorBuffer.current).forEach(key => {
                      sensorBuffer.current[key] = [];
                    });
                    Object.keys(fsrBuffer.current).forEach(key => {
                      fsrBuffer.current[key] = [];
                    });
                    // Clear analysis result from state and localStorage
                    setAnalysisResult(null);
                    localStorage.removeItem('gaitAnalysisResult');
                    setRecordingTime(0);
                    setStepCount(0);
                  }}
                >
                  <i className="fas fa-redo"></i>
                  New Analysis
                </button>

                <button 
                  className="action-btn secondary"
                  onClick={() => {
                    alert('Results are automatically saved to your gait history!');
                  }}
                >
                  <i className="fas fa-check"></i>
                  Results Saved
                </button>
              </div>
            </div>
          )}

          {/* Error message - only show during recording/analysis issues */}
          {error && (isRecording || isAnalyzing || analysisResult) && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default GaitRecording;
