"""
Intelligent Therapy Prioritization & Sequencing System
Uses Decision Rules + Graph-Based Recommendations for prescriptive analysis
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


def get_collections():
    """Get MongoDB collections"""
    db = get_db_connection()
    return {
        'articulation_progress': db['articulation_progress'],
        'articulation_trials': db['articulation_trials'],
        'language_progress': db['language_progress'],
        'language_trials': db['language_trials']
    }


class TherapyData(Fact):
    """Fact to store therapy data for decision rules"""
    pass


class TherapyPrioritizationEngine(KnowledgeEngine):
    """Decision Rules Engine for therapy prioritization"""
    
    def __init__(self):
        super().__init__()
        self.priorities = []
        self.recommendations = []
        self.insights = []
    
    # ARTICULATION PRIORITY RULES
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: x < 30), predicted_days=P(lambda x: x > 90)))
    def articulation_critical_bottleneck(self):
        self.priorities.append({
            'therapy': 'articulation',
            'priority': 'HIGH',
            'weight': 0.6,
            'reason': 'Critical bottleneck - Low progress and high predicted completion time',
            'focus': 'Master basic sounds first (S, K, R)'
        })
        self.recommendations.append('Focus 60% of practice time on articulation exercises')
        self.insights.append('Articulation is your primary bottleneck. Mastering key sounds will unlock faster progress.')
    
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: 30 <= x < 60), predicted_days=P(lambda x: x > 60)))
    def articulation_medium_priority(self):
        self.priorities.append({
            'therapy': 'articulation',
            'priority': 'MEDIUM',
            'weight': 0.4,
            'reason': 'Moderate progress but still needs significant work',
            'focus': 'Practice problematic sounds'
        })
        self.recommendations.append('Dedicate 40% of practice time to articulation')
    
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: x >= 80)))
    def articulation_maintenance(self):
        self.priorities.append({
            'therapy': 'articulation',
            'priority': 'COMPLETE',
            'weight': 0.1,
            'reason': 'Excellent progress - maintain with light practice',
            'focus': 'Maintenance only'
        })
        self.recommendations.append('Keep articulation sharp with 1-2 trials per week')
    
    # LANGUAGE PRIORITY RULES
    @Rule(TherapyData(therapy='language_receptive', progress=P(lambda x: x < 50), trial_count=P(lambda x: x < 30)))
    def receptive_needs_attention(self):
        self.priorities.append({
            'therapy': 'language_receptive',
            'priority': 'HIGH',
            'weight': 0.5,
            'reason': 'Low comprehension scores and limited practice',
            'focus': 'Basic comprehension exercises'
        })
        self.recommendations.append('Understanding language is foundation - practice receptive skills daily')
    
    @Rule(TherapyData(therapy='language_expressive', progress=P(lambda x: x < 40)))
    def expressive_critical(self):
        self.priorities.append({
            'therapy': 'language_expressive',
            'priority': 'HIGH',
            'weight': 0.55,
            'reason': 'Expression skills need immediate attention',
            'focus': 'Simple sentence formation'
        })
        self.recommendations.append('Practice forming simple sentences before advancing')


class TherapyGraph:
    """Graph-Based Recommendation System for therapy sequencing"""
    
    def __init__(self):
        self.G = nx.DiGraph()
        self._build_therapy_dependency_graph()
    
    def _build_therapy_dependency_graph(self):
        """Build comprehensive therapy dependency graph"""
        
        # Add therapy nodes
        therapies = ['articulation', 'language_receptive', 'language_expressive']
        self.G.add_nodes_from(therapies, node_type='therapy')
        
        # Add skill nodes
        skills = [
            'pronunciation', 'vocabulary', 'sentence_formation',
            'sound_mastery', 'comprehension', 'expression'
        ]
        self.G.add_nodes_from(skills, node_type='skill')
        
        # Add therapy-to-skill edges
        therapy_skills = {
            'articulation': ['pronunciation', 'sound_mastery'],
            'language_receptive': ['vocabulary', 'comprehension'],
            'language_expressive': ['sentence_formation', 'expression']
        }
        
        for therapy, skill_list in therapy_skills.items():
            for skill in skill_list:
                self.G.add_edge(therapy, skill, relationship='improves', weight=1.0)
        
        # Add skill dependencies
        skill_dependencies = [
            ('vocabulary', 'expression', 0.9),
            ('comprehension', 'expression', 0.8),
            ('sound_mastery', 'pronunciation', 0.9)
        ]
        
        for skill1, skill2, weight in skill_dependencies:
            self.G.add_edge(skill1, skill2, relationship='enables', weight=weight)
        
        # Add cross-therapy synergies
        cross_therapy_synergies = [
            ('articulation', 'language_expressive', 0.6, 'Clear articulation improves expression'),
            ('language_receptive', 'language_expressive', 0.85, 'Understanding enables expression')
        ]
        
        for therapy1, therapy2, weight, reason in cross_therapy_synergies:
            self.G.add_edge(therapy1, therapy2, relationship='synergy', weight=weight, reason=reason)
    
    def get_therapy_bottleneck(self, therapy_states):
        """Calculate which therapy is the biggest bottleneck"""
        bottleneck_scores = {}
        
        for therapy, progress in therapy_states.items():
            if therapy not in self.G:
                continue
            
            descendants = nx.descendants(self.G, therapy)
            therapy_descendants = [d for d in descendants if self.G.nodes[d].get('node_type') == 'therapy']
            
            impact_factor = len(therapy_descendants) + 1
            bottleneck_score = (100 - progress) * impact_factor
            
            bottleneck_scores[therapy] = {
                'score': bottleneck_score,
                'progress': progress,
                'blocks_therapies': therapy_descendants,
                'impact_factor': impact_factor
            }
        
        return bottleneck_scores
    
    def get_optimal_sequence(self, therapy_states):
        """Determine optimal practice sequence"""
        bottlenecks = self.get_therapy_bottleneck(therapy_states)
        sorted_therapies = sorted(bottlenecks.items(), key=lambda x: x[1]['score'], reverse=True)
        
        return [{'therapy': t[0], 'reason': f'Priority {i+1}: {t[1]["score"]:.0f} impact score'} 
                for i, t in enumerate(sorted_therapies)]
    
    def get_cross_therapy_insights(self):
        """Extract cross-therapy synergies"""
        insights = []
        
        for edge in self.G.edges(data=True):
            if edge[2].get('relationship') == 'synergy':
                insights.append({
                    'from_therapy': edge[0],
                    'to_therapy': edge[1],
                    'reason': edge[2].get('reason', 'Related therapies')
                })
        
        return insights


def collect_therapy_metrics(user_id):
    """Collect current metrics for all therapies"""
    collections = get_collections()
    
    metrics = {
        'articulation': {'progress': 0, 'trial_count': 0, 'accuracy': 0, 'predicted_days': 999},
        'language_receptive': {'progress': 0, 'trial_count': 0, 'accuracy': 0},
        'language_expressive': {'progress': 0, 'trial_count': 0, 'accuracy': 0}
    }
    
    # Articulation metrics
    articulation_trials = list(collections['articulation_trials'].find({'user_id': user_id}))
    if articulation_trials:
        scores = [t.get('scores', {}).get('computed_score', 0) for t in articulation_trials]
        metrics['articulation']['accuracy'] = sum(scores) / len(scores) if scores else 0
        metrics['articulation']['trial_count'] = len(articulation_trials)
        metrics['articulation']['progress'] = metrics['articulation']['accuracy']
    
    # Language metrics
    receptive_trials = list(collections['language_trials'].find({'user_id': user_id, 'mode': 'receptive'}))
    if receptive_trials:
        correct = sum(1 for t in receptive_trials if t.get('is_correct'))
        metrics['language_receptive']['accuracy'] = (correct / len(receptive_trials)) * 100
        metrics['language_receptive']['trial_count'] = len(receptive_trials)
        metrics['language_receptive']['progress'] = metrics['language_receptive']['accuracy']
    
    expressive_trials = list(collections['language_trials'].find({'user_id': user_id, 'mode': 'expressive'}))
    if expressive_trials:
        correct = sum(1 for t in expressive_trials if t.get('is_correct'))
        metrics['language_expressive']['accuracy'] = (correct / len(expressive_trials)) * 100
        metrics['language_expressive']['trial_count'] = len(expressive_trials)
        metrics['language_expressive']['progress'] = metrics['language_expressive']['accuracy']
    
    return metrics


def generate_therapy_prioritization(user_id):
    """Main function to generate therapy prioritization"""
    
    # Collect metrics
    metrics = collect_therapy_metrics(user_id)
    
    # Initialize decision engine
    engine = TherapyPrioritizationEngine()
    engine.reset()
    
    # Declare facts for each therapy
    for therapy, data in metrics.items():
        engine.declare(TherapyData(
            therapy=therapy,
            progress=data['progress'],
            trial_count=data['trial_count'],
            predicted_days=data.get('predicted_days', 999)
        ))
    
    # Run decision rules
    engine.run()
    
    # Initialize graph
    graph = TherapyGraph()
    
    # Prepare therapy states for graph analysis
    therapy_states = {therapy: data['progress'] for therapy, data in metrics.items()}
    
    # Get bottleneck analysis
    bottlenecks = graph.get_therapy_bottleneck(therapy_states)
    max_bottleneck = max(bottlenecks.items(), key=lambda x: x[1]['score']) if bottlenecks else (None, None)
    
    bottleneck_analysis = None
    if max_bottleneck[0]:
        bottleneck_analysis = {
            'bottleneck': max_bottleneck[0],
            'score': max_bottleneck[1]['score'],
            'affected_therapies': max_bottleneck[1]['blocks_therapies'],
            'explanation': f"{max_bottleneck[0].replace('_', ' ').title()} is blocking progress in {len(max_bottleneck[1]['blocks_therapies'])} other areas"
        }
    
    # Get optimal sequence
    optimal_sequence = graph.get_optimal_sequence(therapy_states)
    
    # Get cross-therapy insights
    cross_therapy_insights = graph.get_cross_therapy_insights()
    
    # Generate weekly schedule
    weekly_schedule = generate_weekly_schedule(engine.priorities, metrics)
    
    return {
        'priorities': engine.priorities,
        'recommendations': engine.recommendations,
        'insights': engine.insights,
        'weekly_schedule': weekly_schedule,
        'bottleneck_analysis': bottleneck_analysis,
        'optimal_sequence': optimal_sequence,
        'cross_therapy_insights': cross_therapy_insights,
        'generated_at': datetime.now().isoformat()
    }


def generate_weekly_schedule(priorities, metrics):
    """Generate a weekly practice schedule"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    schedule = []
    
    # Sort priorities by weight
    sorted_priorities = sorted(priorities, key=lambda x: x['weight'], reverse=True)
    
    for day in days:
        day_exercises = []
        
        for priority in sorted_priorities:
            therapy = priority['therapy']
            priority_level = priority['priority']
            
            # Skip completed therapies
            if priority_level == 'COMPLETE':
                if day == 'Monday':
                    day_exercises.append({
                        'therapy': therapy.replace('_', ' ').title(),
                        'trials': 1,
                        'focus': 'Maintenance',
                        'priority': 'LOW'
                    })
                continue
            
            # Calculate trials
            if priority_level == 'HIGH':
                base_trials = 3
            elif priority_level == 'MEDIUM':
                base_trials = 2
            else:
                base_trials = 1
            
            # Adjust for weekends
            if day in ['Saturday', 'Sunday']:
                trials = max(1, base_trials - 1)
            else:
                trials = base_trials
            
            day_exercises.append({
                'therapy': therapy.replace('_', ' ').title(),
                'trials': trials,
                'focus': priority.get('focus', 'General practice'),
                'priority': priority_level
            })
        
        schedule.append({
            'day': day,
            'exercises': day_exercises,
            'total_trials': sum(e['trials'] for e in day_exercises)
        })
    
    return schedule
