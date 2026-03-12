import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './GaitRecording.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function GaitRecording({ onLogout, onFacilityExit }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sensorStatus, setSensorStatus] = useState('disconnected'); // 'disconnected', 'connected', 'recording'
  const [stepCount, setStepCount] = useState(0);
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
  
  // FSR-based step detection refs
  const lastLeftHeelPressure = useRef(null);  // Will be set on first reading
  const lastRightHeelPressure = useRef(null); // Will be set on first reading
  
  // IMU-based step detection refs (using ankle accelerometer Z-axis)
  const lastLeftAnkleAz = useRef([]);  // Last 10 samples for peak detection
  const lastRightAnkleAz = useRef([]); // Last 10 samples for peak detection
  const lastLeftStepTime = useRef(0);   // Debounce timing
  const lastRightStepTime = useRef(0);  // Debounce timing
  const MIN_STEP_INTERVAL = 300; // Minimum 300ms between steps (prevents double-counting)

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
        const response = await fetch(`${API_URL}/wearable/data`);
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

  // IMU-based step detection using ankle accelerometer
  const detectStepFromIMU = (ankleData, side) => {
    if (!ankleData || typeof ankleData.az === 'undefined') return;
    
    const azValue = Math.abs(ankleData.az); // Use absolute value for peak detection
    const now = Date.now();
    
    // Get refs for this side
    const lastStepTime = side === 'left' ? lastLeftStepTime : lastRightStepTime;
    const azHistory = side === 'left' ? lastLeftAnkleAz : lastRightAnkleAz;
    
    // Add current value to history (keep last 10 samples)
    azHistory.current.push(azValue);
    if (azHistory.current.length > 10) {
      azHistory.current.shift();
    }
    
    // Need at least 5 samples for peak detection
    if (azHistory.current.length < 5) return;
    
    // Detect peak: current value must be higher than previous 2 and next 2 values
    const values = azHistory.current;
    const currentIdx = values.length - 3; // Check 3rd from end (has 2 before and 2 after)
    
    if (currentIdx >= 2 && currentIdx < values.length - 2) {
      const currentVal = values[currentIdx];
      const isPeak = 
        currentVal > values[currentIdx - 1] &&
        currentVal > values[currentIdx - 2] &&
        currentVal > values[currentIdx + 1] &&
        currentVal > values[currentIdx + 2] &&
        currentVal > 1.5; // Minimum acceleration threshold (g-force)
      
      // Check if enough time passed since last step (debounce)
      const timeSinceLastStep = now - lastStepTime.current;
      
      if (isPeak && timeSinceLastStep > MIN_STEP_INTERVAL) {
        setStepCount(prev => prev + 1);
        console.log(`👣 ${side.toUpperCase()} STEP (IMU) #${stepCount + 1}! Az peak: ${currentVal.toFixed(2)}g`);
        lastStepTime.current = now;
      }
    }
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
    
    // ✅ IMU-based step detection (more reliable than FSR for constant-contact issues)
    if (data.LEFT_ANKLE) {
      detectStepFromIMU(data.LEFT_ANKLE, 'left');
    }
    if (data.RIGHT_ANKLE) {
      detectStepFromIMU(data.RIGHT_ANKLE, 'right');
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
    
    // Reset FSR references to null so first reading initializes them
    lastLeftHeelPressure.current = null;
    lastRightHeelPressure.current = null;
    
    // Reset IMU-based step detection references
    lastLeftAnkleAz.current = [];
    lastRightAnkleAz.current = [];
    lastLeftStepTime.current = 0;
    lastRightStepTime.current = 0;
    
    console.log('🎬 Recording started - IMU + FSR hybrid step detection active');
    
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

      const gaitBody = {
        sensors: sensorBuffer.current,
        fsr: fsrBuffer.current
      };

      const response = await fetch(`${API_URL}/hardware/gait/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gaitBody)
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

  // Generate fake demo data for testing without hardware
  const generateDemoData = async () => {
    console.log('🎭 DEMO MODE: Generating fake gait analysis data...');
    
    // Create realistic-looking fake metrics
    const demoMetrics = {
      step_count: Math.floor(Math.random() * 20) + 40, // 40-60 steps (NUMBER)
      cadence: Math.floor(Math.random() * 20) + 90, // 90-110 steps/min (NUMBER)
      stride_length: Math.random() * 0.3 + 1.0, // 1.0-1.3 meters (NUMBER)
      stride_time: Math.random() * 0.2 + 0.9, // 0.9-1.1 seconds (NUMBER)
      velocity: Math.random() * 0.3 + 0.9, // 0.9-1.2 m/s (NUMBER)
      gait_symmetry: Math.random() * 0.15 + 0.85, // 0.85-1.0 (NUMBER)
      stance_time: Math.random() * 0.1 + 0.6, // 0.6-0.7 seconds (NUMBER)
      swing_time: Math.random() * 0.1 + 0.3, // 0.3-0.4 seconds (NUMBER)
      double_support_time: Math.random() * 0.05 + 0.15, // 0.15-0.20 seconds (NUMBER)
      step_length_variability: Math.random() * 5 + 3, // 3-8% (NUMBER)
      step_time_variability: Math.random() * 5 + 3 // 3-8% (NUMBER)
    };

    const demoPayload = {
      metrics: demoMetrics,
      gait_phases: {
        stance_percentage: Math.floor(Math.random() * 5) + 58, // 58-63%
        swing_percentage: Math.floor(Math.random() * 5) + 37, // 37-42%
        double_support_percentage: Math.floor(Math.random() * 5) + 18 // 18-23%
      },
      analysis_duration: Math.floor(Math.random() * 20) + 40 // 40-60 seconds
    };

    try {
      // Call backend API to save with REAL problem detection
      console.log('📡 Sending demo data to backend for REAL analysis...');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/gait/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(demoPayload)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Demo data saved to database!');
        console.log('📊 REAL problems detected:', result.data.detected_problems.length);
        console.log('🏋️ Exercise plan created:', result.data.exercise_plan_created);
        
        // Build complete analysis result with REAL detected problems
        const fullResult = {
          gait_id: result.data.gait_id,
          session_id: `demo_${Date.now()}`,
          timestamp: result.data.timestamp,
          metrics: result.data.metrics,
          detected_problems: result.data.detected_problems,
          problem_summary: result.data.problem_summary,
          gait_score: result.data.gait_score,  // Include gait mobility score
          sensors_used: ['DEMO_DATA'],
          gait_phases: demoPayload.gait_phases,
          analysis_duration: demoPayload.analysis_duration,
          data_quality: 'demo',
          exercise_plan_created: result.data.exercise_plan_created
        };
        
        // Save to state and localStorage for immediate UI update
        setAnalysisResult(fullResult);
        localStorage.setItem('gaitAnalysisResult', JSON.stringify(fullResult));
        setRecordingTime(demoPayload.analysis_duration);
        setStepCount(result.data.metrics.step_count);
        
        // Enhanced alert with gait score
        const scoreInfo = result.data.gait_score 
          ? `\n🎯 Gait Score: ${result.data.gait_score.score}/100 (${result.data.gait_score.grade} ${result.data.gait_score.grade_emoji})`
          : '';
        
        alert(`✅ Demo data generated and saved to database!\n\n📊 ${result.data.detected_problems.length} REAL problems detected by AI${scoreInfo}\n🏋️ Exercise plan: ${result.data.exercise_plan_created ? 'Created ✓' : 'Not needed'}\n💾 Saved to database\n\n👉 Check Health Logs to view the complete analysis!`);
      } else {
        console.error('❌ Failed to save demo data:', result.message);
        alert('Failed to generate demo data: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Error generating demo data:', error);
      alert('Error generating demo data. Check console for details.');
    }
  };

  return (
    <div className="blank-page">
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />
      <main className="blank-page-content">
        <div className="gait-recording-container">
          <div className="recording-content-wrapper">
            {/* Clinical Header */}
            <div className="clinical-header">
              <div className="header-breadcrumb">
                <button className="breadcrumb-btn" onClick={() => navigate('/physical-therapy')}>
                  <i className="fas fa-chevron-left"></i>
                  Physical Therapy
                </button>
              </div>
              <h1 className="clinical-title">
                <i className="fas fa-walking"></i>
                Gait Analysis Session
              </h1>
              <p className="clinical-subtitle">Real-time monitoring and analysis of walking patterns using wearable sensor technology</p>
            </div>

          {/* Sensor Setup State */}
          {sensorStatus === 'disconnected' && !isAnalyzing && !analysisResult && (
            <div className="clinical-setup-grid">
              {/* Connection Status Panel */}
              <div className="clinical-status-panel">
                <div className="status-panel-header">
                  <div className="status-icon-container">
                    <div className="status-icon-wrapper status-waiting">
                      <i className="fas fa-microchip"></i>
                    </div>
                  </div>
                  <h2 className="status-panel-title">Sensor System Status</h2>
                  <p className="status-panel-subtitle">ESP32-based Wearable Gait Analysis System</p>
                </div>
                
                <div className="status-panel-body">
                  <div className="connection-state">
                    <div className="state-badge state-scanning">
                      <span className="scanning-dot"></span>
                      <span>Scanning for Hardware</span>
                    </div>
                  </div>

                  <div className="checklist-section">
                    <div className="checklist-header">
                      <i className="fas fa-clipboard-check"></i>
                      <span>Pre-Recording Checklist</span>
                    </div>
                    <div className="checklist-items">
                      <div className="checklist-item">
                        <div className="item-indicator"></div>
                        <span>ESP32 microcontroller powered on</span>
                      </div>
                      <div className="checklist-item">
                        <div className="item-indicator"></div>
                        <span>IMU sensors properly attached to body</span>
                      </div>
                      <div className="checklist-item">
                        <div className="item-indicator"></div>
                        <span>FSR sensors positioned in footwear</span>
                      </div>
                      <div className="checklist-item">
                        <div className="item-indicator"></div>
                        <span>Backend server running and accessible</span>
                      </div>
                    </div>
                  </div>

                  <div className="demo-section">
                    <div className="demo-divider">
                      <span>Demonstration Mode</span>
                    </div>
                    <button 
                      className="demo-action-btn"
                      onClick={generateDemoData}
                      disabled={isAnalyzing}
                    >
                      <i className="fas fa-flask"></i>
                      <span>Generate Simulated Gait Data</span>
                    </button>
                    <p className="demo-note">
                      <i className="fas fa-info-circle"></i>
                      Test analysis workflow without physical hardware connection
                    </p>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications Panel */}
              <div className="clinical-specs-panel">
                <div className="specs-header">
                  <div className="specs-icon">
                    <i className="fas fa-cogs"></i>
                  </div>
                  <h2 className="specs-title">System Configuration</h2>
                  <p className="specs-subtitle">Required hardware components and sensor placement</p>
                </div>
                
                <div className="specs-body">
                  {/* Hardware Components */}
                  <div className="specs-section">
                    <div className="section-label">
                      <i className="fas fa-box"></i>
                      Hardware Components
                    </div>
                    <div className="component-list">
                      <div className="component-item">
                        <div className="component-icon">
                          <i className="fas fa-microchip"></i>
                        </div>
                        <div className="component-details">
                          <span className="component-name">MPU6050 IMU Sensors</span>
                          <span className="component-spec">6 units · 6-axis motion tracking</span>
                        </div>
                      </div>
                      <div className="component-item">
                        <div className="component-icon">
                          <i className="fas fa-compress-arrows-alt"></i>
                        </div>
                        <div className="component-details">
                          <span className="component-name">FSR Pressure Sensors</span>
                          <span className="component-spec">6 units · Force-sensitive resistors</span>
                        </div>
                      </div>
                      <div className="component-item">
                        <div className="component-icon">
                          <i className="fas fa-wifi"></i>
                        </div>
                        <div className="component-details">
                          <span className="component-name">ESP32 Controller</span>
                          <span className="component-spec">WiFi + Bluetooth connectivity</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sensor Placement */}
                  <div className="specs-section">
                    <div className="section-label">
                      <i className="fas fa-map-marked-alt"></i>
                      Sensor Placement Protocol
                    </div>
                    <div className="placement-list">
                      <div className="placement-group">
                        <div className="placement-category">Lower Body IMU Units</div>
                        <div className="placement-item">
                          <span className="placement-location">Bilateral Waist</span>
                          <span className="placement-position">Hip/pelvic region (optional)</span>
                        </div>
                        <div className="placement-item">
                          <span className="placement-location">Bilateral Knee</span>
                          <span className="placement-position">Knee joint lateral aspect</span>
                        </div>
                        <div className="placement-item">
                          <span className="placement-location">Bilateral Ankle</span>
                          <span className="placement-position">Ankle lateral malleolus</span>
                        </div>
                        <div className="placement-item">
                          <span className="placement-location">Bilateral Toe</span>
                          <span className="placement-position">Forefoot dorsal surface (optional)</span>
                        </div>
                      </div>
                      <div className="placement-group">
                        <div className="placement-category">Plantar Pressure Sensors</div>
                        <div className="placement-item">
                          <span className="placement-location">Bilateral FSR Array</span>
                          <span className="placement-position">3 per foot: heel, midfoot, forefoot</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    {isRecording ? (
                      <div className="walking-animation-container">
                        <div className="walking-instruction">
                          <i className="fas fa-walking" style={{fontSize: '3rem', color: 'var(--brand-primary)', marginBottom: '0.5rem'}}></i>
                          <h3 style={{color: 'var(--brand-primary)', marginBottom: '0.5rem'}}>Keep Walking!</h3>
                          <p style={{color: '#666', fontSize: '0.95rem'}}>Continue moving naturally</p>
                        </div>
                        <div className="footprints-container" style={{justifyContent: 'center'}}>
                          <div className="footprint walking" style={{margin: '0 auto', animation: 'pulse 1.5s ease-in-out infinite'}}>
                            <i className="fas fa-shoe-prints" style={{fontSize: '2.5rem', color: 'var(--brand-primary)'}}></i>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="footprints-container" style={{justifyContent: 'center'}}>
                        <div className="footprint" style={{margin: '0 auto'}}>
                          <i className="fas fa-shoe-prints" style={{fontSize: '2.5rem', color: '#999'}}></i>
                        </div>
                      </div>
                    )}
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
                      
                      {/* Demo Mode Option */}
                      <div className="divider-or">
                        <span>OR</span>
                      </div>
                      
                      <button 
                        className="control-btn demo-btn"
                        onClick={generateDemoData}
                        disabled={isAnalyzing}
                      >
                        <i className="fas fa-flask"></i>
                        <span>Generate Demo Data</span>
                      </button>
                      <p className="control-hint demo">
                        <i className="fas fa-lightbulb"></i>
                        Test exercise plans without recording
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

          {/* Analysis Results - Dashboard Layout */}
          {analysisResult && (
            <div className="dashboard-grid">
              {/* Header Section - Full Width */}
              <div className="dashboard-card header-card">
                <div className="results-header">
                  <i className="fas fa-check-circle" style={{color: '#27AE60', fontSize: '2.5rem'}}></i>
                  <h2>Gait Analysis Complete!</h2>
                  <div className="badge-group">
                    <div className="data-quality-badge">
                      <i className="fas fa-award"></i>
                      Data Quality: <strong>{analysisResult.data_quality}</strong>
                    </div>
                    <div className="duration-badge">
                      <i className="fas fa-clock"></i>
                      Duration: <strong>{analysisResult.analysis_duration}s</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps Detected - Prominent Full Width Highlight */}
              <div className="dashboard-card steps-highlight-card">
                <div className="steps-highlight-content">
                  <div className="steps-icon-large">
                    <i className="fas fa-shoe-prints"></i>
                  </div>
                  <div className="steps-info">
                    <span className="steps-label">Steps Detected</span>
                    <div className="steps-value-huge">
                      {analysisResult.metrics.step_count}
                      <small>steps</small>
                    </div>
                  </div>
                  <div className={`steps-status-badge ${
                    analysisResult.metrics.step_count >= 30 ? 'status-excellent' :
                    analysisResult.metrics.step_count >= 15 ? 'status-good' :
                    analysisResult.metrics.step_count > 0 ? 'status-attention' :
                    'status-low'
                  }`}>
                    {analysisResult.metrics.step_count >= 30 ? 'EXCELLENT' :
                     analysisResult.metrics.step_count >= 15 ? 'GOOD' :
                     analysisResult.metrics.step_count > 0 ? 'LOW' :
                     'NONE'}
                  </div>
                  <p className="steps-explanation">
                    {analysisResult.metrics.step_count > 0 
                      ? analysisResult.metrics.step_count < 15
                        ? "Few steps detected. Try walking longer for better analysis."
                        : analysisResult.metrics.step_count < 30
                        ? "Good number of steps for basic analysis."
                        : "Excellent! Enough steps for accurate analysis."
                      : "No steps detected. Make sure to walk while recording."}
                  </p>
                </div>
              </div>

              {/* Metrics Grid - 4 Column Layout for 8 metrics */}
              <div className="metrics-dashboard-grid">
                {/* Cadence */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-tachometer-alt"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Cadence</span>
                      <span className="metric-value-clinical">{analysisResult.metrics.cadence.toFixed(1)} <small>steps/min</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.cadence >= 100 ? 'status-good' :
                      analysisResult.metrics.cadence >= 80 ? 'status-normal' : 'status-low'
                    }`}>
                      {analysisResult.metrics.cadence >= 100 ? "Fast" :
                       analysisResult.metrics.cadence >= 80 ? "Normal" : "Slow"}
                    </div>
                  </div>
                  <p className="metric-explanation">Walking rhythm and pace indicator</p>
                </div>

                {/* Walking Speed */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-walking"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Velocity</span>
                      <span className="metric-value-clinical">{analysisResult.metrics.velocity.toFixed(2)} <small>m/s</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.velocity >= 1.2 ? 'status-good' :
                      analysisResult.metrics.velocity >= 0.8 ? 'status-normal' : 'status-low'
                    }`}>
                      {analysisResult.metrics.velocity >= 1.2 ? "Fast" :
                       analysisResult.metrics.velocity >= 0.8 ? "Normal" : "Slow"}
                    </div>
                  </div>
                  <p className="metric-explanation">Average walking speed measurement</p>
                </div>

                {/* Gait Symmetry */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-balance-scale"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Symmetry</span>
                      <span className="metric-value-clinical">{(analysisResult.metrics.gait_symmetry * 100).toFixed(0)}<small>%</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.gait_symmetry >= 0.9 ? 'status-excellent' :
                      analysisResult.metrics.gait_symmetry >= 0.7 ? 'status-good' : 'status-attention'
                    }`}>
                      {analysisResult.metrics.gait_symmetry >= 0.9 ? "Excellent" :
                       analysisResult.metrics.gait_symmetry >= 0.7 ? "Good" : "Fair"}
                    </div>
                  </div>
                  <p className="metric-explanation">Balance between left and right steps</p>
                </div>

                {/* Stability Score */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Stability</span>
                      <span className="metric-value-clinical">{(analysisResult.metrics.stability_score * 100).toFixed(0)}<small>%</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.stability_score >= 0.8 ? 'status-excellent' :
                      analysisResult.metrics.stability_score >= 0.6 ? 'status-normal' : 'status-attention'
                    }`}>
                      {analysisResult.metrics.stability_score >= 0.8 ? "Stable" :
                       analysisResult.metrics.stability_score >= 0.6 ? "Moderate" : "Unstable"}
                    </div>
                  </div>
                  <p className="metric-explanation">Walking steadiness and control</p>
                </div>

                {/* Stride Length */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-ruler-horizontal"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Stride Length</span>
                      <span className="metric-value-clinical">{analysisResult.metrics.stride_length.toFixed(2)} <small>m</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.stride_length >= 1.2 ? 'status-good' :
                      analysisResult.metrics.stride_length >= 0.8 ? 'status-normal' : 'status-low'
                    }`}>
                      {analysisResult.metrics.stride_length >= 1.2 ? "Long" :
                       analysisResult.metrics.stride_length >= 0.8 ? "Normal" : "Short"}
                    </div>
                  </div>
                  <p className="metric-explanation">Distance covered per complete step cycle</p>
                </div>

                {/* Step Regularity */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-heartbeat"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Regularity</span>
                      <span className="metric-value-clinical">{(analysisResult.metrics.step_regularity * 100).toFixed(0)}<small>%</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.step_regularity >= 0.8 ? 'status-excellent' :
                      analysisResult.metrics.step_regularity >= 0.6 ? 'status-normal' : 'status-attention'
                    }`}>
                      {analysisResult.metrics.step_regularity >= 0.8 ? "Consistent" :
                       analysisResult.metrics.step_regularity >= 0.6 ? "Regular" : "Irregular"}
                    </div>
                  </div>
                  <p className="metric-explanation">Consistency of step timing pattern</p>
                </div>

                {/* Vertical Oscillation */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-arrows-alt-v"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Vertical Motion</span>
                      <span className="metric-value-clinical">{(analysisResult.metrics.vertical_oscillation * 100).toFixed(1)} <small>cm</small></span>
                    </div>
                    <div className={`metric-status-badge ${
                      analysisResult.metrics.vertical_oscillation >= 0.08 ? 'status-attention' :
                      analysisResult.metrics.vertical_oscillation >= 0.05 ? 'status-normal' : 'status-good'
                    }`}>
                      {analysisResult.metrics.vertical_oscillation >= 0.08 ? "High" :
                       analysisResult.metrics.vertical_oscillation >= 0.05 ? "Normal" : "Low"}
                    </div>
                  </div>
                  <p className="metric-explanation">Vertical body movement during walking</p>
                </div>

                {/* Sensors Used */}
                <div className="clinical-metric-card">
                  <div className="metric-header-row">
                    <div className="metric-icon-small">
                      <i className="fas fa-microchip"></i>
                    </div>
                    <div className="metric-main">
                      <span className="metric-label-small">Data Quality</span>
                      <span className="metric-value-clinical">
                        {Object.values(analysisResult.sensors_used).filter(v => v === true).length} <small>sensors</small>
                      </span>
                    </div>
                    <div className="metric-status-badge status-info">
                      Multi-Sensor
                    </div>
                  </div>
                  <p className="metric-explanation">Accelerometer and gyroscope data used</p>
                </div>
              </div>

                {/* Clinical Summary - Full Width Section */}
                <div className="dashboard-card summary-dashboard-card">
                  <div className="card-title">
                    <i className="fas fa-file-medical-alt"></i>
                    <h3>Clinical Summary</h3>
                  </div>
                  <div className="clinical-summary-content">
                  {analysisResult.metrics.step_count > 0 ? (
                    <>
                      <div className="summary-stat-row">
                        <div className="summary-stat">
                          <span className="stat-label">Steps Recorded</span>
                          <span className="stat-value">{analysisResult.metrics.step_count}</span>
                        </div>
                        <div className="summary-stat">
                          <span className="stat-label">Duration</span>
                          <span className="stat-value">{analysisResult.analysis_duration.toFixed(0)}s</span>
                        </div>
                      </div>
                      
                      <div className="summary-findings">
                        <div className="finding-item">
                          <i className="fas fa-balance-scale-right"></i>
                          <div className="finding-text">
                            <strong>Gait Symmetry:</strong>{' '}
                            {analysisResult.metrics.gait_symmetry >= 0.9 ? "Excellent balance between left and right steps" :
                             analysisResult.metrics.gait_symmetry >= 0.7 ? "Good balance detected" : 
                             "Asymmetry detected - may need attention"}
                          </div>
                        </div>
                        <div className="finding-item">
                          <i className="fas fa-shield-alt"></i>
                          <div className="finding-text">
                            <strong>Stability:</strong>{' '}
                            {analysisResult.metrics.stability_score >= 0.8 ? "Strong stability maintained" :
                             analysisResult.metrics.stability_score >= 0.6 ? "Moderate stability" : 
                             "Low stability - balance support recommended"}
                          </div>
                        </div>
                        <div className="finding-item">
                          <i className="fas fa-heartbeat"></i>
                          <div className="finding-text">
                            <strong>Step Regularity:</strong>{' '}
                            {analysisResult.metrics.step_regularity >= 0.8 ? "Highly consistent step pattern" :
                             analysisResult.metrics.step_regularity >= 0.6 ? "Good consistency observed" : 
                             "Irregular pattern - consider gait training"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-data-message">
                      <i className="fas fa-info-circle"></i>
                      <p>No steps were detected during this recording. Make sure to walk normally while recording for at least 30 seconds.</p>
                    </div>
                  )}
                </div>
                </div>

              {/* Navigation Section - Full Width */}
              <div className="dashboard-card navigation-card">
                <div className="analysis-navigation-buttons">
                  <button 
                    className="next-page-btn problems-btn"
                    onClick={() => {
                      // Store analysis result to pass to problems page
                      localStorage.setItem('gaitAnalysisResult', JSON.stringify(analysisResult));
                      navigate('/gait-problems');
                    }}
                  >
                    <div className="btn-content">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="btn-text">
                      <strong>View Detected Problems</strong>
                      {analysisResult.detected_problems && analysisResult.detected_problems.length > 0 && (
                        <small>{analysisResult.detected_problems.length} issue{analysisResult.detected_problems.length !== 1 ? 's' : ''} found</small>
                      )}
                      {(!analysisResult.detected_problems || analysisResult.detected_problems.length === 0) && (
                        <small>No problems detected</small>
                      )}
                    </span>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </button>

                <button 
                  className="next-page-btn new-analysis-btn"
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
                  <div className="btn-content">
                    <i className="fas fa-redo"></i>
                    <span className="btn-text">
                      <strong>New Analysis</strong>
                      <small>Start another gait recording</small>
                    </span>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </button>
                </div>
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
        </div>
      </main>
    </div>
  );
}

export default GaitRecording;
