"""
Gait Problem Detector for Web Hardware Analysis
Uses PhysioNet baselines to detect gait abnormalities
Filters exercises by hardware compatibility (foot sensors only)
"""

import json
import numpy as np
from pathlib import Path
from scipy import stats
from hardware_exercise_filter import HardwareExerciseFilter


class GaitProblemDetector:
    def __init__(self, baselines_file='datasets/physionet_gait/gait_baselines.json',
                 exercises_file='datasets/physionet_gait/gait_exercises.json',
                 use_hardware_filter=True):
        """Load scientifically-derived baselines and exercise recommendations"""
        baselines_path = Path(__file__).parent / baselines_file
        exercises_path = Path(__file__).parent / exercises_file
        
        if not baselines_path.exists():
            raise FileNotFoundError(
                f"Baselines file not found: {baselines_path}\n"
                "Please ensure gait_baselines.json exists in datasets/physionet_gait/"
            )
        
        with open(baselines_path, 'r') as f:
            self.baselines = json.load(f)
        
        # Load exercise database
        if exercises_path.exists():
            with open(exercises_path, 'r') as f:
                self.exercises_db = json.load(f)
            print(f"✓ Loaded PhysioNet gait baselines + exercise database")
        else:
            self.exercises_db = {}
            print(f"✓ Loaded PhysioNet gait baselines (exercise database not found)")
        
        # Initialize hardware compatibility filter
        self.use_hardware_filter = use_hardware_filter
        if use_hardware_filter:
            try:
                self.hardware_filter = HardwareExerciseFilter()
                print(f"✓ Hardware exercise filtering ENABLED (foot sensors only)")
            except Exception as e:
                print(f"⚠️  Hardware filter initialization failed: {e}")
                self.hardware_filter = None
                self.use_hardware_filter = False
        else:
            self.hardware_filter = None
            print(f"  Hardware filtering DISABLED - all exercises available")
        
        print(f"  Metrics available: {list(self.baselines.keys())}")
    
    def _get_exercise_recommendations(self, problem_key, severity):
        """
        Get exercise recommendations from database, filtered by hardware compatibility
        
        Args:
            problem_key: Problem category key (e.g., 'slow_cadence', 'asymmetric_gait')
            severity: 'severe' or 'moderate'
        
        Returns:
            list of exercise names with IDs, hardware compatibility info
        """
        if not self.exercises_db or problem_key not in self.exercises_db:
            # Fallback to simple text recommendations if database not loaded
            return self._get_fallback_recommendations(problem_key, severity)
        
        problem_exercises = self.exercises_db.get(problem_key, {})
        exercise_list = problem_exercises.get(severity, [])
        
        # Return list of exercise objects with name, ID, and detectability
        recommendations = []
        for exercise in exercise_list:
            exercise_data = {
                'id': exercise.get('id'),
                'name': exercise.get('name'),
                'description': exercise.get('description'),
                'detectable': exercise.get('sensor_validation', {}).get('detectable', False),
                'difficulty': exercise.get('difficulty', 'unknown'),
                'expected_improvement': exercise.get('expected_improvement', 'N/A'),
                'duration': exercise.get('duration_per_session', 'N/A'),
                'frequency': exercise.get('frequency', 'N/A'),
                'hardware_compatible': False,  # Will be set by filter
                'detection_confidence': 'unknown'
            }
            recommendations.append(exercise_data)
        
        # Apply hardware filtering if enabled
        if self.use_hardware_filter and self.hardware_filter:
            # Filter to only compatible exercises
            compatible_exercises = self.hardware_filter.filter_exercises(recommendations)
            
            # If no compatible exercises found, return top 2 with warning
            if not compatible_exercises:
                print(f"⚠️  No hardware-compatible exercises for {problem_key}/{severity}")
                for ex in recommendations[:2]:
                    ex['hardware_compatible'] = False
                    ex['requires_manual_validation'] = True
                return recommendations[:2]
            
            # Return top 3 compatible exercises (or fewer if not available)
            return compatible_exercises[:3]
        else:
            # Return top 3 exercises without filtering
            return recommendations[:3]
    
    def _get_fallback_recommendations(self, problem_key, severity):
        """Fallback recommendations if exercise database not available"""
        fallback = {
            'slow_cadence': {
                'severe': ['Metronome-paced walking', 'High knee marching', 'Fast stepping drills'],
                'moderate': ['Interval walking', 'Progressive speed training']
            },
            'asymmetric_gait': {
                'severe': ['Single-leg stance', 'Weight-shifting drills', 'Mirror walking'],
                'moderate': ['Step-up exercises', 'Balance training']
            },
            'short_stride': {
                'severe': ['Lunge walking', 'Visual target stepping'],
                'moderate': ['Heel-to-toe walking', 'Stride lengthening drills']
            },
            'slow_velocity': {
                'severe': ['Progressive treadmill training', 'Speed intervals'],
                'moderate': ['Overground speed walking']
            },
            'poor_stability': {
                'severe': ['Tandem walking', 'Multisurface training'],
                'moderate': ['Core strengthening', 'Balance exercises']
            },
            'irregular_steps': {
                'severe': ['Rhythmic auditory cueing', 'Metronome walking'],
                'moderate': ['Paced walking practice']
            }
        }
        
        return fallback.get(problem_key, {}).get(severity, ['Consult physical therapist'])
    
    def detect_problems(self, user_metrics):
        """
        Detect gait problems using PhysioNet statistical baselines
        
        Args:
            user_metrics: dict with keys:
                - step_count
                - cadence (steps/min)
                - stride_length (meters)
                - velocity (m/s)
                - gait_symmetry (0-1)
                - stability_score (0-1)
                - step_regularity (0-1)
                - vertical_oscillation (meters)
        
        Returns:
            list of detected problems with severity and recommendations
        """
        problems = []
        
        # 1. CADENCE ANALYSIS
        if 'cadence' in user_metrics and 'cadence' in self.baselines:
            problems.extend(self._check_cadence(user_metrics['cadence']))
        
        # 2. GAIT SYMMETRY ANALYSIS
        if 'gait_symmetry' in user_metrics and 'gait_symmetry' in self.baselines:
            problems.extend(self._check_symmetry(user_metrics['gait_symmetry']))
        
        # 3. STRIDE LENGTH ANALYSIS
        if 'stride_length' in user_metrics and 'stride_length' in self.baselines:
            problems.extend(self._check_stride_length(user_metrics['stride_length']))
        
        # 4. VELOCITY ANALYSIS
        if 'velocity' in user_metrics and 'velocity' in self.baselines:
            problems.extend(self._check_velocity(user_metrics['velocity']))
        
        # 5. STABILITY ANALYSIS
        if 'stability_score' in user_metrics:
            problems.extend(self._check_stability(user_metrics['stability_score']))
        
        # 6. STEP REGULARITY ANALYSIS
        if 'step_regularity' in user_metrics:
            problems.extend(self._check_step_regularity(user_metrics['step_regularity']))
        
        return problems
    
    def _check_cadence(self, cadence):
        """Check if cadence is below normal range"""
        baseline = self.baselines['cadence']
        problems = []
        
        # Severe: Below 5th percentile
        if cadence < baseline['p5']:
            percentile = self._calculate_percentile(cadence, baseline)
            exercises = self._get_exercise_recommendations('slow_cadence', 'severe')
            
            problems.append({
                'problem': 'slow_cadence',
                'severity': 'severe',
                'category': 'Speed & Rhythm',
                'current_value': round(cadence, 1),
                'normal_range': f"{baseline['p25']:.1f} - {baseline['p75']:.1f}",
                'percentile': percentile,
                'description': f"Your walking pace ({cadence:.1f} steps/min) is significantly slower than normal (below {percentile}th percentile).",
                'impact': 'Severely reduced walking speed affects daily activities, community mobility, and crossing streets safely.',
                'exercises': exercises  # New: structured exercise data
            })
        
        # Moderate: Below 25th percentile but above 5th
        elif cadence < baseline['p25']:
            percentile = self._calculate_percentile(cadence, baseline)
            exercises = self._get_exercise_recommendations('slow_cadence', 'moderate')
            
            problems.append({
                'problem': 'slow_cadence',
                'severity': 'moderate',
                'category': 'Speed & Rhythm',
                'current_value': round(cadence, 1),
                'normal_range': f"{baseline['p25']:.1f} - {baseline['p75']:.1f}",
                'percentile': percentile,
                'description': f"Your walking pace ({cadence:.1f} steps/min) is below average ({percentile}th percentile).",
                'impact': 'Reduced walking pace may cause fatigue and limit daily mobility.',
                'exercises': exercises  # New: structured exercise data
            })
        
        return problems
    
    def _check_symmetry(self, symmetry):
        """Check if gait symmetry is below normal (lower = worse)"""
        baseline = self.baselines['gait_symmetry']
        problems = []
        
        # Severe: Below 5th percentile
        if symmetry < baseline['p5']:
            percentile = self._calculate_percentile(symmetry, baseline)
            exercises = self._get_exercise_recommendations('asymmetric_gait', 'severe')
            
            problems.append({
                'problem': 'asymmetric_gait',
                'severity': 'severe',
                'category': 'Balance & Symmetry',
                'current_value': round(symmetry, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your gait shows significant asymmetry (symmetry score: {symmetry:.2f}, below {percentile}th percentile).",
                'impact': 'Severe asymmetry increases fall risk, causes uneven joint loading, and reduces walking efficiency.',
                'exercises': exercises
            })
        
        # Moderate: Below 25th percentile
        elif symmetry < baseline['p25']:
            percentile = self._calculate_percentile(symmetry, baseline)
            exercises = self._get_exercise_recommendations('asymmetric_gait', 'moderate')
            
            problems.append({
                'problem': 'asymmetric_gait',
                'severity': 'moderate',
                'category': 'Balance & Symmetry',
                'current_value': round(symmetry, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your gait shows mild asymmetry ({symmetry:.2f}, {percentile}th percentile).",
                'impact': 'Asymmetry may lead to compensatory patterns and joint stress over time.',
                'exercises': exercises
            })
        
        return problems
    
    def _check_stride_length(self, stride_length):
        """Check if stride length is below normal"""
        baseline = self.baselines['stride_length']
        problems = []
        
        # Severe: Below 5th percentile
        if stride_length < baseline['p5']:
            percentile = self._calculate_percentile(stride_length, baseline)
            exercises = self._get_exercise_recommendations('short_stride', 'severe')
            
            problems.append({
                'problem': 'short_stride',
                'severity': 'severe',
                'category': 'Gait Pattern',
                'current_value': round(stride_length, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your stride length ({stride_length:.2f}m) is significantly shorter than normal (below {percentile}th percentile).",
                'impact': 'Very short strides severely reduce walking efficiency and speed.',
                'exercises': exercises
            })
        
        # Moderate: Below 25th percentile
        elif stride_length < baseline['p25']:
            percentile = self._calculate_percentile(stride_length, baseline)
            exercises = self._get_exercise_recommendations('short_stride', 'moderate')
            problems.append({
                'problem': 'short_stride',
                'severity': 'moderate',
                'category': 'Gait Pattern',
                'current_value': round(stride_length, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your stride length ({stride_length:.2f}m) is below average ({percentile}th percentile).",
                'impact': 'Shorter strides reduce walking efficiency.',
                'exercises': exercises
            })
        
        return problems
    
    def _check_velocity(self, velocity):
        """Check if walking velocity is below normal"""
        baseline = self.baselines['velocity']
        problems = []
        
        # Severe: Below 5th percentile
        if velocity < baseline['p5']:
            percentile = self._calculate_percentile(velocity, baseline)
            exercises = self._get_exercise_recommendations('slow_velocity', 'severe')
            
            problems.append({
                'problem': 'slow_velocity',
                'severity': 'severe',
                'category': 'Speed & Rhythm',
                'current_value': round(velocity, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your walking speed ({velocity:.2f} m/s) is significantly slower than normal (below {percentile}th percentile).",
                'impact': 'Very slow walking speed severely limits community mobility, crossing streets, and daily activities.',
                'exercises': exercises
            })
        
        # Moderate: Below 25th percentile
        elif velocity < baseline['p25']:
            percentile = self._calculate_percentile(velocity, baseline)
            exercises = self._get_exercise_recommendations('slow_velocity', 'moderate')
            
            problems.append({
                'problem': 'slow_velocity',
                'severity': 'moderate',
                'category': 'Speed & Rhythm',
                'current_value': round(velocity, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your walking speed ({velocity:.2f} m/s) is below average ({percentile}th percentile).",
                'impact': 'Reduced speed may affect community mobility.',
                'exercises': exercises
            })
        
        return problems
    
    def _check_stability(self, stability_score):
        """Check stability score"""
        problems = []
        
        # Severe: <0.5
        if stability_score < 0.5:
            exercises = self._get_exercise_recommendations('poor_stability', 'severe')
            
            problems.append({
                'problem': 'poor_stability',
                'severity': 'severe',
                'category': 'Balance & Symmetry',
                'current_value': round(stability_score, 2),
                'normal_range': ">0.75",
                'description': f"Your walking stability is significantly compromised (score: {stability_score:.2f}).",
                'impact': 'Poor stability greatly increases fall risk and limits confidence in walking.',
                'exercises': exercises
            })
        
        # Moderate: 0.5-0.65
        elif stability_score < 0.65:
            exercises = self._get_exercise_recommendations('poor_stability', 'moderate')
            
            problems.append({
                'problem': 'poor_stability',
                'severity': 'moderate',
                'category': 'Balance & Symmetry',
                'current_value': round(stability_score, 2),
                'normal_range': ">0.75",
                'description': f"Your walking stability shows room for improvement (score: {stability_score:.2f}).",
                'impact': 'Reduced stability may affect confidence and increase caution during walking.',
                'exercises': exercises
            })
        
        return problems
    
    def _check_step_regularity(self, step_regularity):
        """Check step regularity"""
        problems = []
        
        if step_regularity < 0.5:
            exercises = self._get_exercise_recommendations('reduced_step_regularity', 'severe')
            
            problems.append({
                'problem': 'irregular_steps',
                'severity': 'severe',
                'category': 'Gait Pattern',
                'current_value': round(step_regularity, 2),
                'normal_range': ">0.75",
                'description': f"Your steps show significant irregularity (regularity score: {step_regularity:.2f}).",
                'impact': 'Highly irregular steps indicate poor motor control and increase fall risk.',
                'exercises': exercises
            })
        
        elif step_regularity < 0.7:
            exercises = self._get_exercise_recommendations('reduced_step_regularity', 'moderate')
            
            problems.append({
                'problem': 'irregular_steps',
                'severity': 'moderate',
                'category': 'Gait Pattern',
                'current_value': round(step_regularity, 2),
                'normal_range': ">0.75",
                'description': f"Your steps show some irregularity (regularity score: {step_regularity:.2f}).",
                'impact': 'Irregular steps may affect walking efficiency and smoothness.',
                'exercises': exercises
            })
        
        return problems
    
    def _calculate_percentile(self, value, baseline):
        """Calculate what percentile the user's value falls into"""
        mean = baseline['mean']
        std = baseline['std']
        
        # Z-score
        z = (value - mean) / std if std > 0 else 0
        
        # Convert to percentile using normal distribution
        percentile = stats.norm.cdf(z) * 100
        
        return max(1, min(99, int(percentile)))  # Clamp to 1-99
    
    def prioritize_problems(self, problems):
        """Sort problems by priority: Severity > Category"""
        severity_order = {'severe': 0, 'moderate': 1, 'mild': 2}
        category_order = {'Speed & Rhythm': 0, 'Balance & Symmetry': 1, 'Gait Pattern': 2}
        
        return sorted(problems, 
                     key=lambda x: (severity_order.get(x['severity'], 99),
                                   category_order.get(x['category'], 99)))
    
    def generate_summary(self, problems):
        """Generate a clinical summary of detected problems"""
        if not problems:
            return {
                'overall_status': 'normal',
                'risk_level': 'low',
                'summary': 'Your gait parameters are within normal ranges. Continue regular physical activity to maintain mobility.',
                'total_problems': 0,
                'severe_count': 0,
                'moderate_count': 0
            }
        
        severe_count = sum(1 for p in problems if p['severity'] == 'severe')
        moderate_count = sum(1 for p in problems if p['severity'] == 'moderate')
        
        # Determine overall risk level
        if severe_count >= 2:
            risk_level = 'high'
            status = 'needs_immediate_attention'
        elif severe_count >= 1 or moderate_count >= 3:
            risk_level = 'moderate'
            status = 'needs_attention'
        else:
            risk_level = 'low_moderate'
            status = 'needs_improvement'
        
        summary_text = (
            f"Detected {len(problems)} gait abnormality(ies): "
            f"{severe_count} severe, {moderate_count} moderate. "
            f"Physical therapy focusing on {problems[0]['category'].lower()} is recommended."
        )
        
        return {
            'overall_status': status,
            'risk_level': risk_level,
            'total_problems': len(problems),
            'severe_count': severe_count,
            'moderate_count': moderate_count,
            'summary': summary_text
        }
    
    def calculate_gait_score(self, user_metrics, detected_problems):
        """
        Calculate overall gait mobility score (0-100) based on metric percentiles
        
        Scoring Algorithm:
        - Calculate percentile for each key metric vs. normal population
        - Convert percentile to score (higher percentile = higher score)
        - Weight metrics by clinical importance
        - Average weighted scores for final score
        
        Returns:
            dict with score, grade, color, and recommendation
        """
        metric_scores = []
        metric_weights = []
        
        # 1. CADENCE SCORE (Weight: 20%)
        if 'cadence' in user_metrics and 'cadence' in self.baselines:
            cadence = user_metrics['cadence']
            percentile = self._calculate_percentile(cadence, self.baselines['cadence'])
            cadence_score = self._percentile_to_score(percentile)
            metric_scores.append(cadence_score)
            metric_weights.append(20)
        
        # 2. VELOCITY SCORE (Weight: 20%)
        if 'velocity' in user_metrics and 'velocity' in self.baselines:
            velocity = user_metrics['velocity']
            percentile = self._calculate_percentile(velocity, self.baselines['velocity'])
            velocity_score = self._percentile_to_score(percentile)
            metric_scores.append(velocity_score)
            metric_weights.append(20)
        
        # 3. STRIDE LENGTH SCORE (Weight: 15%)
        if 'stride_length' in user_metrics and 'stride_length' in self.baselines:
            stride_length = user_metrics['stride_length']
            percentile = self._calculate_percentile(stride_length, self.baselines['stride_length'])
            stride_score = self._percentile_to_score(percentile)
            metric_scores.append(stride_score)
            metric_weights.append(15)
        
        # 4. GAIT SYMMETRY SCORE (Weight: 20%)
        if 'gait_symmetry' in user_metrics and 'gait_symmetry' in self.baselines:
            symmetry = user_metrics['gait_symmetry']
            percentile = self._calculate_percentile(symmetry, self.baselines['gait_symmetry'])
            symmetry_score = self._percentile_to_score(percentile)
            metric_scores.append(symmetry_score)
            metric_weights.append(20)
        
        # 5. STABILITY SCORE (Weight: 15%)
        if 'stability_score' in user_metrics:
            stability = user_metrics['stability_score']
            # Stability is 0-1, treat as percentile directly
            stability_score = stability * 100  # Convert 0-1 to 0-100
            metric_scores.append(stability_score)
            metric_weights.append(15)
        
        # 6. STEP REGULARITY SCORE (Weight: 10%)
        if 'step_regularity' in user_metrics:
            regularity = user_metrics['step_regularity']
            # Regularity is 0-1, treat as percentile directly
            regularity_score = regularity * 100  # Convert 0-1 to 0-100
            metric_scores.append(regularity_score)
            metric_weights.append(10)
        
        # Calculate weighted average score
        if metric_scores and metric_weights:
            total_weight = sum(metric_weights)
            weighted_sum = sum(score * weight for score, weight in zip(metric_scores, metric_weights))
            final_score = weighted_sum / total_weight
        else:
            # Fallback if no metrics available
            final_score = 50
        
        # Apply small penalty for detected severe problems (max -10 points total)
        severe_count = sum(1 for p in detected_problems if p.get('severity') == 'severe')
        moderate_count = sum(1 for p in detected_problems if p.get('severity') == 'moderate')
        
        penalty = min(10, severe_count * 3 + moderate_count * 1.5)
        final_score -= penalty
        
        # Ensure score stays within 0-100 range
        final_score = max(0, min(100, final_score))
        
        # Determine grade and color based on score
        if final_score >= 90:
            grade = "Excellent"
            grade_emoji = "✅"
            color = "green"
            recommendation = "Your gait is excellent! Maintain your current activity level and continue regular exercise."
        elif final_score >= 75:
            grade = "Good"
            grade_emoji = "👍"
            color = "lightblue"
            recommendation = "Good gait performance. Minor improvements possible through targeted exercises."
        elif final_score >= 60:
            grade = "Fair"
            grade_emoji = "⚠️"
            color = "yellow"
            recommendation = "Moderate gait issues detected. Physical therapy recommended to improve mobility."
        elif final_score >= 45:
            grade = "Poor"
            grade_emoji = "⚡"
            color = "orange"
            recommendation = "Significant gait impairments. Immediate physical therapy strongly recommended."
        else:
            grade = "Critical"
            grade_emoji = "🚨"
            color = "red"
            recommendation = "Severe gait problems detected. Urgent medical consultation and intensive therapy required."
        
        return {
            'score': int(final_score),
            'grade': grade,
            'grade_emoji': grade_emoji,
            'color': color,
            'recommendation': recommendation,
            'severe_count': severe_count,
            'moderate_count': moderate_count,
            'metrics_evaluated': len(metric_scores)
        }
    
    def _percentile_to_score(self, percentile):
        """
        Convert percentile rank to score (0-100)
        
        Percentile mapping:
        - 75th+ percentile = 95-100 points (Excellent)
        - 50th-75th = 85-95 points (Good)
        - 25th-50th = 70-85 points (Fair)
        - 10th-25th = 50-70 points (Poor)
        - Below 10th = 30-50 points (Critical)
        - Below 5th = 0-30 points (Severe)
        """
        if percentile >= 75:
            # Excellent range: 95-100
            return 95 + (percentile - 75) / 25 * 5
        elif percentile >= 50:
            # Good range: 85-95
            return 85 + (percentile - 50) / 25 * 10
        elif percentile >= 25:
            # Fair range: 70-85
            return 70 + (percentile - 25) / 25 * 15
        elif percentile >= 10:
            # Poor range: 50-70
            return 50 + (percentile - 10) / 15 * 20
        elif percentile >= 5:
            # Critical range: 30-50
            return 30 + (percentile - 5) / 5 * 20
        else:
            # Severe range: 0-30
            return max(0, percentile / 5 * 30)

