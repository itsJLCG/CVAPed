"""
Intelligent Gait Therapy Prioritization & Sequencing System
Uses Decision Rules + Graph-Based Recommendations for prescriptive gait analysis
"""

import os
import sys
from pymongo import MongoClient
from datetime import datetime, timedelta
import networkx as nx
from experta import *
import numpy as np
from collections import defaultdict
from dotenv import load_dotenv
from bson import ObjectId

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")

def get_db_connection():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URI)
    return client['CVACare']


# Healthy Thresholds (based on gait_mastery_predictor)
HEALTHY_THRESHOLDS = {
    'cadence': 100,        # steps/min
    'velocity': 1.2,       # m/s
    'stride_length': 1.35, # m
    'stability': 0.85,     # 0-1
    'symmetry': 0.85,      # 0-1
    'regularity': 0.85     # 0-1
}


class GaitData(Fact):
    """Fact to store gait data for decision rules"""
    pass


class GaitPrioritizationEngine(KnowledgeEngine):
    """Decision Rules Engine for gait therapy prioritization"""
    
    def __init__(self):
        super().__init__()
        self.priorities = []
        self.recommendations = []
        self.insights = []
    
    # STABILITY PRIORITY RULES
    @Rule(GaitData(parameter='stability', value=P(lambda x: x < 0.70), predicted_days=P(lambda x: x > 90)))
    def stability_critical(self):
        self.priorities.append({
            'parameter': 'stability',
            'priority': 'CRITICAL',
            'weight': 0.7,
            'reason': 'Critically low stability - High fall risk',
            'focus': 'Balance exercises and core strengthening',
            'target': HEALTHY_THRESHOLDS['stability']
        })
        self.recommendations.append('Focus 70% of therapy time on stability exercises - FALL RISK')
        self.insights.append('Stability is critically low. Prioritize balance training to reduce fall risk before advancing.')
    
    @Rule(GaitData(parameter='stability', value=P(lambda x: 0.70 <= x < 0.85)))
    def stability_needs_improvement(self):
        self.priorities.append({
            'parameter': 'stability',
            'priority': 'HIGH',
            'weight': 0.5,
            'reason': 'Below healthy threshold - moderate fall risk',
            'focus': 'Static and dynamic balance',
            'target': HEALTHY_THRESHOLDS['stability']
        })
        self.recommendations.append('Dedicate 50% of practice to stability and balance exercises')
    
    @Rule(GaitData(parameter='stability', value=P(lambda x: x >= 0.85)))
    def stability_healthy(self):
        self.priorities.append({
            'parameter': 'stability',
            'priority': 'MAINTENANCE',
            'weight': 0.1,
            'reason': 'Within healthy range',
            'focus': 'Maintain current level',
            'target': HEALTHY_THRESHOLDS['stability']
        })
    
    # SYMMETRY PRIORITY RULES
    @Rule(GaitData(parameter='symmetry', value=P(lambda x: x < 0.70)))
    def symmetry_critical(self):
        self.priorities.append({
            'parameter': 'symmetry',
            'priority': 'CRITICAL',
            'weight': 0.65,
            'reason': 'Severe gait asymmetry - compensatory patterns present',
            'focus': 'Single-leg exercises and weight-bearing balance',
            'target': HEALTHY_THRESHOLDS['symmetry']
        })
        self.recommendations.append('Address gait asymmetry with unilateral exercises (60-65% focus)')
        self.insights.append('Severe asymmetry detected. Compensatory patterns may cause secondary injuries.')
    
    @Rule(GaitData(parameter='symmetry', value=P(lambda x: 0.70 <= x < 0.85)))
    def symmetry_needs_improvement(self):
        self.priorities.append({
            'parameter': 'symmetry',
            'priority': 'HIGH',
            'weight': 0.45,
            'reason': 'Moderate asymmetry - unequal weight distribution',
            'focus': 'Bilateral strengthening and coordination',
            'target': HEALTHY_THRESHOLDS['symmetry']
        })
        self.recommendations.append('Work on symmetrical movement patterns (45% of therapy)')
    
    @Rule(GaitData(parameter='symmetry', value=P(lambda x: x >= 0.85)))
    def symmetry_healthy(self):
        self.priorities.append({
            'parameter': 'symmetry',
            'priority': 'MAINTENANCE',
            'weight': 0.1,
            'reason': 'Symmetrical gait pattern',
            'focus': 'Maintain balance',
            'target': HEALTHY_THRESHOLDS['symmetry']
        })
    
    # VELOCITY PRIORITY RULES
    @Rule(GaitData(parameter='velocity', value=P(lambda x: x < 0.8), session_count=P(lambda x: x > 10)))
    def velocity_critical_with_practice(self):
        self.priorities.append({
            'parameter': 'velocity',
            'priority': 'CRITICAL',
            'weight': 0.6,
            'reason': 'Severely slow gait despite practice - may indicate weakness',
            'focus': 'Lower limb strengthening and endurance',
            'target': HEALTHY_THRESHOLDS['velocity']
        })
        self.recommendations.append('Focus on strength training and walking endurance (60% focus)')
        self.insights.append('Low velocity despite practice. Consider progressive resistance training.')
    
    @Rule(GaitData(parameter='velocity', value=P(lambda x: 0.8 <= x < 1.2)))
    def velocity_needs_improvement(self):
        self.priorities.append({
            'parameter': 'velocity',
            'priority': 'HIGH',
            'weight': 0.4,
            'reason': 'Below healthy walking speed',
            'focus': 'Cadence training and stride optimization',
            'target': HEALTHY_THRESHOLDS['velocity']
        })
        self.recommendations.append('Work on increasing walking speed gradually (40% of therapy)')
    
    @Rule(GaitData(parameter='velocity', value=P(lambda x: x >= 1.2)))
    def velocity_healthy(self):
        self.priorities.append({
            'parameter': 'velocity',
            'priority': 'MAINTENANCE',
            'weight': 0.15,
            'reason': 'Healthy walking velocity',
            'focus': 'Maintain speed',
            'target': HEALTHY_THRESHOLDS['velocity']
        })
    
    # CADENCE PRIORITY RULES
    @Rule(GaitData(parameter='cadence', value=P(lambda x: x < 80)))
    def cadence_critical(self):
        self.priorities.append({
            'parameter': 'cadence',
            'priority': 'CRITICAL',
            'weight': 0.55,
            'reason': 'Very slow step rate - mobility limitation',
            'focus': 'Metronome training and step rate drills',
            'target': HEALTHY_THRESHOLDS['cadence']
        })
        self.recommendations.append('Use metronome-assisted gait training to increase step rate (55% focus)')
        self.insights.append('Cadence training is foundational. Faster steps often lead to better velocity.')
    
    @Rule(GaitData(parameter='cadence', value=P(lambda x: 80 <= x < 100)))
    def cadence_needs_improvement(self):
        self.priorities.append({
            'parameter': 'cadence',
            'priority': 'MEDIUM',
            'weight': 0.35,
            'reason': 'Below optimal step rate',
            'focus': 'Rhythm and timing exercises',
            'target': HEALTHY_THRESHOLDS['cadence']
        })
        self.recommendations.append('Practice rhythmic stepping exercises (35% of therapy)')
    
    @Rule(GaitData(parameter='cadence', value=P(lambda x: x >= 100)))
    def cadence_healthy(self):
        self.priorities.append({
            'parameter': 'cadence',
            'priority': 'MAINTENANCE',
            'weight': 0.15,
            'reason': 'Healthy step rate',
            'focus': 'Maintain cadence',
            'target': HEALTHY_THRESHOLDS['cadence']
        })
    
    # STRIDE LENGTH PRIORITY RULES
    @Rule(GaitData(parameter='stride_length', value=P(lambda x: x < 1.0)))
    def stride_critical(self):
        self.priorities.append({
            'parameter': 'stride_length',
            'priority': 'HIGH',
            'weight': 0.5,
            'reason': 'Shortened stride - limited hip mobility',
            'focus': 'Hip flexibility and extension exercises',
            'target': HEALTHY_THRESHOLDS['stride_length']
        })
        self.recommendations.append('Work on hip ROM and stride extension exercises (50% focus)')
        self.insights.append('Short stride often indicates hip flexor tightness or weakness.')
    
    @Rule(GaitData(parameter='stride_length', value=P(lambda x: 1.0 <= x < 1.35)))
    def stride_needs_improvement(self):
        self.priorities.append({
            'parameter': 'stride_length',
            'priority': 'MEDIUM',
            'weight': 0.3,
            'reason': 'Below optimal stride length',
            'focus': 'Progressive stride lengthening',
            'target': HEALTHY_THRESHOLDS['stride_length']
        })
        self.recommendations.append('Gradually increase stride length through targeted exercises (30% focus)')
    
    @Rule(GaitData(parameter='stride_length', value=P(lambda x: x >= 1.35)))
    def stride_healthy(self):
        self.priorities.append({
            'parameter': 'stride_length',
            'priority': 'MAINTENANCE',
            'weight': 0.1,
            'reason': 'Healthy stride length',
            'focus': 'Maintain stride',
            'target': HEALTHY_THRESHOLDS['stride_length']
        })
    
    # REGULARITY PRIORITY RULES
    @Rule(GaitData(parameter='regularity', value=P(lambda x: x < 0.70)))
    def regularity_critical(self):
        self.priorities.append({
            'parameter': 'regularity',
            'priority': 'HIGH',
            'weight': 0.45,
            'reason': 'Irregular gait pattern - inconsistent stepping',
            'focus': 'Coordination and motor control training',
            'target': HEALTHY_THRESHOLDS['regularity']
        })
        self.recommendations.append('Focus on consistent, repeatable movement patterns (45% focus)')
        self.insights.append('Irregular gait suggests motor control issues. Practice consistent stepping patterns.')
    
    @Rule(GaitData(parameter='regularity', value=P(lambda x: 0.70 <= x < 0.85)))
    def regularity_needs_improvement(self):
        self.priorities.append({
            'parameter': 'regularity',
            'priority': 'MEDIUM',
            'weight': 0.3,
            'reason': 'Some variation in step pattern',
            'focus': 'Gait consistency training',
            'target': HEALTHY_THRESHOLDS['regularity']
        })
        self.recommendations.append('Practice regular, paced walking (30% of therapy)')
    
    @Rule(GaitData(parameter='regularity', value=P(lambda x: x >= 0.85)))
    def regularity_healthy(self):
        self.priorities.append({
            'parameter': 'regularity',
            'priority': 'MAINTENANCE',
            'weight': 0.1,
            'reason': 'Consistent gait pattern',
            'focus': 'Maintain regularity',
            'target': HEALTHY_THRESHOLDS['regularity']
        })


