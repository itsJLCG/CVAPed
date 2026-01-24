"""
Stroke-Specific Exercise Library for Gait Rehabilitation
Evidence-based exercises targeting common post-stroke gait problems
"""

class StrokeExerciseLibrary:
    """
    Comprehensive exercise library for stroke patients with gait impairments
    Based on clinical research and physical therapy best practices
    """
    
    def __init__(self):
        self.exercises = {
            # SLOW CADENCE EXERCISES
            'slow_cadence': {
                'severe': [
                    {
                        'id': 'cadence_001',
                        'name': 'Metronome-Paced Walking',
                        'description': 'Walk to the beat of a metronome to increase step frequency',
                        'target_metric': 'cadence',
                        'expected_improvement': '10-15 steps/min in 4 weeks',
                        'duration': '15 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': None,
                        'difficulty': 'beginner',
                        'equipment': 'Metronome app (free)',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Download a free metronome app on your phone',
                            'Set metronome to 60 BPM (beats per minute) to start',
                            'Take one step with each beat - left foot on one beat, right foot on next',
                            'Walk for 5 minutes, rest 2 minutes, repeat 3 times',
                            'Increase by 5 BPM each week (Week 2: 65 BPM, Week 3: 70 BPM, etc.)',
                            'Goal: Reach 100-110 BPM by week 8'
                        ],
                        'precautions': [
                            'Use a walker or cane if you have balance issues',
                            'Stop if you feel dizzy or short of breath',
                            'Start with a slow tempo and gradually increase',
                            'Practice in a safe area with something to hold onto'
                        ],
                        'progression': {
                            'week_1': '60 BPM, 15 minutes total',
                            'week_2': '65 BPM, 15 minutes total',
                            'week_3': '70 BPM, 18 minutes total',
                            'week_4': '75 BPM, 18 minutes total',
                            'week_5_8': 'Increase 5 BPM weekly until 100 BPM'
                        },
                        'benefits': [
                            'Increases walking speed',
                            'Improves rhythm and timing',
                            'Reduces shuffling',
                            'Enhances motor control'
                        ]
                    },
                    {
                        'id': 'cadence_002',
                        'name': 'High Knee Marching',
                        'description': 'March in place lifting knees high to hip level',
                        'target_metric': 'cadence',
                        'expected_improvement': '8-12 steps/min in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': 20,
                        'difficulty': 'intermediate',
                        'equipment': 'Chair for support (optional)',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Stand tall with feet hip-width apart',
                            'Hold onto a chair or counter for balance if needed',
                            'Lift right knee up to hip height (90-degree angle)',
                            'Lower right foot and immediately lift left knee',
                            'Continue alternating, gradually increasing speed',
                            'Do 20 marches, rest 1 minute, repeat 3 times'
                        ],
                        'precautions': [
                            'Keep your back straight - don\'t lean forward',
                            'If knee pain occurs, reduce height of knee lift',
                            'Stop if you lose balance',
                            'Use support until you feel confident'
                        ],
                        'progression': {
                            'week_1': '20 reps × 3 sets with support',
                            'week_2': '25 reps × 3 sets with light support',
                            'week_3': '30 reps × 3 sets without support',
                            'week_4': '30 reps × 4 sets, add arm swings'
                        },
                        'benefits': [
                            'Strengthens hip flexors',
                            'Improves knee lift during walking',
                            'Increases step frequency',
                            'Enhances balance and coordination'
                        ]
                    },
                    {
                        'id': 'cadence_003',
                        'name': 'Fast Stepping Drills',
                        'description': 'Quick stepping exercises to improve step frequency',
                        'target_metric': 'cadence',
                        'expected_improvement': '10-15 steps/min in 6 weeks',
                        'duration': '10 minutes',
                        'frequency': '4 times per week',
                        'sets': 4,
                        'reps': 10,
                        'difficulty': 'intermediate',
                        'equipment': 'None',
                        'instructions': [
                            'Stand with feet together',
                            'Take 10 quick small steps forward as fast as you can',
                            'Rest for 30 seconds',
                            'Repeat 4 times',
                            'Focus on speed, not distance'
                        ],
                        'precautions': [
                            'Ensure clear path ahead',
                            'Practice near a wall or railing',
                            'Stop if you feel unstable'
                        ],
                        'benefits': [
                            'Increases walking speed',
                            'Improves quick stepping ability',
                            'Enhances reaction time'
                        ]
                    }
                ],
                'moderate': [
                    {
                        'id': 'cadence_004',
                        'name': 'Interval Walking',
                        'description': 'Alternate between normal and fast walking speeds',
                        'target_metric': 'cadence',
                        'expected_improvement': '5-8 steps/min in 4 weeks',
                        'duration': '15 minutes',
                        'frequency': '4 times per week',
                        'difficulty': 'beginner',
                        'equipment': 'None',
                        'instructions': [
                            'Walk at normal comfortable pace for 2 minutes',
                            'Walk as fast as you safely can for 1 minute',
                            'Return to normal pace for 2 minutes',
                            'Repeat fast-slow intervals 4 times'
                        ],
                        'benefits': [
                            'Builds endurance',
                            'Increases maximum walking speed',
                            'Improves cardiovascular fitness'
                        ]
                    }
                ]
            },
            
            # SHORT STRIDE EXERCISES
            'short_stride': {
                'severe': [
                    {
                        'id': 'stride_001',
                        'name': 'Lunge Walking',
                        'description': 'Take large steps forward with knee bends to increase stride length',
                        'target_metric': 'stride_length',
                        'expected_improvement': '0.1-0.15m in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '4 times per week',
                        'sets': 3,
                        'reps': 10,
                        'difficulty': 'intermediate',
                        'equipment': 'Resistance band (optional)',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Stand with feet hip-width apart',
                            'Take a large step forward with right leg (as far as comfortable)',
                            'Lower your body until right knee is bent 90 degrees',
                            'Push off back foot and step forward with left leg',
                            'Continue alternating legs for 10 steps',
                            'Rest 2 minutes, repeat 3 times'
                        ],
                        'precautions': [
                            'Don\'t let front knee go past your toes',
                            'Keep torso upright - don\'t lean forward',
                            'Use wall or rail for support if needed',
                            'Start with smaller lunges if 90-degree bend is too difficult'
                        ],
                        'progression': {
                            'week_1': '10 lunges × 3 sets with support',
                            'week_2': '12 lunges × 3 sets, less support',
                            'week_3': '15 lunges × 3 sets without support',
                            'week_4': '15 lunges × 4 sets, add resistance band'
                        },
                        'benefits': [
                            'Increases stride length',
                            'Strengthens quadriceps and glutes',
                            'Improves balance during stepping',
                            'Enhances hip extension'
                        ]
                    },
                    {
                        'id': 'stride_002',
                        'name': 'Step-Over Obstacles',
                        'description': 'Step over progressively taller objects to increase step height and length',
                        'target_metric': 'stride_length',
                        'expected_improvement': '0.1-0.2m in 6 weeks',
                        'duration': '15 minutes',
                        'frequency': '4 times per week',
                        'sets': 3,
                        'reps': 15,
                        'difficulty': 'intermediate',
                        'equipment': 'Small cones, books, or foam blocks (5-20cm height)',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Place 5 small obstacles in a line, 1 meter apart',
                            'Start with 5cm height (like a book)',
                            'Step over each obstacle without touching it',
                            'Lift knee high enough to clear the obstacle',
                            'Walk back stepping over obstacles again',
                            'Complete 15 obstacles, rest, repeat 3 times'
                        ],
                        'precautions': [
                            'Ensure obstacles are stable and won\'t slide',
                            'Have someone nearby for safety',
                            'Start with very low obstacles',
                            'Clear area of tripping hazards'
                        ],
                        'progression': {
                            'week_1': '5cm height, 15 steps × 3 sets',
                            'week_2': '8cm height, 15 steps × 3 sets',
                            'week_3': '10cm height, 20 steps × 3 sets',
                            'week_4_6': 'Increase height by 2cm weekly up to 20cm'
                        },
                        'benefits': [
                            'Increases stride length',
                            'Improves foot clearance',
                            'Reduces tripping risk',
                            'Strengthens hip flexors'
                        ]
                    },
                    {
                        'id': 'stride_003',
                        'name': 'Heel-to-Toe Walking',
                        'description': 'Walk placing heel directly in front of toes to practice longer steps',
                        'target_metric': 'stride_length',
                        'expected_improvement': '0.08-0.12m in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': 20,
                        'difficulty': 'beginner',
                        'equipment': 'Tape line on floor (optional)',
                        'instructions': [
                            'Place a tape line on the floor or use a floor board line',
                            'Stand at start of line',
                            'Step forward placing right heel directly in front of left toes',
                            'Continue stepping heel-to-toe along the line',
                            'Take 20 steps, turn around, return',
                            'Rest 1 minute, repeat 3 times'
                        ],
                        'precautions': [
                            'Use wall for support if needed',
                            'Go slowly at first',
                            'Stop if you lose balance',
                            'Practice in safe area'
                        ],
                        'progression': {
                            'week_1': '20 steps × 3 sets with wall support',
                            'week_2': '25 steps × 3 sets with light support',
                            'week_3': '30 steps × 3 sets without support',
                            'week_4': '30 steps × 4 sets with eyes closed (advanced)'
                        },
                        'benefits': [
                            'Improves stride length',
                            'Enhances balance',
                            'Increases coordination',
                            'Strengthens ankles'
                        ]
                    }
                ],
                'moderate': [
                    {
                        'id': 'stride_004',
                        'name': 'Long-Step Walking',
                        'description': 'Practice taking deliberately longer steps than normal',
                        'target_metric': 'stride_length',
                        'expected_improvement': '0.05-0.1m in 4 weeks',
                        'duration': '12 minutes',
                        'frequency': '4 times per week',
                        'difficulty': 'beginner',
                        'equipment': 'Tape markers on floor',
                        'instructions': [
                            'Place tape markers 1.2m apart on floor',
                            'Practice stepping to reach each marker',
                            'Focus on extending your stride',
                            'Walk 15 steps, rest, repeat 3 times'
                        ],
                        'benefits': [
                            'Increases natural stride length',
                            'Improves hip extension',
                            'Builds leg strength'
                        ]
                    }
                ]
            },
            
            # ASYMMETRIC GAIT EXERCISES
            'asymmetric_gait': {
                'severe': [
                    {
                        'id': 'symmetry_001',
                        'name': 'Single Leg Balance',
                        'description': 'Stand on one leg to strengthen weaker side and improve symmetry',
                        'target_metric': 'gait_symmetry',
                        'expected_improvement': '0.1-0.15 improvement in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': '30 seconds each leg',
                        'difficulty': 'beginner',
                        'equipment': 'Chair for support',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Stand next to a chair or counter for support',
                            'Shift weight to weaker leg',
                            'Lift other foot 5cm off ground',
                            'Hold for 30 seconds (use support if needed)',
                            'Switch legs and repeat',
                            'Do 3 sets on each leg'
                        ],
                        'precautions': [
                            'Always have support nearby',
                            'Start with just 10 seconds if 30 is too hard',
                            'Stop if you feel pain',
                            'Practice on non-slip surface'
                        ],
                        'progression': {
                            'week_1': '10 seconds × 3 sets with support',
                            'week_2': '20 seconds × 3 sets with light support',
                            'week_3': '30 seconds × 3 sets without support',
                            'week_4': '30 seconds × 4 sets with eyes closed'
                        },
                        'benefits': [
                            'Strengthens weaker leg',
                            'Improves balance',
                            'Reduces gait asymmetry',
                            'Enhances single-leg stability during walking'
                        ]
                    },
                    {
                        'id': 'symmetry_002',
                        'name': 'Mirror Walking',
                        'description': 'Walk while watching yourself in mirror to correct asymmetric patterns',
                        'target_metric': 'gait_symmetry',
                        'expected_improvement': '0.08-0.12 improvement in 6 weeks',
                        'duration': '15 minutes',
                        'frequency': '4 times per week',
                        'sets': 4,
                        'reps': '10 steps',
                        'difficulty': 'intermediate',
                        'equipment': 'Full-length mirror',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Stand facing a full-length mirror',
                            'Walk toward mirror watching your gait',
                            'Check: Are both arms swinging equally?',
                            'Check: Are both knees lifting the same height?',
                            'Check: Is weight evenly distributed?',
                            'Consciously correct any asymmetries you see',
                            'Walk 10 steps, study your pattern, repeat'
                        ],
                        'precautions': [
                            'Ensure safe walking space',
                            'Don\'t fixate too much on mirror (could affect balance)',
                            'Practice in well-lit area'
                        ],
                        'progression': {
                            'week_1': '10 steps × 4 sets, focus on arm swing',
                            'week_2': '15 steps × 4 sets, focus on knee lift',
                            'week_3': '20 steps × 4 sets, focus on weight shift',
                            'week_4_6': 'Combine all corrections naturally'
                        },
                        'benefits': [
                            'Visual feedback for correction',
                            'Improves body awareness',
                            'Reduces compensatory patterns',
                            'Promotes symmetrical gait'
                        ]
                    },
                    {
                        'id': 'symmetry_003',
                        'name': 'Weight Shifting Exercises',
                        'description': 'Practice shifting weight evenly between both legs',
                        'target_metric': 'gait_symmetry',
                        'expected_improvement': '0.1-0.15 improvement in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': 15,
                        'difficulty': 'beginner',
                        'equipment': 'None',
                        'instructions': [
                            'Stand with feet hip-width apart',
                            'Shift weight fully to left leg (right foot should be light)',
                            'Hold for 5 seconds',
                            'Shift weight fully to right leg',
                            'Hold for 5 seconds',
                            'Repeat 15 times, rest, do 3 sets'
                        ],
                        'precautions': [
                            'Stand near support',
                            'Shift weight slowly',
                            'Ensure both feet stay on ground'
                        ],
                        'benefits': [
                            'Improves weight transfer',
                            'Strengthens both legs equally',
                            'Reduces favoring one side'
                        ]
                    }
                ],
                'moderate': [
                    {
                        'id': 'symmetry_004',
                        'name': 'Side-Stepping Exercise',
                        'description': 'Step sideways to strengthen hip abductors and improve lateral stability',
                        'target_metric': 'gait_symmetry',
                        'expected_improvement': '0.05-0.1 improvement in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '4 times per week',
                        'sets': 3,
                        'reps': 10,
                        'difficulty': 'intermediate',
                        'equipment': 'Resistance band (optional)',
                        'instructions': [
                            'Stand with feet together',
                            'Step right leg sideways',
                            'Bring left leg to meet right',
                            'Take 10 side steps right, then 10 left',
                            'Rest and repeat 3 times'
                        ],
                        'benefits': [
                            'Strengthens hip muscles',
                            'Improves lateral stability',
                            'Enhances balance'
                        ]
                    }
                ]
            },
            
            # POOR STABILITY EXERCISES
            'poor_stability': {
                'moderate': [
                    {
                        'id': 'stability_001',
                        'name': 'Tandem Walking',
                        'description': 'Walk heel-to-toe in straight line to improve balance',
                        'target_metric': 'stability_score',
                        'expected_improvement': '0.08-0.12 improvement in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': 20,
                        'difficulty': 'beginner',
                        'equipment': 'Tape line on floor',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Place tape line on floor',
                            'Stand at start with feet together',
                            'Step forward placing heel of front foot touching toes of back foot',
                            'Continue heel-to-toe for 20 steps',
                            'Use arms for balance',
                            'Rest and repeat 3 times'
                        ],
                        'precautions': [
                            'Have wall nearby for support',
                            'Go very slowly',
                            'Stop if you feel unsteady'
                        ],
                        'progression': {
                            'week_1': '10 steps × 3 sets near wall',
                            'week_2': '15 steps × 3 sets',
                            'week_3': '20 steps × 3 sets',
                            'week_4': '20 steps × 4 sets with arms crossed'
                        },
                        'benefits': [
                            'Improves balance',
                            'Increases stability',
                            'Enhances core strength',
                            'Reduces fall risk'
                        ]
                    },
                    {
                        'id': 'stability_002',
                        'name': 'Standing on Foam Pad',
                        'description': 'Stand on unstable surface to challenge balance',
                        'target_metric': 'stability_score',
                        'expected_improvement': '0.1-0.15 improvement in 6 weeks',
                        'duration': '10 minutes',
                        'frequency': '4 times per week',
                        'sets': 3,
                        'reps': '60 seconds',
                        'difficulty': 'intermediate',
                        'equipment': 'Foam pad or folded towel',
                        'instructions': [
                            'Place foam pad on floor',
                            'Stand on pad with feet hip-width apart',
                            'Hold position for 60 seconds',
                            'Use arms for balance',
                            'Rest 30 seconds, repeat 3 times'
                        ],
                        'precautions': [
                            'Have chair nearby for support',
                            'Start with 20 seconds if 60 is too long',
                            'Practice on stable surface first'
                        ],
                        'benefits': [
                            'Challenges balance systems',
                            'Strengthens ankle stabilizers',
                            'Improves proprioception'
                        ]
                    },
                    {
                        'id': 'stability_003',
                        'name': 'Sit-to-Stand Exercise',
                        'description': 'Practice standing up and sitting down to improve leg strength and balance',
                        'target_metric': 'stability_score',
                        'expected_improvement': '0.08-0.12 improvement in 4 weeks',
                        'duration': '10 minutes',
                        'frequency': '5 times per week',
                        'sets': 3,
                        'reps': 10,
                        'difficulty': 'beginner',
                        'equipment': 'Sturdy chair',
                        'instructions': [
                            'Sit in sturdy chair with feet flat on floor',
                            'Lean forward slightly',
                            'Stand up without using hands if possible',
                            'Slowly sit back down',
                            'Repeat 10 times, rest, do 3 sets'
                        ],
                        'benefits': [
                            'Strengthens legs',
                            'Improves balance transitions',
                            'Enhances functional mobility'
                        ]
                    }
                ]
            },
            
            # IRREGULAR STEPS EXERCISES
            'irregular_steps': {
                'moderate': [
                    {
                        'id': 'regularity_001',
                        'name': 'Rhythm Walking with Music',
                        'description': 'Walk to consistent beat of music to improve step regularity',
                        'target_metric': 'step_regularity',
                        'expected_improvement': '0.1-0.15 improvement in 4 weeks',
                        'duration': '15 minutes',
                        'frequency': '5 times per week',
                        'difficulty': 'beginner',
                        'equipment': 'Music player with steady beat',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Choose music with clear, steady beat (100-120 BPM)',
                            'Start music and walk matching each step to the beat',
                            'Focus on keeping steps even and consistent',
                            'Walk for 15 minutes continuously',
                            'Count steps: should be same on left and right'
                        ],
                        'precautions': [
                            'Choose safe walking route',
                            'Don\'t use headphones outdoors',
                            'Select music with clear rhythm'
                        ],
                        'progression': {
                            'week_1': '10 minutes at 100 BPM',
                            'week_2': '12 minutes at 105 BPM',
                            'week_3': '15 minutes at 110 BPM',
                            'week_4': '15 minutes at 115 BPM'
                        },
                        'benefits': [
                            'Improves step timing',
                            'Increases consistency',
                            'Enhances rhythm',
                            'Makes walking more automatic'
                        ]
                    },
                    {
                        'id': 'regularity_002',
                        'name': 'Counting Cadence Walk',
                        'description': 'Count out loud while walking to maintain steady rhythm',
                        'target_metric': 'step_regularity',
                        'expected_improvement': '0.08-0.12 improvement in 4 weeks',
                        'duration': '12 minutes',
                        'frequency': '4 times per week',
                        'difficulty': 'beginner',
                        'equipment': 'None',
                        'instructions': [
                            'Start walking',
                            'Count out loud: "1, 2, 3, 4, 1, 2, 3, 4"',
                            'Take one step per count',
                            'Keep rhythm steady',
                            'Walk for 12 minutes'
                        ],
                        'benefits': [
                            'Maintains consistent pace',
                            'Improves step timing',
                            'Enhances motor control'
                        ]
                    }
                ]
            },
            
            # SLOW VELOCITY EXERCISES  
            'slow_velocity': {
                'severe': [
                    {
                        'id': 'velocity_001',
                        'name': 'Treadmill Interval Training',
                        'description': 'Alternate between comfortable and fast walking speeds on treadmill',
                        'target_metric': 'velocity',
                        'expected_improvement': '0.15-0.25 m/s in 6 weeks',
                        'duration': '20 minutes',
                        'frequency': '4 times per week',
                        'difficulty': 'intermediate',
                        'equipment': 'Treadmill',
                        'video_url': 'https://youtu.be/example',
                        'instructions': [
                            'Warm up: 5 minutes at comfortable speed (0.8-1.0 m/s)',
                            'Increase speed by 10% for 2 minutes',
                            'Return to comfortable speed for 2 minutes',
                            'Repeat fast-slow intervals 4 times',
                            'Cool down: 5 minutes at slow speed'
                        ],
                        'precautions': [
                            'Use treadmill safety clip',
                            'Hold handrails during speed changes',
                            'Start with small speed increases',
                            'Have someone nearby first few times'
                        ],
                        'progression': {
                            'week_1': '10% speed increase, 4 intervals',
                            'week_2': '15% speed increase, 4 intervals',
                            'week_3': '20% speed increase, 5 intervals',
                            'week_4_6': '25% speed increase, 6 intervals'
                        },
                        'benefits': [
                            'Increases walking speed',
                            'Builds endurance',
                            'Improves cardiovascular fitness',
                            'Safe speed progression'
                        ]
                    },
                    {
                        'id': 'velocity_002',
                        'name': 'Power Walking Practice',
                        'description': 'Walk as fast as safely possible for short distances',
                        'target_metric': 'velocity',
                        'expected_improvement': '0.1-0.2 m/s in 6 weeks',
                        'duration': '15 minutes',
                        'frequency': '4 times per week',
                        'sets': 5,
                        'reps': '50 meters',
                        'difficulty': 'intermediate',
                        'equipment': 'None',
                        'instructions': [
                            'Mark a 50-meter distance (use tape or cones)',
                            'Walk this distance as fast as you safely can',
                            'Use full arm swings',
                            'Take longer, faster steps',
                            'Time yourself and try to improve',
                            'Rest 2 minutes between attempts',
                            'Do 5 attempts'
                        ],
                        'benefits': [
                            'Increases maximum walking speed',
                            'Builds leg power',
                            'Improves cardiovascular fitness'
                        ]
                    }
                ],
                'moderate': [
                    {
                        'id': 'velocity_003',
                        'name': 'Resistance Band Walking',
                        'description': 'Walk with resistance band around ankles to build strength',
                        'target_metric': 'velocity',
                        'expected_improvement': '0.08-0.15 m/s in 8 weeks',
                        'duration': '12 minutes',
                        'frequency': '3 times per week',
                        'sets': 3,
                        'reps': '20 steps',
                        'difficulty': 'advanced',
                        'equipment': 'Resistance band',
                        'instructions': [
                            'Wrap resistance band around both ankles',
                            'Walk forward taking normal steps',
                            'Band provides resistance',
                            'Walk 20 steps, rest, repeat 3 times'
                        ],
                        'benefits': [
                            'Builds leg strength',
                            'Increases walking power',
                            'Improves endurance'
                        ]
                    }
                ]
            }
        }
    
    def get_exercises_for_problem(self, problem_type, severity):
        """
        Get exercises for a specific problem and severity level
        
        Args:
            problem_type: string - 'slow_cadence', 'short_stride', etc.
            severity: string - 'severe', 'moderate', 'mild'
            
        Returns:
            list of exercise dictionaries
        """
        if problem_type not in self.exercises:
            return []
        
        # Try to get exact severity match
        if severity in self.exercises[problem_type]:
            return self.exercises[problem_type][severity]
        
        # Fallback: if requesting 'mild' but only 'moderate' exists, use moderate
        if severity == 'mild' and 'moderate' in self.exercises[problem_type]:
            return self.exercises[problem_type]['moderate']
        
        # Fallback: return severe exercises if available
        if 'severe' in self.exercises[problem_type]:
            return self.exercises[problem_type]['severe']
        
        return []
    
    def get_all_problem_types(self):
        """Get list of all problem types with exercises"""
        return list(self.exercises.keys())
    
    def get_exercise_by_id(self, exercise_id):
        """Get specific exercise by ID"""
        for problem_type in self.exercises.values():
            for severity_level in problem_type.values():
                for exercise in severity_level:
                    if exercise['id'] == exercise_id:
                        return exercise
        return None
