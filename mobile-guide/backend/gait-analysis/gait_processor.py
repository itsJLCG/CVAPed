"""
Gait Processor - Core logic for gait analysis
Processes sensor data and extracts gait parameters
"""

import numpy as np
from scipy import signal
from scipy.fft import fft, fftfreq
import json
from datetime import datetime
from typing import Dict, List, Any


class GaitProcessor:
    """
    Processes accelerometer and gyroscope data to analyze gait patterns
    """
    
    def __init__(self):
        self.sampling_rate = 50  # Hz, typical for mobile sensors
        self.history = []
        
    def analyze(self, accelerometer: List[Dict], gyroscope: List[Dict], 
                user_id: str, session_id: str, magnetometer: List[Dict] = None,
                barometer: List[Dict] = None, deviceMotion: List[Dict] = None,
                pedometer: Dict = None) -> Dict[str, Any]:
        """
        Comprehensive gait analysis with multi-sensor fusion
        
        Args:
            accelerometer: Raw accelerometer data
            gyroscope: Raw gyroscope data
            magnetometer: Magnetometer data for orientation (optional)
            barometer: Barometer data for elevation changes (optional)
            deviceMotion: Filtered device motion data (optional)
            pedometer: Step count from device pedometer (optional)
        
        Returns:
            Dictionary containing:
            - step_count: Number of steps detected
            - cadence: Steps per minute
            - stride_length: Estimated stride length
            - gait_symmetry: Symmetry score (0-1)
            - stability_score: Balance/stability metric
            - velocity: Walking speed
            - gait_phases: Detected gait cycle phases
            - heading_variation: Directional changes during walking
            - elevation_change: Altitude change if available
        """
        
        print(f"\n📊 Starting Gait Analysis Processing:")
        print(f"  Accelerometer samples: {len(accelerometer)}")
        print(f"  Gyroscope samples: {len(gyroscope)}")
        print(f"  Magnetometer samples: {len(magnetometer) if magnetometer else 0}")
        print(f"  Barometer samples: {len(barometer) if barometer else 0}")
        print(f"  DeviceMotion samples: {len(deviceMotion) if deviceMotion else 0}")
        print(f"  Pedometer steps: {pedometer.get('steps', 0) if pedometer else 0}")
        
        # Convert to numpy arrays
        accel_data = self._convert_to_arrays(accelerometer)
        gyro_data = self._convert_to_arrays(gyroscope)
        
        # Process optional sensor data
        mag_data = self._convert_to_arrays(magnetometer) if magnetometer else None
        baro_data = self._convert_barometer_data(barometer) if barometer else None
        motion_data = self._convert_device_motion_data(deviceMotion) if deviceMotion else None
        
        # Calculate actual sampling rate from timestamps
        actual_sampling_rate = self._calculate_sampling_rate(accelerometer)
        if actual_sampling_rate > 0:
            print(f"  Calculated sampling rate: {actual_sampling_rate:.2f} Hz")
            self.sampling_rate = actual_sampling_rate
        else:
            print(f"  Using default sampling rate: {self.sampling_rate} Hz")
        
        # Calculate magnitude for step detection
        accel_magnitude = self._calculate_magnitude(accel_data)
        print(f"  Acceleration magnitude calculated: {len(accel_magnitude)} points")
        
        # Detect steps
        steps = self._detect_steps(accel_magnitude)
        step_count = len(steps)
        
        # Calculate cadence (steps per minute)
        duration = self._calculate_duration(accelerometer)
        cadence = (step_count / duration) * 60 if duration > 0 else 0
        
        # Estimate stride length and velocity
        stride_length = self._estimate_stride_length(accel_data, steps)
        velocity = self._calculate_velocity(stride_length, cadence)
        
        # Analyze gait symmetry
        symmetry_score = self._analyze_symmetry(accel_data, steps)
        
        # Calculate stability using gyroscope data
        stability_score = self._calculate_stability(gyro_data)
        
        # Detect gait phases (stance, swing)
        gait_phases = self._detect_gait_phases(accel_data, steps)
        
        # Additional metrics
        step_regularity = self._calculate_step_regularity(steps)
        vertical_oscillation = self._calculate_vertical_oscillation(accel_data)
        
        # Multi-sensor fusion metrics
        heading_variation = self._calculate_heading_variation(mag_data) if mag_data else 0.0
        elevation_change = self._calculate_elevation_change(baro_data) if baro_data else 0.0
        
        # Use pedometer data if available for validation
        pedometer_steps = pedometer.get('steps', 0) if pedometer else 0
        
        # Compile results
        result = {
            'session_id': session_id,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'metrics': {
                'step_count': int(step_count),
                'cadence': round(cadence, 2),
                'stride_length': round(stride_length, 2),
                'velocity': round(velocity, 2),
                'gait_symmetry': round(symmetry_score, 2),
                'stability_score': round(stability_score, 2),
                'step_regularity': round(step_regularity, 2),
                'vertical_oscillation': round(vertical_oscillation, 2),
                'heading_variation': round(heading_variation, 2),
                'elevation_change': round(elevation_change, 2),
                'pedometer_steps': pedometer_steps
            },
            'gait_phases': gait_phases,
            'analysis_duration': round(duration, 2),
            'data_quality': self._assess_data_quality(accelerometer, gyroscope),
            'sensors_used': {
                'accelerometer': True,
                'gyroscope': True,
                'magnetometer': mag_data is not None,
                'barometer': baro_data is not None,
                'deviceMotion': motion_data is not None,
                'pedometer': pedometer_steps > 0
            }
        }
        
        # Store in history
        self._add_to_history(result)
        
        return result
    
    def process_realtime(self, accelerometer: Dict, gyroscope: Dict) -> Dict[str, Any]:
        """
        Process a single sensor reading for real-time feedback
        """
        accel = np.array([accelerometer.get('x', 0), 
                         accelerometer.get('y', 0), 
                         accelerometer.get('z', 0)])
        
        gyro = np.array([gyroscope.get('x', 0), 
                        gyroscope.get('y', 0), 
                        gyroscope.get('z', 0)])
        
        # Calculate instantaneous metrics
        accel_magnitude = np.linalg.norm(accel)
        gyro_magnitude = np.linalg.norm(gyro)
        
        # Simple step detection threshold
        step_detected = accel_magnitude > 1.2  # g-force threshold
        
        return {
            'accelerometer_magnitude': round(accel_magnitude, 3),
            'gyroscope_magnitude': round(gyro_magnitude, 3),
            'step_detected': step_detected,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_user_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Retrieve user's gait analysis history"""
        user_sessions = [h for h in self.history if h.get('user_id') == user_id]
        return user_sessions[-limit:]
    
    # ============ Helper Methods ============
    
    def _convert_to_arrays(self, sensor_data: List[Dict]) -> Dict[str, np.ndarray]:
        """Convert sensor data list to numpy arrays"""
        if not sensor_data:
            return {'x': np.array([]), 'y': np.array([]), 'z': np.array([]), 'time': np.array([])}
        
        return {
            'x': np.array([d.get('x', 0) for d in sensor_data]),
            'y': np.array([d.get('y', 0) for d in sensor_data]),
            'z': np.array([d.get('z', 0) for d in sensor_data]),
            'time': np.array([d.get('timestamp', i) for i, d in enumerate(sensor_data)])
        }
    
    def _calculate_magnitude(self, data: Dict[str, np.ndarray]) -> np.ndarray:
        """Calculate magnitude from 3-axis data"""
        return np.sqrt(data['x']**2 + data['y']**2 + data['z']**2)
    
    def _detect_steps(self, magnitude: np.ndarray) -> List[int]:
        """Detect steps using peak detection"""
        if len(magnitude) < 2:
            print("❌ Not enough magnitude data for step detection")
            return []
        
        print(f"\n🔍 Step Detection Debug:")
        print(f"  Magnitude array length: {len(magnitude)}")
        print(f"  Magnitude range: {np.min(magnitude):.3f} - {np.max(magnitude):.3f}")
        print(f"  Magnitude mean: {np.mean(magnitude):.3f}")
        print(f"  Magnitude std: {np.std(magnitude):.3f}")
        
        # Apply bandpass filter to remove noise
        filtered = self._bandpass_filter(magnitude)
        print(f"  Filtered range: {np.min(filtered):.3f} - {np.max(filtered):.3f}")
        print(f"  Filtered mean: {np.mean(filtered):.3f}")
        print(f"  Filtered std: {np.std(filtered):.3f}")
        
        # Find peaks with relaxed parameters for better detection
        # Adjusted parameters: lower distance (10 samples ~0.2s) and prominence (0.1)
        peaks, properties = signal.find_peaks(filtered, distance=10, prominence=0.1)
        
        print(f"  Peaks found: {len(peaks)}")
        if len(peaks) > 0:
            print(f"  Peak positions: {peaks[:10]}...")  # Show first 10
            print(f"  Peak prominences: {properties['prominences'][:10]}")
        else:
            print(f"  ⚠️ No peaks detected! Trying with lower prominence...")
            # Try again with even lower threshold
            peaks, properties = signal.find_peaks(filtered, distance=10, prominence=0.05)
            print(f"  Peaks with lower threshold: {len(peaks)}")
        
        return peaks.tolist()
    
    def _bandpass_filter(self, data: np.ndarray, lowcut=0.5, highcut=3.0) -> np.ndarray:
        """Apply bandpass filter to isolate walking frequency"""
        if len(data) < 10:
            print("  ⚠️ Not enough data for filtering, returning raw data")
            return data
        
        nyquist = self.sampling_rate / 2
        low = lowcut / nyquist
        high = highcut / nyquist
        
        print(f"  Applying bandpass filter: {lowcut}-{highcut} Hz (normalized: {low:.3f}-{high:.3f})")
        
        try:
            b, a = signal.butter(4, [low, high], btype='band')
            filtered = signal.filtfilt(b, a, data)
            print(f"  ✓ Filter applied successfully")
            return filtered
        except Exception as e:
            print(f"  ❌ Filter failed: {e}, returning raw data")
            return data
    
    def _calculate_duration(self, sensor_data: List[Dict]) -> float:
        """Calculate duration of recording in seconds"""
        if len(sensor_data) < 2:
            return 0.0
        
        start_time = sensor_data[0].get('timestamp', 0)
        end_time = sensor_data[-1].get('timestamp', 0)
        
        return (end_time - start_time) / 1000.0  # Convert ms to seconds
    
    def _calculate_sampling_rate(self, sensor_data: List[Dict]) -> float:
        """Calculate actual sampling rate from timestamps"""
        if len(sensor_data) < 10:
            return 0.0
        
        # Use first 10 samples to calculate average sampling rate
        timestamps = [sensor_data[i].get('timestamp', 0) for i in range(min(10, len(sensor_data)))]
        intervals = np.diff(timestamps)  # Time between samples in ms
        
        if len(intervals) == 0 or np.mean(intervals) == 0:
            return 0.0
        
        avg_interval_ms = np.mean(intervals)
        sampling_rate = 1000.0 / avg_interval_ms  # Convert to Hz
        
        return sampling_rate
    
    def _estimate_stride_length(self, accel_data: Dict[str, np.ndarray], 
                                steps: List[int]) -> float:
        """Estimate stride length using accelerometer data"""
        if len(steps) < 2:
            return 0.0
        
        # Simplified stride length estimation
        # In practice, this would use double integration of acceleration
        vertical_accel = accel_data['y']  # Assuming Y is vertical
        
        if len(vertical_accel) == 0:
            return 0.0
        
        # Basic estimation: higher variation suggests longer strides
        step_variance = np.std(vertical_accel)
        estimated_stride = 0.5 + (step_variance * 0.3)  # meters
        
        return min(estimated_stride, 2.0)  # Cap at reasonable maximum
    
    def _calculate_velocity(self, stride_length: float, cadence: float) -> float:
        """Calculate walking velocity in m/s"""
        # velocity = (stride_length * cadence) / 60
        return (stride_length * cadence) / 60.0
    
    def _analyze_symmetry(self, accel_data: Dict[str, np.ndarray], 
                         steps: List[int]) -> float:
        """Analyze gait symmetry (left-right balance)"""
        if len(steps) < 4:
            return 0.5  # Default neutral score
        
        # Calculate step intervals
        step_intervals = np.diff(steps)
        
        if len(step_intervals) < 2:
            return 0.5
        
        # Analyze alternating pattern
        even_steps = step_intervals[::2]
        odd_steps = step_intervals[1::2]
        
        min_len = min(len(even_steps), len(odd_steps))
        if min_len == 0:
            return 0.5
        
        # Symmetry = 1 - normalized difference
        symmetry = 1.0 - min(abs(np.mean(even_steps[:min_len]) - 
                                 np.mean(odd_steps[:min_len])) / 10.0, 1.0)
        
        return max(0.0, min(1.0, symmetry))
    
    def _calculate_stability(self, gyro_data: Dict[str, np.ndarray]) -> float:
        """Calculate stability score from gyroscope data"""
        if len(gyro_data['x']) == 0:
            return 0.5
        
        # Lower gyroscope variation indicates better stability
        gyro_magnitude = self._calculate_magnitude(gyro_data)
        variability = np.std(gyro_magnitude)
        
        # Normalize to 0-1 scale (inverse relationship)
        stability = 1.0 - min(variability / 5.0, 1.0)
        
        return max(0.0, min(1.0, stability))
    
    def _detect_gait_phases(self, accel_data: Dict[str, np.ndarray], 
                           steps: List[int]) -> List[Dict]:
        """Detect stance and swing phases"""
        phases = []
        
        for i in range(len(steps) - 1):
            start_idx = steps[i]
            end_idx = steps[i + 1]
            
            phases.append({
                'step_number': i + 1,
                'start_index': int(start_idx),
                'end_index': int(end_idx),
                'duration': int(end_idx - start_idx),
                'phase': 'stance' if i % 2 == 0 else 'swing'
            })
        
        return phases
    
    def _calculate_step_regularity(self, steps: List[int]) -> float:
        """Calculate how regular/consistent the steps are"""
        if len(steps) < 3:
            return 0.5
        
        step_intervals = np.diff(steps)
        regularity = 1.0 - min(np.std(step_intervals) / np.mean(step_intervals), 1.0)
        
        return max(0.0, min(1.0, regularity))
    
    def _calculate_vertical_oscillation(self, accel_data: Dict[str, np.ndarray]) -> float:
        """Calculate vertical oscillation (bounce) in meters"""
        if len(accel_data['y']) == 0:
            return 0.0
        
        vertical = accel_data['y']
        oscillation = np.std(vertical) * 0.05  # Simplified calculation
        
        return oscillation
    
    def _assess_data_quality(self, accel: List[Dict], gyro: List[Dict]) -> str:
        """Assess quality of sensor data"""
        min_samples = 50
        
        if len(accel) < min_samples or len(gyro) < min_samples:
            return 'poor'
        elif len(accel) < 100 or len(gyro) < 100:
            return 'fair'
        elif len(accel) < 200 or len(gyro) < 200:
            return 'good'
        else:
            return 'excellent'
    
    def _add_to_history(self, result: Dict) -> None:
        """Add analysis result to history"""
        self.history.append(result)
        # Keep only last 100 sessions
        if len(self.history) > 100:
            self.history = self.history[-100:]
    
    def _convert_barometer_data(self, barometer_data: List[Dict]) -> Dict[str, np.ndarray]:
        """Convert barometer data to numpy arrays"""
        if not barometer_data:
            return {'pressure': np.array([]), 'altitude': np.array([]), 'time': np.array([])}
        
        return {
            'pressure': np.array([d.get('pressure', 0) for d in barometer_data]),
            'altitude': np.array([d.get('relativeAltitude', 0) for d in barometer_data]),
            'time': np.array([d.get('timestamp', i) for i, d in enumerate(barometer_data)])
        }
    
    def _convert_device_motion_data(self, motion_data: List[Dict]) -> Dict:
        """Convert device motion data to structured format"""
        if not motion_data:
            return None
        
        return {
            'acceleration': np.array([[d.get('acceleration', {}).get(axis, 0) 
                                      for axis in ['x', 'y', 'z']] 
                                     for d in motion_data]),
            'rotation': np.array([[d.get('rotation', {}).get(axis, 0) 
                                  for axis in ['alpha', 'beta', 'gamma']] 
                                 for d in motion_data]),
            'time': np.array([d.get('timestamp', i) for i, d in enumerate(motion_data)])
        }
    
    def _calculate_heading_variation(self, mag_data: Dict[str, np.ndarray]) -> float:
        """Calculate variation in heading/orientation during walk"""
        if mag_data is None or len(mag_data['x']) == 0:
            return 0.0
        
        # Calculate heading from magnetometer data
        headings = np.arctan2(mag_data['y'], mag_data['x'])
        
        # Calculate variation (standard deviation of headings)
        # Lower variation = straighter walking path
        heading_std = np.std(headings)
        
        # Normalize to 0-1 scale (0 = very straight, 1 = very curved)
        variation = min(heading_std / np.pi, 1.0)
        
        return variation
    
    def _calculate_elevation_change(self, baro_data: Dict[str, np.ndarray]) -> float:
        """Calculate total elevation change from barometer data"""
        if baro_data is None or len(baro_data['altitude']) < 2:
            return 0.0
        
        # Calculate total elevation change
        altitude = baro_data['altitude']
        elevation_change = altitude[-1] - altitude[0]
        
        return elevation_change