class GaitTherapyGraph:
    """Graph-Based Recommendation System for gait therapy sequencing"""
    
    def __init__(self):
        self.G = nx.DiGraph()
        self._build_gait_dependency_graph()
    
    def _build_gait_dependency_graph(self):
        """Build comprehensive gait parameter dependency graph"""
        
        # Add gait parameter nodes
        parameters = ['stability', 'symmetry', 'velocity', 'cadence', 'stride_length', 'regularity']
        self.G.add_nodes_from(parameters, node_type='parameter')
        
        # Add exercise category nodes
        exercises = [
            'balance_training', 'strengthening', 'flexibility',
            'endurance', 'coordination', 'motor_control'
        ]
        self.G.add_nodes_from(exercises, node_type='exercise')
        
        # Add parameter-to-exercise edges (which exercises improve which parameters)
        parameter_exercises = {
            'stability': ['balance_training', 'strengthening'],
            'symmetry': ['balance_training', 'coordination'],
            'velocity': ['strengthening', 'endurance'],
            'cadence': ['coordination', 'motor_control'],
            'stride_length': ['flexibility', 'strengthening'],
            'regularity': ['motor_control', 'coordination']
        }
        
        for parameter, exercise_list in parameter_exercises.items():
            for exercise in exercise_list:
                self.G.add_edge(exercise, parameter, relationship='improves', weight=1.0)
        
        # Add parameter dependencies (prerequisite relationships)
        # Format: (prerequisite, dependent, weight, reason)
        parameter_dependencies = [
            ('stability', 'velocity', 0.9, 'Stable balance required before increasing speed'),
            ('stability', 'stride_length', 0.85, 'Stability enables longer strides'),
            ('symmetry', 'regularity', 0.8, 'Symmetrical gait promotes consistent patterns'),
            ('cadence', 'velocity', 0.7, 'Higher step rate contributes to faster walking'),
            ('stride_length', 'velocity', 0.75, 'Longer strides increase walking speed'),
            ('regularity', 'velocity', 0.65, 'Consistent pattern allows confident speed increase')
        ]
        
        for prereq, dependent, weight, reason in parameter_dependencies:
            self.G.add_edge(prereq, dependent, relationship='prerequisite', weight=weight, reason=reason)
        
        # Add cross-parameter synergies (parameters that reinforce each other)
        synergies = [
            ('stability', 'symmetry', 0.85, 'Good balance enables equal weight distribution'),
            ('cadence', 'regularity', 0.8, 'Consistent step rate creates regular pattern'),
            ('stride_length', 'symmetry', 0.7, 'Equal stride length ensures symmetry')
        ]
        
        for param1, param2, weight, reason in synergies:
            self.G.add_edge(param1, param2, relationship='synergy', weight=weight, reason=reason)
    
    def get_parameter_bottleneck(self, parameter_states):
        """Calculate which parameter is the biggest bottleneck"""
        bottleneck_scores = {}
        
        for parameter, current_value in parameter_states.items():
            if parameter not in self.G:
                continue
            
            # Get parameters that depend on this one
            descendants = nx.descendants(self.G, parameter)
            parameter_descendants = [d for d in descendants if self.G.nodes[d].get('node_type') == 'parameter']
            
            # Calculate deficit (how far from healthy threshold)
            target = HEALTHY_THRESHOLDS.get(parameter, 1.0)
            deficit_percent = ((target - current_value) / target) * 100
            deficit_percent = max(0, deficit_percent)  # Can't be negative
            
            # Impact factor: how many parameters does this block?
            impact_factor = len(parameter_descendants) + 1
            
            # Bottleneck score: deficit * impact
            bottleneck_score = deficit_percent * impact_factor
            
            bottleneck_scores[parameter] = {
                'score': bottleneck_score,
                'current_value': current_value,
                'target': target,
                'deficit_percent': deficit_percent,
                'blocks_parameters': parameter_descendants,
                'impact_factor': impact_factor
            }
        
        return bottleneck_scores
    
    def get_optimal_sequence(self, parameter_states):
        """Determine optimal training sequence based on dependencies"""
        bottlenecks = self.get_parameter_bottleneck(parameter_states)
        
        # Sort by bottleneck score (highest first)
        sorted_parameters = sorted(bottlenecks.items(), key=lambda x: x[1]['score'], reverse=True)
        
        sequence = []
        for i, (param, data) in enumerate(sorted_parameters):
            if data['deficit_percent'] > 5:  # Only include parameters needing improvement
                sequence.append({
                    'parameter': param,
                    'priority_rank': i + 1,
                    'deficit_percent': round(data['deficit_percent'], 1),
                    'current_value': round(data['current_value'], 2),
                    'target': data['target'],
                    'reason': f'Priority {i+1}: {data["deficit_percent"]:.0f}% below target, blocks {len(data["blocks_parameters"])} other parameters'
                })
        
        return sequence
    
    def get_prerequisite_insights(self):
        """Extract prerequisite relationships between parameters"""
        insights = []
        
        for edge in self.G.edges(data=True):
            if edge[2].get('relationship') == 'prerequisite':
                insights.append({
                    'prerequisite': edge[0],
                    'dependent': edge[1],
                    'reason': edge[2].get('reason', 'Foundational parameter')
                })
        
        return insights
    
    def get_synergy_insights(self):
        """Extract synergy relationships between parameters"""
        synergies = []
        
        for edge in self.G.edges(data=True):
            if edge[2].get('relationship') == 'synergy':
                synergies.append({
                    'parameter_1': edge[0],
                    'parameter_2': edge[1],
                    'reason': edge[2].get('reason', 'Related parameters')
                })
        
        return synergies


