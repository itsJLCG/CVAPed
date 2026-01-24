"""
Rule-Based Exercise Recommender for Stroke Patients
Maps detected gait problems to appropriate rehabilitation exercises
"""

from stroke_exercise_library import StrokeExerciseLibrary
from datetime import datetime

class ExerciseRecommender:
    """
    Recommends exercises based on detected gait problems
    Uses evidence-based rules for stroke rehabilitation
    """
    
    def __init__(self):
        self.exercise_library = StrokeExerciseLibrary()
        
        # Problem priority weights (higher = more important to address)
        self.problem_priorities = {
            'slow_cadence': 10,
            'slow_velocity': 10,
            'short_stride': 9,
            'asymmetric_gait': 9,
            'poor_stability': 8,
            'irregular_steps': 7
        }
    
    def recommend_exercises(self, detected_problems, user_profile=None):
        """
        Generate personalized exercise recommendations
        
        Args:
            detected_problems: List of problem dicts from problem_detector with:
                - problem: string (e.g., 'slow_cadence')
                - severity: string ('severe', 'moderate', 'mild')
                - current_value: number
                - percentile: number
                - normal_range: string
                - recommendation: string
            
            user_profile: Optional dict with:
                - age: number
                - fitness_level: 'beginner' | 'intermediate' | 'advanced'
                - equipment_available: list of strings
                - time_available_per_day: number (minutes)
                - stroke_side: 'left' | 'right' | 'bilateral'
                - months_post_stroke: number
        
        Returns:
            dict with recommendations, schedule, and timeline
        """
        if not detected_problems:
            return {
                'status': 'no_problems',
                'message': 'Your gait is within normal range. Continue regular physical activity.',
                'maintenance_exercises': self._get_maintenance_exercises()
            }
        
        # Sort problems by priority and severity
        sorted_problems = self._prioritize_problems(detected_problems)
        
        # Select exercises for top problems
        recommendations = []
        
        for problem in sorted_problems[:3]:  # Focus on top 3 problems
            problem_type = problem['problem']
            severity = problem['severity']
            
            # Get appropriate exercises from library
            exercises = self.exercise_library.get_exercises_for_problem(
                problem_type, 
                severity
            )
            
            # Filter by user profile
            if user_profile:
                exercises = self._filter_by_profile(exercises, user_profile)
            
            # Select best exercises
            selected_exercises = self._select_best_exercises(
                exercises, 
                problem, 
                user_profile
            )
            
            recommendations.append({
                'problem': problem_type,
                'severity': severity,
                'current_value': problem['current_value'],
                'normal_range': problem['normal_range'],
                'percentile': problem['percentile'],
                'target_improvement': self._calculate_target(problem),
                'exercises': selected_exercises,
                'priority': 'high' if severity == 'severe' else 'medium',
                'why_recommended': problem.get('recommendation', '')
            })
        
        # Create weekly schedule
        schedule = self._create_weekly_schedule(recommendations, user_profile)
        
        # Estimate recovery timeline
        timeline = self._estimate_recovery_timeline(recommendations, user_profile)
        
        return {
            'status': 'exercises_recommended',
            'total_problems': len(detected_problems),
            'problems_addressed': len(recommendations),
            'recommendations': recommendations,
            'weekly_schedule': schedule,
            'estimated_timeline': timeline,
            'total_exercises': sum(len(r['exercises']) for r in recommendations),
            'daily_time_commitment': self._calculate_daily_time(recommendations),
            'generated_at': datetime.now().isoformat()
        }
    
    def _prioritize_problems(self, problems):
        """Sort problems by severity and priority"""
        severity_order = {'severe': 3, 'moderate': 2, 'mild': 1}
        
        return sorted(
            problems,
            key=lambda p: (
                severity_order.get(p['severity'], 0),
                self.problem_priorities.get(p['problem'], 0)
            ),
            reverse=True
        )
    
    def _filter_by_profile(self, exercises, profile):
        """Filter exercises based on user capabilities and resources"""
        filtered = []
        
        for exercise in exercises:
            # Check difficulty level
            if profile.get('fitness_level') == 'beginner':
                if exercise['difficulty'] == 'advanced':
                    continue
            
            # Check equipment availability
            equipment_needed = exercise.get('equipment', 'None')
            if equipment_needed and equipment_needed != 'None':
                if profile.get('equipment_available'):
                    has_equipment = any(
                        equip.lower() in equipment_needed.lower()
                        for equip in profile['equipment_available']
                    )
                    if not has_equipment and 'optional' not in equipment_needed.lower():
                        continue
            
            # Check age appropriateness (70+ should avoid advanced exercises)
            if profile.get('age', 0) > 70:
                if exercise['difficulty'] == 'advanced':
                    continue
            
            # Check time constraints
            if profile.get('time_available_per_day'):
                exercise_duration = self._parse_duration(exercise.get('duration', '0'))
                if exercise_duration > profile['time_available_per_day']:
                    continue
            
            filtered.append(exercise)
        
        return filtered
    
    def _select_best_exercises(self, exercises, problem, profile):
        """Select 2-3 best exercises for this problem"""
        if not exercises:
            return []
        
        # Prioritize by effectiveness and user capability
        scored_exercises = []
        
        for exercise in exercises:
            score = 0
            
            # Prefer beginner-friendly for older adults
            if profile and profile.get('age', 0) > 65:
                if exercise['difficulty'] == 'beginner':
                    score += 10
            
            # Prefer exercises with higher expected improvement
            improvement = exercise.get('expected_improvement', '')
            if 'weeks' in improvement:
                weeks = int(''.join(filter(str.isdigit, improvement.split('weeks')[0])))
                score += max(0, 10 - weeks)  # Faster improvement = higher score
            
            # Prefer exercises requiring no equipment
            if exercise.get('equipment', '').lower() in ['none', '']:
                score += 5
            
            # Prefer exercises with video demonstrations
            if exercise.get('video_url'):
                score += 3
            
            scored_exercises.append((score, exercise))
        
        # Sort by score and select top 2-3
        scored_exercises.sort(key=lambda x: x[0], reverse=True)
        
        # Select 3 for severe problems, 2 for moderate/mild
        num_exercises = 3 if problem['severity'] == 'severe' else 2
        
        return [ex[1] for ex in scored_exercises[:num_exercises]]
    
    def _calculate_target(self, problem):
        """Calculate target value for improvement"""
        problem_type = problem['problem']
        current = problem['current_value']
        
        # Get normal ranges from PhysioNet baselines
        targets = {
            'slow_cadence': {'target': 90, 'unit': 'steps/min'},
            'short_stride': {'target': 1.3, 'unit': 'meters'},
            'slow_velocity': {'target': 1.2, 'unit': 'm/s'},
            'asymmetric_gait': {'target': 0.85, 'unit': 'symmetry index'},
            'poor_stability': {'target': 0.52, 'unit': 'stability index'},
            'irregular_steps': {'target': 0.58, 'unit': 'regularity index'}
        }
        
        if problem_type in targets:
            target_info = targets[problem_type]
            return {
                'target_value': target_info['target'],
                'current_value': current,
                'improvement_needed': target_info['target'] - current,
                'unit': target_info['unit']
            }
        
        return None
    
    def _create_weekly_schedule(self, recommendations, profile):
        """Generate a balanced weekly exercise schedule"""
        schedule = {
            'Monday': [],
            'Tuesday': [],
            'Wednesday': [],
            'Thursday': [],
            'Friday': [],
            'Saturday': [],
            'Sunday': []
        }
        
        days = list(schedule.keys())
        
        # Distribute exercises across week
        day_index = 0
        
        for rec in recommendations:
            for exercise in rec['exercises']:
                # Parse frequency (e.g., "5 times per week" -> 5)
                frequency_str = exercise.get('frequency', '3 times per week')
                frequency = int(''.join(filter(str.isdigit, frequency_str)))
                
                # Assign to specific days
                assigned_days = []
                for i in range(frequency):
                    day = days[day_index % 7]
                    schedule[day].append({
                        'exercise_id': exercise['id'],
                        'exercise_name': exercise['name'],
                        'duration': exercise.get('duration', '10 minutes'),
                        'sets': exercise.get('sets'),
                        'reps': exercise.get('reps'),
                        'problem_targeted': rec['problem'],
                        'priority': rec['priority']
                    })
                    assigned_days.append(day)
                    day_index += 2  # Skip a day between same exercise
        
        # Add rest day recommendations
        for day in days:
            if len(schedule[day]) == 0:
                schedule[day].append({
                    'type': 'rest',
                    'recommendation': 'Rest day - light stretching and walking only'
                })
        
        return schedule
    
    def _estimate_recovery_timeline(self, recommendations, profile):
        """Estimate time to reach target improvements"""
        severe_count = sum(1 for r in recommendations if r['severity'] == 'severe')
        moderate_count = sum(1 for r in recommendations if r['severity'] == 'moderate')
        
        # Base timeline on severity
        if severe_count >= 3:
            weeks = 12
        elif severe_count >= 2:
            weeks = 10
        elif severe_count >= 1:
            weeks = 8
        elif moderate_count >= 2:
            weeks = 6
        else:
            weeks = 4
        
        # Adjust for age (older adults progress slower)
        if profile and profile.get('age', 0) > 70:
            weeks += 2
        
        # Adjust for time since stroke (earlier stages progress faster)
        if profile and profile.get('months_post_stroke'):
            months = profile['months_post_stroke']
            if months < 6:
                weeks -= 1  # In acute phase, faster improvement
            elif months > 24:
                weeks += 2  # Chronic phase, slower improvement
        
        return {
            'estimated_weeks': weeks,
            'milestones': {
                f'week_{weeks//4}': 'Expect 20-30% improvement',
                f'week_{weeks//2}': 'Expect 50-60% improvement',
                f'week_{weeks}': 'Expect to reach normal range',
            },
            'confidence': 'moderate',
            'note': 'Timeline assumes consistent exercise completion 5 days per week'
        }
    
    def _calculate_daily_time(self, recommendations):
        """Calculate average daily time commitment"""
        total_minutes = 0
        exercise_count = 0
        
        for rec in recommendations:
            for exercise in rec['exercises']:
                duration = self._parse_duration(exercise.get('duration', '10 minutes'))
                frequency_str = exercise.get('frequency', '5 times per week')
                frequency = int(''.join(filter(str.isdigit, frequency_str)))
                
                # Average time per day
                total_minutes += (duration * frequency) / 7
                exercise_count += 1
        
        return {
            'average_minutes_per_day': int(total_minutes),
            'range': f"{int(total_minutes * 0.8)}-{int(total_minutes * 1.2)} minutes",
            'note': 'Time varies by day based on schedule'
        }
    
    def _parse_duration(self, duration_str):
        """Parse duration string to minutes"""
        try:
            return int(''.join(filter(str.isdigit, duration_str)))
        except:
            return 10  # Default
    
    def _get_maintenance_exercises(self):
        """Get general maintenance exercises for healthy individuals"""
        return [
            {
                'name': 'Daily Walking',
                'description': 'Walk 30 minutes per day at moderate pace',
                'frequency': '5-7 days per week',
                'benefits': 'Maintains gait quality and cardiovascular health'
            },
            {
                'name': 'Balance Practice',
                'description': 'Single-leg stands, tandem walking',
                'frequency': '3 days per week',
                'benefits': 'Prevents falls, maintains stability'
            },
            {
                'name': 'Strength Training',
                'description': 'Leg exercises, squats, lunges',
                'frequency': '2-3 days per week',
                'benefits': 'Maintains muscle mass and power'
            }
        ]


