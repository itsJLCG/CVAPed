"""
Hardware Exercise Compatibility Filter
Filters exercises based on available sensor setup: 2x Foot IMUs + 8x FSR sensors

Hardware Setup:
- RIGHT FOOT: MPU6050 IMU + 4 FSR sensors (heel, mid-front, toe-left, toe-right)
- LEFT FOOT: MPU6050 IMU + 4 FSR sensors (heel, mid-front, toe-left, toe-right)

Detectable Metrics:
✓ Step timing & cadence (FSR + IMU)
✓ Weight distribution (FSR pressure)
✓ Foot strike patterns (FSR sequence)
✓ Foot clearance height (IMU acceleration)
✓ Stride length estimation (IMU integration)
✓ Gait symmetry (L/R comparison)
✓ Step regularity (timing variance)

Non-Detectable:
✗ Knee angles (no knee sensors)
✗ Hip movement (no hip/waist sensors)
✗ Upper body posture (no torso sensors)
✗ Single-leg stance quality (need center of mass tracking)
"""

import json
from pathlib import Path


class HardwareExerciseFilter:
    """Filter exercises based on foot-mounted sensor capabilities"""
    
    # Define hardware compatibility for each exercise ID
    HARDWARE_COMPATIBILITY = {
        # SLOW CADENCE EXERCISES
        'cadence_001': {  # Metronome-Paced Walking
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['cadence', 'step_timing', 'step_count', 'symmetry'],
            'reason': 'Perfect for FSR step detection + rhythm tracking - no equipment needed'
        },
        'cadence_002': {  # High Knee Marching
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['knee_imu', 'hip_sensors'],
            'detectable_metrics': [],
            'reason': 'Requires knee angle tracking to validate hip-level knee lifts - foot sensors cannot measure knee height'
        },
        'cadence_003': {  # Fast Stepping Drills
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['cadence', 'step_regularity', 'speed_bursts'],
            'reason': 'Excellent FSR step detection + acceleration tracking - perfect for quick steps'
        },
        'cadence_004': {  # Interval Walking
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['cadence_change', 'interval_detection', 'endurance'],
            'reason': 'Can detect cadence variations between fast/slow intervals perfectly'
        },
        
        # ASYMMETRIC GAIT EXERCISES
        'asymmetry_001': {  # Single-Leg Stance
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['waist_imu', 'hip_sensors'],
            'detectable_metrics': [],
            'reason': 'Needs center of mass tracking - foot sensors cannot validate balance quality'
        },
        'asymmetry_002': {  # Weight-Shifting Drills
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr'],
            'detectable_metrics': ['weight_distribution', 'shift_timing', 'pressure_ratio'],
            'reason': 'FSR directly measures pressure shifts - PERFECT for this exercise'
        },
        'asymmetry_003': {  # Mirror Walking
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['step_symmetry', 'timing_symmetry', 'stride_symmetry'],
            'reason': 'Can track L/R symmetry but cannot verify mirror visual feedback'
        },
        
        # SHORT STRIDE EXERCISES
        'stride_001': {  # Lunge Walking
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_imu', 'foot_fsr'],
            'detectable_metrics': ['stride_length', 'foot_angle', 'weight_transfer'],
            'reason': 'IMU detects forward movement, FSR detects weight shift during lunge'
        },
        'stride_002': {  # Step-Over Obstacles
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_imu'],
            'detectable_metrics': ['foot_clearance', 'step_height', 'landing_impact'],
            'reason': 'IMU Z-axis acceleration perfectly measures foot lift height'
        },
        'stride_003': {  # Visual Target Stepping
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['stride_length_variation', 'step_placement', 'timing'],
            'reason': 'Can measure stride variations but cannot verify visual targets'
        },
        
        # SLOW VELOCITY EXERCISES
        'velocity_001': {  # Progressive Treadmill Training
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['treadmill'],
            'detectable_metrics': [],
            'reason': 'Requires treadmill equipment - not accessible to all users, cannot verify treadmill speed'
        },
        'velocity_002': {  # Overground Speed Walking
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['burst_speed', 'step_frequency', 'acceleration', 'stride_speed'],
            'reason': 'FSR + IMU perfectly detect rapid stepping and speed variations - no equipment needed'
        },
        
        # POOR STABILITY EXERCISES
        'stability_001': {  # Tandem Walking
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['waist_imu'],
            'detectable_metrics': [],
            'reason': 'Needs torso sway measurement - foot sensors cannot validate balance'
        },
        'stability_002': {  # Standing Heel Raises
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['heel_lift', 'toe_pressure', 'repetitions'],
            'reason': 'FSR detects toe pressure increase, IMU detects tilt - partial validation'
        },
        'stability_003': {  # Wall-Supported Side Steps (Lateral Steps)
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_imu'],
            'detectable_metrics': ['lateral_movement', 'step_direction', 'step_count'],
            'reason': 'IMU detects lateral acceleration but cannot verify wall contact'
        },
        
        # IRREGULAR STEPS / GAIT PATTERN EXERCISES
        'gait_001': {  # Heel-Strike Walking
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr'],
            'detectable_metrics': ['heel_first_contact', 'heel_toe_sequence', 'strike_pattern'],
            'reason': 'FSR PERFECTLY detects heel-strike pattern - IDEAL for this hardware'
        },
        'gait_002': {  # Toe-Push-Off Drills
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr'],
            'detectable_metrics': ['toe_pressure', 'push_off_force', 'sequence_timing'],
            'reason': 'FSR toe sensors directly measure push-off force'
        },
        
        # ADDITIONAL EXERCISES (from frontend ExercisePlans.jsx)
        'ex-001': {  # Single-Leg Stance (duplicate of asymmetry_001)
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['waist_imu'],
            'detectable_metrics': [],
            'reason': 'Cannot validate single-leg balance without CoM tracking'
        },
        'ex-002': {  # Tandem Walking (duplicate of stability_001)
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['waist_imu'],
            'detectable_metrics': [],
            'reason': 'Cannot validate balance without torso sensors'
        },
        'ex-003': {  # Weight-Shifting Drills (duplicate of asymmetry_002)
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr'],
            'detectable_metrics': ['weight_distribution', 'shift_timing', 'pressure_ratio'],
            'reason': 'PERFECT - FSR directly measures pressure distribution'
        },
        'ex-005': {  # High Knee Marching (duplicate of velocity_001)
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['knee_imu'],
            'detectable_metrics': [],
            'reason': 'Needs knee sensors'
        },
        'ex-006': {  # Calf Raises
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['heel_lift', 'toe_pressure', 'ankle_angle'],
            'reason': 'FSR + IMU can detect raises, but limited ankle angle accuracy'
        },
        'ex-007': {  # Step-Ups
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['knee_imu', 'hip_sensors'],
            'detectable_metrics': [],
            'reason': 'Cannot detect step-up height or knee bend without leg sensors'
        },
        'ex-008': {  # Quick Step Drills (duplicate of velocity_002)
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['burst_speed', 'step_frequency'],
            'reason': 'Excellent detection'
        },
        'ex-009': {  # Lunge Walking (duplicate of stride_001)
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_imu', 'foot_fsr'],
            'detectable_metrics': ['stride_length', 'weight_transfer'],
            'reason': 'Can detect movement but not full lunge form'
        },
        'ex-010': {  # Step-Over Obstacles (duplicate of stride_002)
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_imu'],
            'detectable_metrics': ['foot_clearance', 'step_height'],
            'reason': 'Perfect for foot clearance measurement'
        },
        'ex-011': {  # Visual Target Stepping (duplicate of stride_003)
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_fsr', 'foot_imu'],
            'detectable_metrics': ['stride_variation', 'step_placement'],
            'reason': 'Good stride detection'
        },
        'ex-012': {  # Heel-Strike Walking (duplicate of gait_001)
            'compatible': True,
            'confidence': 'high',
            'required_sensors': ['foot_fsr'],
            'detectable_metrics': ['heel_strike_pattern'],
            'reason': 'PERFECT - FSR heel sensors ideal for this'
        },
        'ex-013': {  # Lateral Side-Stepping (duplicate of stability_003)
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_imu'],
            'detectable_metrics': ['lateral_movement', 'step_direction'],
            'reason': 'IMU detects lateral movement'
        },
        'ex-015': {  # Sit-to-Stand Transfers
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['hip_sensors', 'knee_imu'],
            'detectable_metrics': [],
            'reason': 'Cannot detect sit-stand movement with only foot sensors'
        },
        'ex-021': {  # Ankle Dorsiflexion Exercises
            'compatible': True,
            'confidence': 'medium',
            'required_sensors': ['foot_imu'],
            'detectable_metrics': ['ankle_angle_change', 'repetition_count'],
            'reason': 'IMU can estimate ankle angle but with limited accuracy'
        },
        'ex-022': {  # Hip Hike Drills
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['hip_sensors'],
            'detectable_metrics': [],
            'reason': 'Cannot detect hip hiking without pelvic sensors'
        },
        'ex-023': {  # Quadriceps Extensions
            'compatible': False,
            'confidence': 'low',
            'required_sensors': ['knee_imu'],
            'detectable_metrics': [],
            'reason': 'Cannot detect knee extensions without leg sensors'
        }
    }
    
    def __init__(self):
        """Initialize the hardware filter"""
        compatible = sum(1 for ex in self.HARDWARE_COMPATIBILITY.values() if ex['compatible'])
        total = len(self.HARDWARE_COMPATIBILITY)
        print(f"✓ Hardware Exercise Filter loaded")
        print(f"  Compatible exercises: {compatible}/{total} ({compatible/total*100:.1f}%)")
    
    def is_compatible(self, exercise_id):
        """Check if exercise is compatible with hardware"""
        info = self.HARDWARE_COMPATIBILITY.get(exercise_id, {})
        return info.get('compatible', False)
    
    def get_compatibility_info(self, exercise_id):
        """Get detailed compatibility information for an exercise"""
        return self.HARDWARE_COMPATIBILITY.get(exercise_id, {
            'compatible': False,
            'confidence': 'unknown',
            'required_sensors': [],
            'detectable_metrics': [],
            'reason': 'Exercise not found in database'
        })
    
    def filter_exercises(self, exercises):
        """
        Filter list of exercises to only include hardware-compatible ones
        
        Args:
            exercises: List of exercise dicts with 'id' or 'exercise_id' field
        
        Returns:
            List of compatible exercises with added 'hardware_compatible' field
        """
        filtered = []
        for exercise in exercises:
            exercise_id = exercise.get('id') or exercise.get('exercise_id')
            if not exercise_id:
                continue
            
            compat_info = self.get_compatibility_info(exercise_id)
            if compat_info['compatible']:
                exercise['hardware_compatible'] = True
                exercise['detection_confidence'] = compat_info['confidence']
                exercise['detectable_metrics'] = compat_info['detectable_metrics']
                filtered.append(exercise)
        
        return filtered
    
    def get_compatible_exercise_ids(self):
        """Get list of all compatible exercise IDs"""
        return [
            ex_id for ex_id, info in self.HARDWARE_COMPATIBILITY.items()
            if info['compatible']
        ]
    
    def get_incompatible_exercise_ids(self):
        """Get list of all incompatible exercise IDs with reasons"""
        return {
            ex_id: info['reason']
            for ex_id, info in self.HARDWARE_COMPATIBILITY.items()
            if not info['compatible']
        }
    
    def get_exercises_by_confidence(self, confidence_level='high'):
        """Get exercises filtered by detection confidence level"""
        return [
            ex_id for ex_id, info in self.HARDWARE_COMPATIBILITY.items()
            if info['compatible'] and info['confidence'] == confidence_level
        ]
    
    def print_compatibility_report(self):
        """Print a detailed compatibility report"""
        compatible = [id for id, info in self.HARDWARE_COMPATIBILITY.items() if info['compatible']]
        incompatible = [id for id, info in self.HARDWARE_COMPATIBILITY.items() if not info['compatible']]
        
        print("\n" + "="*70)
        print("HARDWARE EXERCISE COMPATIBILITY REPORT")
        print("="*70)
        print(f"\n✅ COMPATIBLE EXERCISES ({len(compatible)}):")
        
        high_conf = [id for id in compatible if self.HARDWARE_COMPATIBILITY[id]['confidence'] == 'high']
        med_conf = [id for id in compatible if self.HARDWARE_COMPATIBILITY[id]['confidence'] == 'medium']
        
        print(f"\n  HIGH CONFIDENCE ({len(high_conf)}):")
        for ex_id in high_conf:
            info = self.HARDWARE_COMPATIBILITY[ex_id]
            print(f"    • {ex_id}: {info['reason']}")
        
        print(f"\n  MEDIUM CONFIDENCE ({len(med_conf)}):")
        for ex_id in med_conf:
            info = self.HARDWARE_COMPATIBILITY[ex_id]
            print(f"    • {ex_id}: {info['reason']}")
        
        print(f"\n\n❌ INCOMPATIBLE EXERCISES ({len(incompatible)}):")
        for ex_id in incompatible:
            info = self.HARDWARE_COMPATIBILITY[ex_id]
            print(f"    • {ex_id}: {info['reason']}")
        
        print(f"\n{'='*70}\n")