def collect_gait_metrics(user_id):
    """Collect current gait metrics from gaitprogresses collection"""
    db = get_db_connection()
    gait_collection = db['gaitprogresses']
    
    # Get recent gait sessions
    gait_sessions = list(gait_collection.find({'user_id': user_id}).sort('created_at', -1).limit(10))
    
    if not gait_sessions:
        return None
    
    # Calculate average metrics from recent sessions
    metrics = {
        'velocity': {'current': 0, 'session_count': 0},
        'cadence': {'current': 0, 'session_count': 0},
        'stride_length': {'current': 0, 'session_count': 0},
        'stability': {'current': 0, 'session_count': 0},
        'symmetry': {'current': 0, 'session_count': 0},
        'regularity': {'current': 0, 'session_count': 0}
    }
    
    # Aggregate metrics
    session_count = len(gait_sessions)
    
    for session in gait_sessions:
        current_gait = session.get('current_gait', {})
        
        metrics['velocity']['current'] += current_gait.get('velocity', 0)
        metrics['cadence']['current'] += current_gait.get('cadence', 0)
        metrics['stride_length']['current'] += current_gait.get('stride_length', 0)
        metrics['stability']['current'] += current_gait.get('stability_score', 0)
        metrics['symmetry']['current'] += current_gait.get('gait_symmetry', 0)
        metrics['regularity']['current'] += current_gait.get('step_regularity', 0)
    
    # Calculate averages
    for param in metrics:
        if session_count > 0:
            metrics[param]['current'] = metrics[param]['current'] / session_count
            metrics[param]['session_count'] = session_count
    
    return metrics


