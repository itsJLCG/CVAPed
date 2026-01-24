"""
Gait Problem Detector for Web Hardware Analysis
Uses PhysioNet baselines to detect gait abnormalities
"""

import json
import numpy as np
from pathlib import Path
from scipy import stats


class GaitProblemDetector:
    def __init__(self, baselines_file='datasets/physionet_gait/gait_baselines.json'):
        """Load scientifically-derived baselines from PhysioNet dataset"""
        baselines_path = Path(__file__).parent / baselines_file
        
        if not baselines_path.exists():
            raise FileNotFoundError(
                f"Baselines file not found: {baselines_path}\n"
                "Please ensure gait_baselines.json exists in datasets/physionet_gait/"
            )
        
        with open(baselines_path, 'r') as f:
            self.baselines = json.load(f)
        
        print(f"✓ Loaded PhysioNet gait baselines (16 control subjects)")
        print(f"  Metrics available: {list(self.baselines.keys())}")
    
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
            problems.append({
                'problem': 'slow_cadence',
                'severity': 'severe',
                'category': 'Speed & Rhythm',
                'current_value': round(cadence, 1),
                'normal_range': f"{baseline['p25']:.1f} - {baseline['p75']:.1f}",
                'percentile': percentile,
                'description': f"Your walking pace ({cadence:.1f} steps/min) is significantly slower than normal (below {percentile}th percentile).",
                'impact': 'Severely reduced walking speed affects daily activities, community mobility, and crossing streets safely.',
                'recommendations': [
                    'Metronome-paced walking at progressively faster tempos',
                    'High knee marching exercises',
                    'Quick stepping drills with cues',
                    'Rhythmic auditory stimulation therapy'
                ]
            })
        
        # Moderate: Below 25th percentile but above 5th
        elif cadence < baseline['p25']:
            percentile = self._calculate_percentile(cadence, baseline)
            problems.append({
                'problem': 'slow_cadence',
                'severity': 'moderate',
                'category': 'Speed & Rhythm',
                'current_value': round(cadence, 1),
                'normal_range': f"{baseline['p25']:.1f} - {baseline['p75']:.1f}",
                'percentile': percentile,
                'description': f"Your walking pace ({cadence:.1f} steps/min) is below average ({percentile}th percentile).",
                'impact': 'Reduced walking pace may cause fatigue and limit daily mobility.',
                'recommendations': [
                    'Progressive speed walking exercises',
                    'Treadmill training with gradual speed increases',
                    'Interval training (alternating speeds)'
                ]
            })
        
        return problems
    
    def _check_symmetry(self, symmetry):
        """Check if gait symmetry is below normal (lower = worse)"""
        baseline = self.baselines['gait_symmetry']
        problems = []
        
        # Severe: Below 5th percentile
        if symmetry < baseline['p5']:
            percentile = self._calculate_percentile(symmetry, baseline)
            problems.append({
                'problem': 'asymmetric_gait',
                'severity': 'severe',
                'category': 'Balance & Symmetry',
                'current_value': round(symmetry, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your gait shows significant asymmetry (symmetry score: {symmetry:.2f}, below {percentile}th percentile).",
                'impact': 'Severe asymmetry increases fall risk, causes uneven joint loading, and reduces walking efficiency.',
                'recommendations': [
                    'Single-leg stance exercises (weaker side)',
                    'Weight-shifting drills',
                    'Mirror therapy for gait training',
                    'Bilateral coordination exercises',
                    'Task-specific training focusing on affected side'
                ]
            })
        
        # Moderate: Below 25th percentile
        elif symmetry < baseline['p25']:
            percentile = self._calculate_percentile(symmetry, baseline)
            problems.append({
                'problem': 'asymmetric_gait',
                'severity': 'moderate',
                'category': 'Balance & Symmetry',
                'current_value': round(symmetry, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your gait shows mild asymmetry ({symmetry:.2f}, {percentile}th percentile).",
                'impact': 'Asymmetry may lead to compensatory patterns and joint stress over time.',
                'recommendations': [
                    'Balance training exercises',
                    'Step-up exercises (affected side)',
                    'Lunges with focus on symmetry'
                ]
            })
        
        return problems
    
    def _check_stride_length(self, stride_length):
        """Check if stride length is below normal"""
        baseline = self.baselines['stride_length']
        problems = []
        
        # Severe: Below 5th percentile
        if stride_length < baseline['p5']:
            percentile = self._calculate_percentile(stride_length, baseline)
            problems.append({
                'problem': 'short_stride',
                'severity': 'severe',
                'category': 'Gait Pattern',
                'current_value': round(stride_length, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your stride length ({stride_length:.2f}m) is significantly shorter than normal (below {percentile}th percentile).",
                'impact': 'Very short strides severely reduce walking efficiency and speed.',
                'recommendations': [
                    'Lunge walking exercises to extend stride',
                    'Heel-to-toe walking with exaggerated steps',
                    'Visual targets for step length training',
                    'Hip flexor and extensor strengthening',
                    'Flexibility exercises for hip and ankle'
                ]
            })
        
        # Moderate: Below 25th percentile
        elif stride_length < baseline['p25']:
            percentile = self._calculate_percentile(stride_length, baseline)
            problems.append({
                'problem': 'short_stride',
                'severity': 'moderate',
                'category': 'Gait Pattern',
                'current_value': round(stride_length, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your stride length ({stride_length:.2f}m) is below average ({percentile}th percentile).",
                'impact': 'Shorter strides reduce walking efficiency.',
                'recommendations': [
                    'Obstacle stepping exercises',
                    'Step length awareness training',
                    'Progressive stride lengthening drills'
                ]
            })
        
        return problems
    
    def _check_velocity(self, velocity):
        """Check if walking velocity is below normal"""
        baseline = self.baselines['velocity']
        problems = []
        
        # Severe: Below 5th percentile
        if velocity < baseline['p5']:
            percentile = self._calculate_percentile(velocity, baseline)
            problems.append({
                'problem': 'slow_velocity',
                'severity': 'severe',
                'category': 'Speed & Rhythm',
                'current_value': round(velocity, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your walking speed ({velocity:.2f} m/s) is significantly slower than normal (below {percentile}th percentile).",
                'impact': 'Very slow walking speed severely limits community mobility, crossing streets, and daily activities.',
                'recommendations': [
                    'Progressive treadmill training',
                    'Fast walking intervals',
                    'Overground speed training',
                    'Resistance training for leg strength',
                    'Dual-task training (walking + cognitive task)'
                ]
            })
        
        # Moderate: Below 25th percentile
        elif velocity < baseline['p25']:
            percentile = self._calculate_percentile(velocity, baseline)
            problems.append({
                'problem': 'slow_velocity',
                'severity': 'moderate',
                'category': 'Speed & Rhythm',
                'current_value': round(velocity, 2),
                'normal_range': f"{baseline['p25']:.2f} - {baseline['p75']:.2f}",
                'percentile': percentile,
                'description': f"Your walking speed ({velocity:.2f} m/s) is below average ({percentile}th percentile).",
                'impact': 'Reduced speed may affect community mobility.',
                'recommendations': [
                    'Speed walking exercises',
                    'Interval training',
                    'Strength training to improve power'
                ]
            })
        
        return problems
    
    def _check_stability(self, stability_score):
        """Check stability score"""
        problems = []
        
        # Severe: <0.5
        if stability_score < 0.5:
            problems.append({
                'problem': 'poor_stability',
                'severity': 'severe',
                'category': 'Balance & Symmetry',
                'current_value': round(stability_score, 2),
                'normal_range': ">0.75",
                'description': f"Your walking stability is significantly compromised (score: {stability_score:.2f}).",
                'impact': 'Poor stability greatly increases fall risk and limits confidence in walking.',
                'recommendations': [
                    'Balance training on stable surfaces first',
                    'Tandem walking exercises',
                    'Single-leg stance practice',
                    'Core strengthening exercises',
                    'Gait training with assistive device if needed'
                ]
            })
        
        # Moderate: 0.5-0.65
        elif stability_score < 0.65:
            problems.append({
                'problem': 'poor_stability',
                'severity': 'moderate',
                'category': 'Balance & Symmetry',
                'current_value': round(stability_score, 2),
                'normal_range': ">0.75",
                'description': f"Your walking stability shows room for improvement (score: {stability_score:.2f}).",
                'impact': 'Reduced stability may affect confidence and increase caution during walking.',
                'recommendations': [
                    'Balance exercises',
                    'Strength training for lower extremities',
                    'Walking on varied surfaces'
                ]
            })
        
        return problems
    
    def _check_step_regularity(self, step_regularity):
        """Check step regularity"""
        problems = []
        
        if step_regularity < 0.5:
            problems.append({
                'problem': 'irregular_steps',
                'severity': 'severe',
                'category': 'Gait Pattern',
                'current_value': round(step_regularity, 2),
                'normal_range': ">0.75",
                'description': f"Your steps show significant irregularity (regularity score: {step_regularity:.2f}).",
                'impact': 'Highly irregular steps indicate poor motor control and increase fall risk.',
                'recommendations': [
                    'Metronome-paced walking for rhythm training',
                    'Visual cues for step placement',
                    'Rhythmic auditory cueing therapy',
                    'Task-specific gait training'
                ]
            })
        
        elif step_regularity < 0.7:
            problems.append({
                'problem': 'irregular_steps',
                'severity': 'moderate',
                'category': 'Gait Pattern',
                'current_value': round(step_regularity, 2),
                'normal_range': ">0.75",
                'description': f"Your steps show some irregularity (regularity score: {step_regularity:.2f}).",
                'impact': 'Irregular steps may affect walking efficiency and smoothness.',
                'recommendations': [
                    'Rhythm training exercises',
                    'Paced walking drills',
                    'Stepping pattern exercises'
                ]
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