# Convenience function for direct usage
def filter_hardware_compatible_exercises(exercises):
    """Filter exercises to only hardware-compatible ones"""
    filter_instance = HardwareExerciseFilter()
    return filter_instance.filter_exercises(exercises)


if __name__ == "__main__":
    # Test the filter
    filter = HardwareExerciseFilter()
    filter.print_compatibility_report()
    
    print("\n🎯 RECOMMENDED EXERCISES BY PROBLEM:")
    print("\n  Slow Cadence:")
    for ex_id in ['cadence_001', 'cadence_002', 'cadence_003']:
        if filter.is_compatible(ex_id):
            print(f"    ✅ {ex_id}")
    
    print("\n  Asymmetric Gait:")
    for ex_id in ['asymmetry_001', 'asymmetry_002', 'asymmetry_003']:
        status = "✅" if filter.is_compatible(ex_id) else "❌"
        print(f"    {status} {ex_id}")
    
    print("\n  Short Stride:")
    for ex_id in ['stride_001', 'stride_002', 'stride_003']:
        if filter.is_compatible(ex_id):
            print(f"    ✅ {ex_id}")
    
    print("\n  Slow Velocity:")
    for ex_id in ['velocity_001', 'velocity_002']:
        status = "✅" if filter.is_compatible(ex_id) else "❌"
        print(f"    {status} {ex_id}")