def generate_gait_prioritization(user_id, predicted_days=None):
    """Main function to generate gait therapy prioritization"""
    
    # Collect metrics
    metrics = collect_gait_metrics(user_id)
    
    if not metrics:
        return {
            'error': 'No gait data available',
            'message': 'Complete at least one gait analysis session to receive prescriptive recommendations'
        }
    
    # Initialize decision engine
    engine = GaitPrioritizationEngine()
    engine.reset()
    
    # Declare facts for each parameter
    for parameter, data in metrics.items():
        engine.declare(GaitData(
            parameter=parameter,
            value=data['current'],
            session_count=data['session_count'],
            predicted_days=predicted_days if predicted_days else 999
        ))
    
    # Run decision rules
    engine.run()
    
    # Initialize graph
    graph = GaitTherapyGraph()
    
    # Prepare parameter states for graph analysis
    parameter_states = {param: data['current'] for param, data in metrics.items()}
    
    # Get bottleneck analysis
    bottlenecks = graph.get_parameter_bottleneck(parameter_states)
    max_bottleneck = max(bottlenecks.items(), key=lambda x: x[1]['score']) if bottlenecks else (None, None)
    
    bottleneck_analysis = None
    if max_bottleneck[0]:
        bottleneck_analysis = {
            'bottleneck': max_bottleneck[0],
            'score': max_bottleneck[1]['score'],
            'deficit_percent': max_bottleneck[1]['deficit_percent'],
            'affected_parameters': max_bottleneck[1]['blocks_parameters'],
            'explanation': f"{max_bottleneck[0].replace('_', ' ').title()} is {max_bottleneck[1]['deficit_percent']:.0f}% below target and blocking {len(max_bottleneck[1]['blocks_parameters'])} other parameters"
        }
    
    # Get optimal sequence
    optimal_sequence = graph.get_optimal_sequence(parameter_states)
    
    # Get prerequisite and synergy insights
    prerequisite_insights = graph.get_prerequisite_insights()
    synergy_insights = graph.get_synergy_insights()
    
    # Generate weekly schedule
    weekly_schedule = generate_weekly_gait_schedule(engine.priorities, metrics)
    
    return {
        'priorities': engine.priorities,
        'recommendations': engine.recommendations,
        'insights': engine.insights,
        'weekly_schedule': weekly_schedule,
        'bottleneck_analysis': bottleneck_analysis,
        'optimal_sequence': optimal_sequence,
        'prerequisite_insights': prerequisite_insights,
        'synergy_insights': synergy_insights,
        'current_metrics': {param: data['current'] for param, data in metrics.items()},
        'healthy_thresholds': HEALTHY_THRESHOLDS,
        'generated_at': datetime.now().isoformat()
    }