# Test function
if __name__ == '__main__':
    recommender = ExerciseRecommender()
    
    # Test case: Severe gait impairments
    test_problems = [
        {
            'problem': 'slow_cadence',
            'severity': 'severe',
            'current_value': 32.0,
            'percentile': 3.2,
            'normal_range': '88-105 steps/min',
            'recommendation': 'Practice metronome-paced walking to increase step frequency'
        },
        {
            'problem': 'short_stride',
            'severity': 'moderate',
            'current_value': 0.67,
            'percentile': 6.1,
            'normal_range': '1.34-1.97 m',
            'recommendation': 'Perform lunge walking and step-over exercises'
        },
        {
            'problem': 'asymmetric_gait',
            'severity': 'severe',
            'current_value': 0.62,
            'percentile': 4.5,
            'normal_range': '0.85-1.0',
            'recommendation': 'Single-leg balance and mirror walking'
        }
    ]
    
    test_profile = {
        'age': 65,
        'fitness_level': 'beginner',
        'equipment_available': ['chair', 'resistance_band'],
        'time_available_per_day': 45,
        'stroke_side': 'left',
        'months_post_stroke': 6
    }
    
    print("="*60)
    print("EXERCISE RECOMMENDATION TEST")
    print("="*60)
    
    result = recommender.recommend_exercises(test_problems, test_profile)
    
    print(f"\nStatus: {result['status']}")
    print(f"Problems detected: {result['total_problems']}")
    print(f"Problems addressed: {result['problems_addressed']}")
    print(f"Total exercises: {result['total_exercises']}")
    print(f"Daily time commitment: {result['daily_time_commitment']['average_minutes_per_day']} minutes")
    print(f"Estimated timeline: {result['estimated_timeline']['estimated_weeks']} weeks")
    
    print("\n" + "="*60)
    print("EXERCISE RECOMMENDATIONS")
    print("="*60)
    
    for i, rec in enumerate(result['recommendations'], 1):
        print(f"\nProblem {i}: {rec['problem'].upper()}")
        print(f"  Severity: {rec['severity']}")
        print(f"  Current: {rec['current_value']}, Normal: {rec['normal_range']}")
        print(f"  Percentile: {rec['percentile']}")
        print(f"  Priority: {rec['priority']}")
        
        print(f"\n  Recommended Exercises:")
        for ex in rec['exercises']:
            print(f"    • {ex['name']}")
            print(f"      Duration: {ex['duration']}, Frequency: {ex['frequency']}")
            print(f"      Difficulty: {ex['difficulty']}")
            print(f"      Expected improvement: {ex['expected_improvement']}")
    
    print("\n" + "="*60)
    print("WEEKLY SCHEDULE")
    print("="*60)
    
    for day, exercises in result['weekly_schedule'].items():
        print(f"\n{day}:")
        for ex in exercises:
            if ex.get('type') == 'rest':
                print(f"  • {ex['recommendation']}")
            else:
                print(f"  • {ex['exercise_name']} ({ex['duration']})")
    
    print("\n" + "="*60)
    print("✓ Test completed successfully!")
    print("="*60)
