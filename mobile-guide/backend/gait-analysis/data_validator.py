"""
Data Validator - Validates incoming sensor data
"""

from typing import Dict, List, Any


def validate_sensor_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate sensor data payload
    
    Returns:
        Dictionary with 'valid' (bool) and 'errors' (list) keys
    """
    errors = []
    
    # Check if data exists
    if not data:
        errors.append("No data provided")
        return {'valid': False, 'errors': errors}
    
    # Check for required fields
    accelerometer = data.get('accelerometer')
    gyroscope = data.get('gyroscope')
    
    if not accelerometer and not gyroscope:
        errors.append("At least one sensor type (accelerometer or gyroscope) is required")
    
    # Validate accelerometer data
    if accelerometer:
        accel_errors = _validate_sensor_array(accelerometer, 'accelerometer')
        errors.extend(accel_errors)
    
    # Validate gyroscope data
    if gyroscope:
        gyro_errors = _validate_sensor_array(gyroscope, 'gyroscope')
        errors.extend(gyro_errors)
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def _validate_sensor_array(sensor_data: Any, sensor_type: str) -> List[str]:
    """Validate individual sensor data array"""
    errors = []
    
    # Check if it's a list
    if not isinstance(sensor_data, list):
        errors.append(f"{sensor_type} must be an array")
        return errors
    
    # Check if not empty
    if len(sensor_data) == 0:
        errors.append(f"{sensor_type} array is empty")
        return errors
    
    # Validate each reading
    required_fields = ['x', 'y', 'z']
    
    for i, reading in enumerate(sensor_data[:5]):  # Check first 5 samples
        if not isinstance(reading, dict):
            errors.append(f"{sensor_type}[{i}] must be an object")
            continue
        
        # Check for required fields
        for field in required_fields:
            if field not in reading:
                errors.append(f"{sensor_type}[{i}] missing '{field}' field")
            elif not isinstance(reading[field], (int, float)):
                errors.append(f"{sensor_type}[{i}].{field} must be a number")
    
    return errors