def generate_weekly_gait_schedule(priorities, metrics):
    """Generate a weekly gait practice schedule"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    schedule = []
    
    # Sort priorities by weight
    sorted_priorities = sorted(priorities, key=lambda x: x['weight'], reverse=True)
    
    for day in days:
        day_exercises = []
        
        for priority in sorted_priorities:
            parameter = priority['parameter']
            priority_level = priority['priority']
            focus = priority['focus']
            
            # Skip maintenance-only parameters (except Monday for check-in)
            if priority_level == 'MAINTENANCE':
                if day == 'Monday':
                    day_exercises.append({
                        'parameter': parameter.replace('_', ' ').title(),
                        'duration': '10 min',
                        'focus': 'Maintenance check',
                        'priority': 'LOW'
                    })
                continue
            
            # Calculate duration based on priority
            if priority_level == 'CRITICAL':
                base_duration = 30
            elif priority_level == 'HIGH':
                base_duration = 20
            elif priority_level == 'MEDIUM':
                base_duration = 15
            else:
                base_duration = 10
            
            # Adjust for weekends (lighter sessions)
            if day in ['Saturday', 'Sunday']:
                duration = max(10, base_duration - 10)
            else:
                duration = base_duration
            
            day_exercises.append({
                'parameter': parameter.replace('_', ' ').title(),
                'duration': f'{duration} min',
                'focus': focus,
                'priority': priority_level
            })
        
        schedule.append({
            'day': day,
            'exercises': day_exercises,
            'total_duration': sum(int(ex['duration'].split()[0]) for ex in day_exercises)
        })
    
    return schedule


if __name__ == '__main__':
    # Test with a user_id
    import sys
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
        analysis = generate_gait_prioritization(user_id)
        
        print("\n" + "="*60)
        print("GAIT THERAPY PRIORITIZATION ANALYSIS")
        print("="*60)
        
        print("\n📊 PRIORITIES:")
        for priority in analysis['priorities']:
            print(f"  • {priority['parameter'].upper()}: {priority['priority']} (weight: {priority['weight']})")
            print(f"    Reason: {priority['reason']}")
            print(f"    Focus: {priority['focus']}")
        
        print("\n💡 RECOMMENDATIONS:")
        for rec in analysis['recommendations']:
            print(f"  • {rec}")
        
        print("\n🎯 INSIGHTS:")
        for insight in analysis['insights']:
            print(f"  • {insight}")
        
        if analysis.get('bottleneck_analysis'):
            print("\n🚧 BOTTLENECK ANALYSIS:")
            ba = analysis['bottleneck_analysis']
            print(f"  Main Bottleneck: {ba['bottleneck'].replace('_', ' ').title()}")
            print(f"  {ba['explanation']}")
        
        print("\n📅 SAMPLE MONDAY SCHEDULE:")
        monday = analysis['weekly_schedule'][0]
        for ex in monday['exercises']:
            print(f"  • {ex['parameter']}: {ex['duration']} - {ex['focus']} ({ex['priority']})")
    else:
        print("Usage: python gait_therapy_prioritization.py <user_id>")
