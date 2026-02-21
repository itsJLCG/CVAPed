"""
Hardware Gait Processor
Processes data from 6 IMU sensors (MPU6050) + 6 FSR sensors on ESP32
Outputs same structure as mobile gait analysis for MongoDB compatibility
"""

import numpy as np
from scipy import signal
from scipy.fft import fft, fftfreq
from datetime import datetime
import uuid
import logging
from gait_problem_detector import GaitProblemDetector

logger = logging.getLogger(__name__)


class HardwareGaitProcessor:
    """Process hardware sensor data to extract gait metrics"""
    
    def __init__(self):
        # Same thresholds as mobile for consistency
        self.min_step_threshold = 0.5  # m/s² minimum acceleration for step
        self.step_frequency_range = (0.5, 3.0)  # Hz - normal walking cadence
        self.gravity = 9.81  # m/s²
        
        # Initialize problem detector
        try:
            self.problem_detector = GaitProblemDetector()
            print("✓ Problem detector initialized with PhysioNet baselines")
        except Exception as e:
            print(f"⚠️ Problem detector unavailable: {e}")
            self.problem_detector = None
        
    def analyze(self, sensor_data, fsr_data=None, user_id=None):
        """
        Main analysis function - matches mobile output structure
        
        Args:
            sensor_data: dict with 6 IMU sensors
                {
                    "LEFT_WAIST": [{"timestamp": ms, "ax": float, "ay": float, "az": float, 
                                    "gx": float, "gy": float, "gz": float}, ...],
                    "RIGHT_WAIST": [...],
                    "LEFT_KNEE": [...],
                    "RIGHT_KNEE": [...],
                    "LEFT_TOE": [...],
                    "RIGHT_TOE": [...]
                }
            fsr_data: dict with 6 FSR sensors (optional)
                {
                    "LEFT_HEEL": [value1, value2, ...],
                    "LEFT_MID": [...],
                    "LEFT_TOE": [...],
                    "RIGHT_HEEL": [...],
                    "RIGHT_MID": [...],
                    "RIGHT_TOE": [...]
                }
            user_id: MongoDB user ID
        
        Returns:
            dict matching mobile's GaitProgress MongoDB structure
        """
        
        try:
            # Step 0: Check sensor health and availability
            sensor_health = self._check_sensor_health(sensor_data, fsr_data)
            
            print(f"\n🏥 SENSOR HEALTH CHECK:")
            print(f"  Working Sensors: {sensor_health['working_count']}/{sensor_health['total_sensors']}")
            if sensor_health['warnings']:
                print(f"  ⚠️  Warnings:")
                for warning in sensor_health['warnings']:
                    print(f"     - {warning}")
            if sensor_health['critical_failures']:
                print(f"  ❌ Critical Failures:")
                for failure in sensor_health['critical_failures']:
                    print(f"     - {failure}")
            
            # Step 1: Extract and prepare data from all sensors
            left_waist_accel = self._extract_accelerometer(sensor_data.get('LEFT_WAIST', []))
            right_waist_accel = self._extract_accelerometer(sensor_data.get('RIGHT_WAIST', []))
            
            # Extract gyroscope data for stability analysis
            left_waist_gyro = self._extract_gyroscope(sensor_data.get('LEFT_WAIST', []))
            right_waist_gyro = self._extract_gyroscope(sensor_data.get('RIGHT_WAIST', []))
            
            # Average waist sensors for overall gait analysis (similar to phone at hip)
            # If one side fails, use the working one
            combined_accel = self._combine_bilateral_sensors(left_waist_accel, right_waist_accel)
            combined_gyro = self._combine_bilateral_sensors(left_waist_gyro, right_waist_gyro)
            
            # Extract timestamps (try multiple sources if needed)
            timestamps = self._extract_timestamps_robust(sensor_data)
            
            # Calculate analysis duration
            if len(timestamps) > 1:
                analysis_duration = (timestamps[-1] - timestamps[0]) / 1000.0  # Convert ms to seconds
            else:
                analysis_duration = 0
            
            print(f"\n📊 Sensor Data Summary:")
            print(f"  Accelerometer samples: {len(combined_accel)}")
            print(f"  Gyroscope samples: {len(combined_gyro)}")
            print(f"  FSR sensors: {len(fsr_data) if fsr_data else 0}")
            print(f"  Duration: {analysis_duration:.2f}s")
            
            # Step 2: Detect steps using accelerometer + FSR (if available)
            if fsr_data and len(fsr_data) > 0:
                gait_phases, step_count = self._detect_steps_with_fsr(combined_accel, fsr_data, timestamps)
            else:
                gait_phases, step_count = self._detect_steps_acceleration(combined_accel, timestamps)
            
            # Step 3: Calculate cadence (steps per minute)
            if analysis_duration > 0:
                cadence = (step_count / analysis_duration) * 60
            else:
                cadence = 0
            
            # Step 4: Estimate stride length using step frequency
            stride_length = self._estimate_stride_length(combined_accel, step_count, analysis_duration)
            
            # Step 5: Calculate velocity (walking speed)
            if analysis_duration > 0:
                velocity = stride_length * step_count / analysis_duration
            else:
                velocity = 0
            
            # Step 6: Analyze bilateral symmetry (compare left vs right leg)
            gait_symmetry = self._analyze_bilateral_symmetry(
                sensor_data.get('LEFT_WAIST', []),
                sensor_data.get('RIGHT_WAIST', []),
                sensor_data.get('LEFT_KNEE', []),
                sensor_data.get('RIGHT_KNEE', [])
            )
            
            # Step 7: Calculate stability score using both accelerometer and gyroscope
            stability_score = self._calculate_stability_multi_sensor(combined_accel, combined_gyro, gait_phases)
            
            # Step 8: Calculate step regularity
            step_regularity = self._calculate_step_regularity(gait_phases)
            
            # Step 9: Calculate vertical oscillation (bounce)
            vertical_oscillation = self._calculate_vertical_oscillation(combined_accel)
            
            # Step 10: Assess data quality
            data_quality = self._assess_data_quality(step_count, analysis_duration, combined_accel)
            
            # Step 11: Build metrics dictionary for problem detection
            user_metrics = {
                'step_count': int(step_count),
                'cadence': round(cadence, 2),
                'stride_length': round(stride_length, 2),
                'velocity': round(velocity, 2),
                'gait_symmetry': round(gait_symmetry, 2),
                'stability_score': round(stability_score, 2),
                'step_regularity': round(step_regularity, 2),
                'vertical_oscillation': round(vertical_oscillation, 3)
            }
            
            # Step 12: Detect gait problems using PhysioNet baselines
            detected_problems = []
            problem_summary = {}
            
            if self.problem_detector and data_quality != 'insufficient_data':
                try:
                    print(f"\n🔍 Running PhysioNet problem detection...")
                    detected_problems = self.problem_detector.detect_problems(user_metrics)
                    detected_problems = self.problem_detector.prioritize_problems(detected_problems)
                    problem_summary = self.problem_detector.generate_summary(detected_problems)
                    
                    print(f"  Found {len(detected_problems)} problem(s)")
                    if problem_summary.get('severe_count', 0) > 0:
                        print(f"  ⚠️ {problem_summary['severe_count']} SEVERE issue(s)")
                    if problem_summary.get('moderate_count', 0) > 0:
                        print(f"  ℹ️  {problem_summary['moderate_count']} moderate issue(s)")
                except Exception as e:
                    print(f"  ⚠️ Problem detection failed: {e}")
            else:
                print(f"\n⏭️  Skipping problem detection (quality: {data_quality})")
            
            # Step 13: Build response matching mobile structure
            result = {
                'success': True,
                'data': {
                    'session_id': f"hardware_session_{int(datetime.now().timestamp() * 1000)}",
                    'user_id': user_id,
                    'metrics': user_metrics,
                    'sensors_used': {
                        'accelerometer': True,
                        'gyroscope': True,
                        'magnetometer': False,
                        'barometer': False,
                        'deviceMotion': False,
                        'pedometer': False
                    },
                    'sensor_health': sensor_health,  # Include health report
                    'gait_phases': gait_phases,
                    'analysis_duration': round(analysis_duration, 2),
                    'data_quality': data_quality,
                    'detected_problems': detected_problems,
                    'problem_summary': problem_summary
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Hardware gait analysis failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': 'Analysis failed',
                'message': 'Hardware gait analysis failed'
            }
    
    def _extract_accelerometer(self, sensor_data):
        """Extract acceleration vectors from sensor data"""
        if not sensor_data:
            return np.array([])
        
        accel = []
        for reading in sensor_data:
            if 'ax' in reading and 'ay' in reading and 'az' in reading:
                accel.append([reading['ax'], reading['ay'], reading['az']])
        
        return np.array(accel)
    
    def _extract_gyroscope(self, sensor_data):
        """Extract gyroscope vectors from sensor data"""
        if not sensor_data:
            return np.array([])
        
        gyro = []
        for reading in sensor_data:
            if 'gx' in reading and 'gy' in reading and 'gz' in reading:
                gyro.append([reading['gx'], reading['gy'], reading['gz']])
        
        return np.array(gyro)
    
    def _extract_timestamps(self, sensor_data):
        """Extract timestamps from sensor data"""
        if not sensor_data:
            return []
        
        return [reading.get('timestamp', 0) for reading in sensor_data]
    
    def _combine_bilateral_sensors(self, left_accel, right_accel):
        """Average left and right sensors to simulate single hip sensor"""
        if len(left_accel) == 0:
            return right_accel
        if len(right_accel) == 0:
            return left_accel
        
        # Average both sensors
        min_len = min(len(left_accel), len(right_accel))
        combined = (left_accel[:min_len] + right_accel[:min_len]) / 2
        return combined
    
    def _detect_steps_acceleration(self, accel_data, timestamps):
        """
        Detect steps from acceleration data using peak detection
        Returns gait_phases array and step count
        """
        if len(accel_data) < 10:
            return [], 0
        
        # Calculate magnitude of acceleration
        accel_magnitude = np.sqrt(np.sum(accel_data**2, axis=1))
        
        # Remove gravity component (subtract mean)
        accel_magnitude = accel_magnitude - np.mean(accel_magnitude)
        
        # Apply bandpass filter (0.5-3 Hz for walking)
        if len(accel_magnitude) > 20:
            sampling_rate = len(timestamps) / ((timestamps[-1] - timestamps[0]) / 1000.0)
            
            # Adjust filter cutoff based on Nyquist frequency
            nyquist = sampling_rate / 2.0
            low_cutoff = 0.5
            high_cutoff = min(3.0, nyquist * 0.9)  # Use 90% of Nyquist or 3.0, whichever is lower
            
            # Only apply filter if we have valid cutoff frequencies
            if low_cutoff < high_cutoff and low_cutoff < nyquist:
                sos = signal.butter(4, [low_cutoff, high_cutoff], 'bandpass', fs=sampling_rate, output='sos')
                filtered_accel = signal.sosfilt(sos, accel_magnitude)
            else:
                # If sampling rate too low for bandpass, just use highpass to remove DC
                if low_cutoff < nyquist:
                    sos = signal.butter(4, low_cutoff, 'highpass', fs=sampling_rate, output='sos')
                    filtered_accel = signal.sosfilt(sos, accel_magnitude)
                else:
                    filtered_accel = accel_magnitude
        else:
            filtered_accel = accel_magnitude
        
        # Find peaks (steps)
        peaks, _ = signal.find_peaks(filtered_accel, 
                                     height=self.min_step_threshold,
                                     distance=int(len(filtered_accel) / 100))  # Minimum distance between steps
        
        # Build gait_phases array matching mobile format
        gait_phases = []
        for i, peak_idx in enumerate(peaks):
            # Estimate stance phase (60% of gait cycle) and swing phase (40%)
            if i < len(peaks) - 1:
                next_peak = peaks[i + 1]
                stance_end = peak_idx + int((next_peak - peak_idx) * 0.6)
                
                gait_phases.append({
                    'step_number': i + 1,
                    'start_index': int(peak_idx),
                    'end_index': int(stance_end),
                    'duration': int(stance_end - peak_idx),
                    'phase': 'stance'
                })
                
                gait_phases.append({
                    'step_number': i + 1,
                    'start_index': int(stance_end),
                    'end_index': int(next_peak),
                    'duration': int(next_peak - stance_end),
                    'phase': 'swing'
                })
        
        return gait_phases, len(peaks)
    
    def _detect_steps_with_fsr(self, accel_data, fsr_data, timestamps):
        """
        Enhanced step detection using FSR pressure sensors
        FSR voltage drop = heel strike = step detected
        
        Args:
            accel_data: numpy array of acceleration data
            fsr_data: dict with keys like 'LEFT_HEEL', 'RIGHT_HEEL' containing voltage arrays
            timestamps: list of timestamps
        
        Returns:
            (gait_phases, step_count)
        """
        print(f"\\n🦶 FSR-based Step Detection:")
        
        # Check if FSR data is available
        if not fsr_data or 'LEFT_HEEL' not in fsr_data or 'RIGHT_HEEL' not in fsr_data:
            print("  ⚠️  No FSR data available, falling back to accelerometer")
            return self._detect_steps_acceleration(accel_data, timestamps)
        
        left_heel = np.array(fsr_data.get('LEFT_HEEL', []))
        right_heel = np.array(fsr_data.get('RIGHT_HEEL', []))
        
        if len(left_heel) < 10 or len(right_heel) < 10:
            print("  ⚠️  Insufficient FSR data, falling back to accelerometer")
            return self._detect_steps_acceleration(accel_data, timestamps)
        
        print(f"  LEFT_HEEL: {len(left_heel)} samples, range: {left_heel.min():.2f}V - {left_heel.max():.2f}V")
        print(f"  RIGHT_HEEL: {len(right_heel)} samples, range: {right_heel.min():.2f}V - {right_heel.max():.2f}V")
        
        # Detect steps from FSR voltage drops
        # FSR: High voltage = no pressure, Low voltage = pressure
        # Step = significant voltage drop
        
        steps = []
        
        # Detect LEFT foot steps
        left_baseline = left_heel[0]
        for i in range(1, len(left_heel)):
            voltage_drop = left_baseline - left_heel[i]
            
            if voltage_drop > 0.2:  # Step threshold
                steps.append({
                    'index': i,
                    'timestamp': timestamps[i] if i < len(timestamps) else timestamps[-1],
                    'foot': 'left',
                    'voltage_drop': voltage_drop
                })
                left_baseline = left_heel[i]
            elif left_heel[i] > left_baseline + 0.15:  # Foot lifted
                left_baseline = left_heel[i]
        
        # Detect RIGHT foot steps
        right_baseline = right_heel[0]
        for i in range(1, len(right_heel)):
            voltage_drop = right_baseline - right_heel[i]
            
            if voltage_drop > 0.2:  # Step threshold
                steps.append({
                    'index': i,
                    'timestamp': timestamps[i] if i < len(timestamps) else timestamps[-1],
                    'foot': 'right',
                    'voltage_drop': voltage_drop
                })
                right_baseline = right_heel[i]
            elif right_heel[i] > right_baseline + 0.15:  # Foot lifted
                right_baseline = right_heel[i]
        
        # Sort steps by timestamp
        steps.sort(key=lambda x: x['index'])
        
        step_count = len(steps)
        print(f"  ✅ Detected {step_count} steps from FSR sensors")
        
        # Build gait_phases array
        gait_phases = []
        for i, step in enumerate(steps):
            # Estimate stance phase duration (60% of step cycle)
            if i < len(steps) - 1:
                next_step_idx = steps[i + 1]['index']
                stance_duration = int((next_step_idx - step['index']) * 0.6)
                stance_end = step['index'] + stance_duration
                
                gait_phases.append({
                    'step_number': i + 1,
                    'start_index': int(step['index']),
                    'end_index': int(stance_end),
                    'duration': stance_duration,
                    'phase': 'stance',
                    'foot': step['foot']
                })
                
                gait_phases.append({
                    'step_number': i + 1,
                    'start_index': int(stance_end),
                    'end_index': int(next_step_idx),
                    'duration': int(next_step_idx - stance_end),
                    'phase': 'swing',
                    'foot': step['foot']
                })
        
        return gait_phases, step_count
    
    def _estimate_stride_length(self, accel_data, step_count, duration):
        """
        Estimate stride length using inverted pendulum model
        Similar to mobile implementation
        """
        if len(accel_data) == 0 or step_count == 0:
            return 0
        
        # Calculate vertical acceleration variance
        vertical_accel = accel_data[:, 2] if accel_data.shape[1] > 2 else accel_data[:, 0]
        vertical_variance = np.var(vertical_accel)
        
        # Inverted pendulum model: stride_length ≈ k * sqrt(variance)
        # Empirical constant k ≈ 0.5 for normal walking
        stride_length = 0.5 * np.sqrt(vertical_variance)
        
        # Clamp to reasonable values (0.3m to 2.0m)
        stride_length = max(0.3, min(2.0, stride_length))
        
        return stride_length
    
    def _analyze_bilateral_symmetry(self, left_waist, right_waist, left_knee, right_knee):
        """
        Compare left vs right leg sensors to calculate symmetry
        Returns 0-1 score (1 = perfect symmetry)
        """
        if not left_waist or not right_waist:
            return 0.8  # Default value if data missing
        
        left_accel = self._extract_accelerometer(left_waist)
        right_accel = self._extract_accelerometer(right_waist)
        
        if len(left_accel) == 0 or len(right_accel) == 0:
            return 0.8
        
        # Calculate magnitude for each leg
        min_len = min(len(left_accel), len(right_accel))
        left_mag = np.sqrt(np.sum(left_accel[:min_len]**2, axis=1))
        right_mag = np.sqrt(np.sum(right_accel[:min_len]**2, axis=1))
        
        # Calculate correlation between left and right
        if len(left_mag) > 1 and len(right_mag) > 1:
            correlation = np.corrcoef(left_mag, right_mag)[0, 1]
            # Convert correlation to symmetry score (0-1)
            symmetry = (correlation + 1) / 2  # Map [-1, 1] to [0, 1]
        else:
            symmetry = 0.8
        
        return max(0, min(1, symmetry))
    
    def _calculate_stability(self, accel_data, gait_phases):
        """Legacy stability calculation using only accelerometer (kept for fallback)"""
        if len(accel_data) == 0:
            return 0.5
        
        accel_magnitude = np.sqrt(np.sum(accel_data**2, axis=1))
        jerk = np.diff(accel_magnitude)
        jerk_std = np.std(jerk) if len(jerk) > 0 else 1.0
        stability = 1.0 / (1.0 + jerk_std)
        
        return max(0, min(1, stability))
    
    def _calculate_stability_multi_sensor(self, accel_data, gyro_data, gait_phases):
        """Enhanced stability calculation using both accelerometer and gyroscope"""
        if len(accel_data) == 0:
            return 0.5
        
        # Calculate acceleration-based stability (smoothness)
        accel_magnitude = np.sqrt(np.sum(accel_data**2, axis=1))
        jerk = np.diff(accel_magnitude)
        jerk_std = np.std(jerk) if len(jerk) > 0 else 1.0
        accel_stability = 1.0 / (1.0 + jerk_std)
        
        # Calculate gyroscope-based stability (angular smoothness)
        gyro_stability = 0.5  # Default if no gyro data
        if len(gyro_data) > 0:
            gyro_magnitude = np.sqrt(np.sum(gyro_data**2, axis=1))
            angular_jerk = np.diff(gyro_magnitude)
            angular_jerk_std = np.std(angular_jerk) if len(angular_jerk) > 0 else 1.0
            gyro_stability = 1.0 / (1.0 + angular_jerk_std * 0.5)  # Weight gyro less than accel
        
        # Combine both (70% accel, 30% gyro)
        combined_stability = 0.7 * accel_stability + 0.3 * gyro_stability
        
        return max(0, min(1, combined_stability))
    
    def _calculate_step_regularity(self, gait_phases):
        """
        Calculate how consistent steps are
        Returns 0-1 score (1 = perfectly regular)
        """
        if len(gait_phases) < 2:
            return 0.5
        
        # Extract step durations
        durations = [phase['duration'] for phase in gait_phases if phase['phase'] == 'stance']
        
        if len(durations) < 2:
            return 0.5
        
        # Calculate coefficient of variation (CV)
        mean_duration = np.mean(durations)
        std_duration = np.std(durations)
        
        if mean_duration == 0:
            return 0.5
        
        cv = std_duration / mean_duration
        
        # Convert CV to regularity score (lower CV = higher regularity)
        regularity = 1.0 / (1.0 + cv)
        
        return max(0, min(1, regularity))
    
    def _calculate_vertical_oscillation(self, accel_data):
        """
        Calculate vertical bounce during walking
        Returns oscillation in meters
        """
        if len(accel_data) == 0:
            return 0
        
        # Vertical is Z-axis (index 2)
        vertical_accel = accel_data[:, 2] if accel_data.shape[1] > 2 else accel_data[:, 0]
        
        # Double integration to get displacement (simplified)
        # oscillation ≈ standard deviation of vertical acceleration
        oscillation = np.std(vertical_accel) / self.gravity
        
        return max(0, min(0.2, oscillation))  # Clamp to 0-20cm
    
    def _assess_data_quality(self, step_count, duration, accel_data):
        """
        Assess overall data quality
        Returns 'excellent', 'good', 'fair', or 'poor'
        """
        if duration < 10:
            return 'poor'  # Too short
        
        if step_count < 5:
            return 'poor'  # Too few steps
        
        if len(accel_data) < 50:
            return 'poor'  # Too little data
        
        # Check cadence
        cadence = (step_count / duration) * 60
        
        if cadence < 60 or cadence > 150:
            return 'fair'  # Abnormal cadence
        
        if duration > 30 and step_count > 20:
            return 'excellent'
        elif duration > 15 and step_count > 10:
            return 'good'
        else:
            return 'fair'
    
    def _check_sensor_health(self, sensor_data, fsr_data):
        """
        Check health of all sensors and report issues
        Returns dict with sensor status and warnings
        """
        health = {
            'working_count': 0,
            'total_sensors': 12,  # 6 IMU + 6 FSR
            'warnings': [],
            'critical_failures': [],
            'sensor_status': {}
        }
        
        # Check IMU sensors (6 sensors: LEFT_WAIST, RIGHT_WAIST, LEFT_KNEE, RIGHT_KNEE, LEFT_TOE, RIGHT_TOE)
        imu_sensors = ['LEFT_WAIST', 'RIGHT_WAIST', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_TOE', 'RIGHT_TOE']
        for sensor in imu_sensors:
            data = sensor_data.get(sensor, [])
            if len(data) > 10:
                health['working_count'] += 1
                health['sensor_status'][sensor] = 'working'
            elif len(data) > 0:
                health['warnings'].append(f"{sensor} has low data ({len(data)} samples)")
                health['sensor_status'][sensor] = 'degraded'
            else:
                health['warnings'].append(f"{sensor} is not responding")
                health['sensor_status'][sensor] = 'failed'
        
        # Check FSR sensors (6 sensors: LEFT_HEEL, LEFT_MID, LEFT_TOE, RIGHT_HEEL, RIGHT_MID, RIGHT_TOE)
        if fsr_data:
            fsr_sensors = ['LEFT_HEEL', 'LEFT_MID', 'LEFT_TOE', 'RIGHT_HEEL', 'RIGHT_MID', 'RIGHT_TOE']
            for sensor in fsr_sensors:
                data = fsr_data.get(sensor, [])
                if len(data) > 10:
                    health['working_count'] += 1
                    health['sensor_status'][f"FSR_{sensor}"] = 'working'
                elif len(data) > 0:
                    health['warnings'].append(f"FSR {sensor} has low data ({len(data)} samples)")
                    health['sensor_status'][f"FSR_{sensor}"] = 'degraded'
                else:
                    health['warnings'].append(f"FSR {sensor} is not responding")
                    health['sensor_status'][f"FSR_{sensor}"] = 'failed'
        else:
            health['warnings'].append("No FSR sensor data available")
        
        # Check for critical failures
        # Need at least ONE waist sensor for basic analysis
        if health['sensor_status'].get('LEFT_WAIST') == 'failed' and health['sensor_status'].get('RIGHT_WAIST') == 'failed':
            health['critical_failures'].append("Both waist sensors failed - cannot perform analysis")
        
        # Add recommendations based on failures
        if len(health['warnings']) > 6:
            health['critical_failures'].append("More than half of sensors are malfunctioning - check hardware connections")
        
        return health
    
    def _extract_timestamps_robust(self, sensor_data):
        """
        Extract timestamps from any available sensor (robust fallback)
        """
        # Try sensors in priority order
        priority_sensors = ['LEFT_WAIST', 'RIGHT_WAIST', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_TOE', 'RIGHT_TOE']
        
        for sensor_name in priority_sensors:
            timestamps = self._extract_timestamps(sensor_data.get(sensor_name, []))
            if len(timestamps) > 0:
                return timestamps
        
        # If no timestamps found, return empty list
        return []
