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
import joblib
from dotenv import load_dotenv

# Load environment variables from parent directory
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(parent_dir, '.env')
load_dotenv(dotenv_path)

# MongoDB connection (lazy initialization)
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'CVACare')

print(f"🔧 MongoDB URI loaded: {MONGO_URI[:30]}...")
print(f"🔧 Database Name: {DB_NAME}")

def get_db_connection():
    """Get MongoDB database connection (lazy initialization)"""
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]


def get_collections():
    """Get MongoDB collections"""
    db = get_db_connection()
    return {
        'articulation_progress': db['articulation_progress'],
        'articulation_trials': db['articulation_trials'],
        'language_progress': db['language_progress'],
        'language_trials': db['language_trials'],
        'fluency_progress': db['fluency_progress'],
        'fluency_trials': db['fluency_trials']
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
            'reason': 'Critical bottleneck - Low progress and high predicted completion time'
        })
        self.recommendations.append('Focus 60% of practice time on articulation exercises')
        self.insights.append('Articulation is your primary bottleneck. Mastering key sounds will unlock faster progress.')
    
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: 30 <= x < 60), predicted_days=P(lambda x: x > 60)))
    def articulation_medium_priority(self):
        self.priorities.append({
            'therapy': 'articulation',
            'priority': 'MEDIUM',
            'weight': 0.4,
            'reason': 'Moderate progress but still needs significant work'
        })
        self.recommendations.append('Dedicate 40% of practice time to articulation')
    
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: x >= 80)))
    def articulation_maintenance(self):
        self.priorities.append({
            'therapy': 'articulation',
            'priority': 'MAINTENANCE',
            'weight': 0.1,
            'reason': 'Excellent progress - maintain with light practice'
        })
        self.recommendations.append('Keep articulation sharp with 1-2 trials per week')
    
    # FLUENCY PRIORITY RULES
    @Rule(TherapyData(therapy='fluency', disfluencies=P(lambda x: x > 5), trial_count=P(lambda x: x < 20)))
    def fluency_needs_attention(self):
        self.priorities.append({
            'therapy': 'fluency',
            'priority': 'HIGH',
            'weight': 0.5,
            'reason': 'High disfluencies detected - needs immediate focus'
        })
        self.recommendations.append('Practice fluency exercises daily with focus on breath control')
        self.insights.append('Your disfluency count is elevated. Consistent fluency practice will help reduce it.')
    
    @Rule(TherapyData(therapy='fluency', progress=P(lambda x: x >= 70), confidence=P(lambda x: x > 0.7)))
    def fluency_good_progress(self):
        self.priorities.append({
            'therapy': 'fluency',
            'priority': 'MEDIUM',
            'weight': 0.3,
            'reason': 'Good momentum - maintain steady practice'
        })
        self.recommendations.append('Continue fluency exercises 3-4 times per week')
    
    @Rule(TherapyData(therapy='fluency', trial_count=P(lambda x: x < 10)))
    def fluency_insufficient_data(self):
        self.priorities.append({
            'therapy': 'fluency',
            'priority': 'MEDIUM',
            'weight': 0.35,
            'reason': 'Limited practice history - build consistency'
        })
        self.recommendations.append('Establish regular fluency practice routine')
    
    # LANGUAGE RECEPTIVE PRIORITY RULES
    @Rule(TherapyData(therapy='language_receptive', accuracy=P(lambda x: x >= 95)))
    def receptive_mastered(self):
        self.priorities.append({
            'therapy': 'language_receptive',
            'priority': 'COMPLETE',
            'weight': 0.05,
            'reason': 'Mastered - minimal maintenance needed'
        })
        self.recommendations.append('Maintain receptive skills with 1 exercise per week')
        self.insights.append('Excellent receptive language skills! Use this strength to boost expressive skills.')
    
    @Rule(TherapyData(therapy='language_receptive', accuracy=P(lambda x: 70 <= x < 95)))
    def receptive_good_progress(self):
        self.priorities.append({
            'therapy': 'language_receptive',
            'priority': 'LOW',
            'weight': 0.15,
            'reason': 'Solid progress - light practice to maintain'
        })
        self.recommendations.append('Practice receptive exercises 2-3 times per week')
    
    @Rule(TherapyData(therapy='language_receptive', accuracy=P(lambda x: x < 70)))
    def receptive_needs_work(self):
        self.priorities.append({
            'therapy': 'language_receptive',
            'priority': 'MEDIUM',
            'weight': 0.35,
            'reason': 'Below target - increase practice frequency'
        })
        self.recommendations.append('Focus on receptive comprehension exercises daily')
    
    # LANGUAGE EXPRESSIVE PRIORITY RULES
    @Rule(TherapyData(therapy='language_expressive', accuracy=P(lambda x: x < 60), 
                      receptive_accuracy=P(lambda x: x >= 80)))
    def expressive_leverage_receptive(self):
        self.priorities.append({
            'therapy': 'language_expressive',
            'priority': 'MEDIUM',
            'weight': 0.35,
            'reason': 'Leverage strong receptive skills for expression'
        })
        self.recommendations.append('Practice picture description exercises using known vocabulary')
        self.insights.append('Your strong receptive skills provide a foundation. Focus on expressing what you understand.')
    
    @Rule(TherapyData(therapy='language_expressive', accuracy=P(lambda x: x >= 90)))
    def expressive_mastered(self):
        self.priorities.append({
            'therapy': 'language_expressive',
            'priority': 'COMPLETE',
            'weight': 0.05,
            'reason': 'Excellent expressive skills'
        })
        self.recommendations.append('Maintain with 1 expressive exercise per week')
    
    @Rule(TherapyData(therapy='language_expressive', accuracy=P(lambda x: x < 70)))
    def expressive_needs_focus(self):
        self.priorities.append({
            'therapy': 'language_expressive',
            'priority': 'MEDIUM',
            'weight': 0.3,
            'reason': 'Needs consistent practice'
        })
        self.recommendations.append('Practice expressive exercises 4-5 times per week')
    
    # CROSS-THERAPY SYNERGY RULES
    @Rule(TherapyData(therapy='articulation', progress=P(lambda x: x < 50)),
          TherapyData(therapy='fluency', disfluencies=P(lambda x: x > 3)))
    def articulation_impacts_fluency(self):
        self.insights.append('Improving articulation clarity will naturally reduce fluency disruptions.')
        self.recommendations.append('Prioritize articulation before intensive fluency work')
    
    @Rule(TherapyData(therapy='fluency', speaking_rate=P(lambda x: x > 150)),
          TherapyData(therapy='articulation', accuracy=P(lambda x: x < 70)))
    def slow_down_for_accuracy(self):
        self.insights.append('Speaking too fast may be affecting pronunciation accuracy.')
        self.recommendations.append('Practice slower speech patterns to improve articulation')
    
    # CONSISTENCY RULES
    @Rule(TherapyData(consistency_score=P(lambda x: x < 0.5)))
    def low_consistency_warning(self):
        self.insights.append('Practice consistency is low. Regular practice is key to faster improvement.')
        self.recommendations.append('Set daily reminders and practice at the same time each day')
    
    # OVERWHELM PREVENTION RULES
    @Rule(TherapyData(active_therapies=P(lambda x: x >= 4)),
          TherapyData(all_below_threshold=True))
    def too_many_therapies(self):
        self.insights.append('Working on all therapies simultaneously may be overwhelming.')
        self.recommendations.append('Focus on 2-3 highest priority therapies first')


class TherapyGraph:
    """Graph-Based Recommendation System for therapy sequencing"""
    
    def __init__(self):
        self.G = nx.DiGraph()
        self._build_therapy_dependency_graph()
    
    def _build_therapy_dependency_graph(self):
        """Build comprehensive therapy dependency graph"""
        
        # Add therapy nodes
        therapies = ['articulation', 'fluency', 'language_receptive', 'language_expressive']
        self.G.add_nodes_from(therapies, node_type='therapy')
        
        # Add skill nodes
        skills = [
            'pronunciation', 'breath_control', 'vocabulary', 'sentence_formation',
            'sound_mastery', 'fluency_control', 'comprehension', 'expression'
        ]
        self.G.add_nodes_from(skills, node_type='skill')
        
        # Add therapy-to-skill edges (what each therapy improves)
        therapy_skills = {
            'articulation': ['pronunciation', 'sound_mastery'],
            'fluency': ['breath_control', 'fluency_control'],
            'language_receptive': ['vocabulary', 'comprehension'],
            'language_expressive': ['sentence_formation', 'expression']
        }
        
        for therapy, skill_list in therapy_skills.items():
            for skill in skill_list:
                self.G.add_edge(therapy, skill, relationship='improves', weight=1.0)
        
        # Add skill dependencies (prerequisites)
        skill_dependencies = [
            ('pronunciation', 'fluency_control', 0.7),  # Good pronunciation helps fluency
            ('vocabulary', 'expression', 0.9),  # Strong vocabulary enables expression
            ('comprehension', 'expression', 0.8),  # Understanding precedes expression
            ('breath_control', 'fluency_control', 0.6),  # Breathing affects fluency
            ('sound_mastery', 'pronunciation', 0.9)  # Master sounds for clear pronunciation
        ]
        
        for skill1, skill2, weight in skill_dependencies:
            self.G.add_edge(skill1, skill2, relationship='enables', weight=weight)
        
        # Add cross-therapy synergies
        cross_therapy_synergies = [
            ('articulation', 'fluency', 0.6, 'Clear articulation reduces disfluencies'),
            ('language_receptive', 'language_expressive', 0.85, 'Understanding enables expression'),
            ('fluency', 'language_expressive', 0.5, 'Fluent speech aids expression')
        ]
        
        for therapy1, therapy2, weight, reason in cross_therapy_synergies:
            self.G.add_edge(therapy1, therapy2, relationship='synergy', weight=weight, reason=reason)
    
    def get_therapy_bottleneck(self, therapy_states):
        """
        Calculate which therapy is the biggest bottleneck
        therapy_states: dict with {therapy: progress_percentage}
        """
        bottleneck_scores = {}
        
        for therapy, progress in therapy_states.items():
            if therapy not in self.G:
                continue
            
            # Calculate impact score: how many other therapies depend on this one
            descendants = nx.descendants(self.G, therapy)
            therapy_descendants = [d for d in descendants if self.G.nodes[d].get('node_type') == 'therapy']
            
            # Lower progress + more dependents = higher bottleneck score
            impact_factor = len(therapy_descendants) + 1
            bottleneck_score = (100 - progress) * impact_factor
            
            bottleneck_scores[therapy] = {
                'score': bottleneck_score,
                'progress': progress,
                'blocks_therapies': therapy_descendants,
                'impact_factor': impact_factor
            }
        
        return bottleneck_scores
    
    def get_optimal_therapy_sequence(self, therapy_states):
        """
        Find optimal order to complete therapies based on dependencies
        Returns list of therapies in recommended order
        """
        # Create subgraph of only therapy nodes
        therapy_nodes = [n for n in self.G.nodes() if self.G.nodes[n].get('node_type') == 'therapy']
        therapy_subgraph = self.G.subgraph(therapy_nodes)
        
        # Get topological sort (dependency order)
        try:
            topo_order = list(nx.topological_sort(therapy_subgraph))
        except nx.NetworkXError:
            # If cycle exists, use weakly connected components
            topo_order = therapy_nodes
        
        # Score each therapy by: (100 - progress) * dependency_priority
        scored_therapies = []
        for i, therapy in enumerate(topo_order):
            progress = therapy_states.get(therapy, 0)
            dependency_priority = len(topo_order) - i  # Earlier in topo = higher priority
            score = (100 - progress) * dependency_priority
            
            scored_therapies.append({
                'therapy': therapy,
                'score': score,
                'progress': progress,
                'dependency_priority': dependency_priority
            })
        
        # Sort by score (highest first)
        scored_therapies.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_therapies
    
    def get_cross_therapy_insights(self, therapy_states):
        """Find synergies and transfer learning opportunities"""
        insights = []
        
        # Check for synergy edges
        for u, v, data in self.G.edges(data=True):
            if data.get('relationship') == 'synergy':
                u_progress = therapy_states.get(u, 0)
                v_progress = therapy_states.get(v, 0)
                
                # If one therapy is strong and other is weak, suggest leveraging
                if u_progress > 70 and v_progress < 50:
                    insights.append({
                        'type': 'leverage',
                        'strong_therapy': u,
                        'weak_therapy': v,
                        'reason': data.get('reason', ''),
                        'weight': data.get('weight', 0)
                    })
        
        return insights


def get_therapy_metrics(user_id):
    """Fetch all therapy metrics from MongoDB"""
    
    # Get MongoDB collections
    cols = get_collections()
    articulation_progress_col = cols['articulation_progress']
    articulation_trials_col = cols['articulation_trials']
    language_progress_col = cols['language_progress']
    language_trials_col = cols['language_trials']
    fluency_progress_col = cols['fluency_progress']
    fluency_trials_col = cols['fluency_trials']
    
    # Load XGBoost predictors
    try:
        articulation_model = joblib.load('models/articulation_mastery_model.pkl')
        fluency_model = joblib.load('models/fluency_mastery_model.pkl')
        receptive_model = joblib.load('models/language_receptive_model.pkl')
        expressive_model = joblib.load('models/language_expressive_model.pkl')
    except:
        articulation_model = None
        fluency_model = None
        receptive_model = None
        expressive_model = None
    
    metrics = {}
    
    # ARTICULATION METRICS
    artic_progress = articulation_progress_col.find_one({'user_id': user_id})
    artic_trials = list(articulation_trials_col.find({'user_id': user_id}).sort('timestamp', -1).limit(50))
    
    if artic_trials:
        artic_accuracy = np.mean([t.get('scores', {}).get('accuracy_score', 0) for t in artic_trials])
        artic_total_trials = len(list(articulation_trials_col.find({'user_id': user_id})))
        
        # Calculate progress percentage
        if artic_progress:
            total_sounds = len(artic_progress.get('sounds', {}))
            completed_sounds = sum(1 for s in artic_progress.get('sounds', {}).values() 
                                 if s.get('average_score', 0) >= 80)
            artic_progress_pct = (completed_sounds / total_sounds * 100) if total_sounds > 0 else 0
        else:
            artic_progress_pct = (artic_accuracy / 100) * 100
        
        # Predict days to mastery
        if articulation_model and artic_total_trials >= 5:
            try:
                features = np.array([[artic_total_trials, artic_accuracy, 
                                     artic_progress_pct, 0, 0]]).reshape(1, -1)
                predicted_days = int(articulation_model.predict(features)[0])
            except:
                predicted_days = max(30, int((100 - artic_progress_pct) * 1.5))
        else:
            predicted_days = max(30, int((100 - artic_progress_pct) * 1.5))
        
        metrics['articulation'] = {
            'progress': artic_progress_pct,
            'accuracy': artic_accuracy,
            'trial_count': artic_total_trials,
            'predicted_days': predicted_days,
            'recent_trials': len(artic_trials)
        }
    else:
        metrics['articulation'] = {
            'progress': 0,
            'accuracy': 0,
            'trial_count': 0,
            'predicted_days': 120,
            'recent_trials': 0
        }
    
    # FLUENCY METRICS
    fluency_progress = fluency_progress_col.find_one({'user_id': user_id})
    fluency_trials = list(fluency_trials_col.find({'user_id': user_id}).sort('timestamp', -1).limit(50))
    
    if fluency_trials:
        avg_fluency_score = np.mean([t.get('fluency_score', 0) for t in fluency_trials])
        avg_disfluencies = np.mean([t.get('disfluencies', 0) for t in fluency_trials])
        avg_speaking_rate = np.mean([t.get('speaking_rate', 0) for t in fluency_trials])
        fluency_total_trials = len(list(fluency_trials_col.find({'user_id': user_id})))
        
        # Calculate progress
        fluency_progress_pct = (avg_fluency_score / 100) * 100
        
        # Predict days
        if fluency_model and fluency_total_trials >= 3:
            try:
                features = np.array([[fluency_total_trials, avg_fluency_score, 
                                     avg_disfluencies, avg_speaking_rate, 0]]).reshape(1, -1)
                predicted_days = int(fluency_model.predict(features)[0])
            except:
                predicted_days = max(20, int((100 - fluency_progress_pct) * 1.2))
        else:
            predicted_days = max(20, int((100 - fluency_progress_pct) * 1.2))
        
        metrics['fluency'] = {
            'progress': fluency_progress_pct,
            'trial_count': fluency_total_trials,
            'disfluencies': avg_disfluencies,
            'speaking_rate': avg_speaking_rate,
            'predicted_days': predicted_days,
            'confidence': min(0.9, fluency_total_trials / 20)
        }
    else:
        metrics['fluency'] = {
            'progress': 0,
            'trial_count': 0,
            'disfluencies': 0,
            'speaking_rate': 0,
            'predicted_days': 90,
            'confidence': 0
        }
    
    # LANGUAGE RECEPTIVE METRICS
    receptive_progress = language_progress_col.find_one({'user_id': user_id, 'mode': 'receptive'})
    receptive_trials = list(language_trials_col.find({'user_id': user_id, 'mode': 'receptive'}).sort('timestamp', -1).limit(50))
    
    if receptive_progress:
        receptive_accuracy = receptive_progress.get('accuracy', 0)
        receptive_total = len(list(language_trials_col.find({'user_id': user_id, 'mode': 'receptive'})))
        
        # Predict days
        if receptive_model and receptive_total >= 5:
            try:
                features = np.array([[receptive_total, receptive_accuracy, 
                                     receptive_progress.get('completed_exercises', 0), 0, 0]]).reshape(1, -1)
                predicted_days = int(receptive_model.predict(features)[0])
            except:
                predicted_days = max(15, int((100 - receptive_accuracy) * 0.8))
        else:
            predicted_days = max(15, int((100 - receptive_accuracy) * 0.8))
        
        metrics['language_receptive'] = {
            'accuracy': receptive_accuracy,
            'trial_count': receptive_total,
            'progress': receptive_accuracy,  # Use accuracy as progress proxy
            'predicted_days': predicted_days
        }
    else:
        metrics['language_receptive'] = {
            'accuracy': 0,
            'trial_count': 0,
            'progress': 0,
            'predicted_days': 60
        }
    
    # LANGUAGE EXPRESSIVE METRICS
    expressive_progress = language_progress_col.find_one({'user_id': user_id, 'mode': 'expressive'})
    expressive_trials = list(language_trials_col.find({'user_id': user_id, 'mode': 'expressive'}).sort('timestamp', -1).limit(50))
    
    if expressive_progress:
        expressive_accuracy = expressive_progress.get('accuracy', 0)
        expressive_total = len(list(language_trials_col.find({'user_id': user_id, 'mode': 'expressive'})))
        
        # Predict days
        if expressive_model and expressive_total >= 5:
            try:
                features = np.array([[expressive_total, expressive_accuracy, 
                                     expressive_progress.get('completed_exercises', 0), 0, 0]]).reshape(1, -1)
                predicted_days = int(expressive_model.predict(features)[0])
            except:
                predicted_days = max(20, int((100 - expressive_accuracy) * 1.0))
        else:
            predicted_days = max(20, int((100 - expressive_accuracy) * 1.0))
        
        metrics['language_expressive'] = {
            'accuracy': expressive_accuracy,
            'trial_count': expressive_total,
            'progress': expressive_accuracy,
            'predicted_days': predicted_days,
            'receptive_accuracy': metrics['language_receptive']['accuracy']
        }
    else:
        metrics['language_expressive'] = {
            'accuracy': 0,
            'trial_count': 0,
            'progress': 0,
            'predicted_days': 70,
            'receptive_accuracy': metrics['language_receptive']['accuracy']
        }
    
    # Calculate consistency score
    all_trials = artic_trials + fluency_trials + receptive_trials + expressive_trials
    if len(all_trials) > 0:
        timestamps = [t.get('timestamp', datetime.now()) for t in all_trials if 'timestamp' in t]
        if len(timestamps) > 1:
            timestamps.sort()
            gaps = [(timestamps[i+1] - timestamps[i]).days for i in range(len(timestamps)-1)]
            avg_gap = np.mean(gaps) if gaps else 7
            consistency_score = max(0, min(1, 1 - (avg_gap / 7)))  # 1 = daily, 0 = weekly+
        else:
            consistency_score = 0.3
    else:
        consistency_score = 0
    
    metrics['consistency_score'] = consistency_score
    
    # Count active therapies
    active_count = sum(1 for m in metrics.values() 
                      if isinstance(m, dict) and m.get('trial_count', 0) > 0)
    metrics['active_therapies'] = active_count
    
    # Check if all below 50%
    all_below = all(m.get('progress', 0) < 50 for k, m in metrics.items() 
                   if isinstance(m, dict) and 'progress' in m)
    metrics['all_below_threshold'] = all_below
    
    return metrics


def generate_therapy_prioritization(user_id):
    """Main function to generate therapy prioritization and sequencing"""
    
    # Get metrics
    metrics = get_therapy_metrics(user_id)
    
    # Initialize decision rules engine
    engine = TherapyPrioritizationEngine()
    engine.reset()
    
    # Declare facts for each therapy
    for therapy_key, therapy_metrics in metrics.items():
        if isinstance(therapy_metrics, dict) and 'progress' in therapy_metrics:
            fact = TherapyData(**{**therapy_metrics, 'therapy': therapy_key})
            engine.declare(fact)
    
    # Declare global facts
    engine.declare(TherapyData(
        consistency_score=metrics['consistency_score'],
        active_therapies=metrics['active_therapies'],
        all_below_threshold=metrics['all_below_threshold']
    ))
    
    # Run decision rules
    engine.run()
    
    # Normalize weights if priorities exist
    if engine.priorities:
        total_weight = sum(p['weight'] for p in engine.priorities)
        if total_weight > 0:
            for p in engine.priorities:
                p['weight'] = round(p['weight'] / total_weight * 100, 1)
    
    # Initialize graph-based recommender
    graph = TherapyGraph()
    
    # Get therapy states for graph
    therapy_states = {
        'articulation': metrics['articulation']['progress'],
        'fluency': metrics['fluency']['progress'],
        'language_receptive': metrics['language_receptive']['progress'],
        'language_expressive': metrics['language_expressive']['progress']
    }
    
    # Get bottleneck analysis
    bottlenecks = graph.get_therapy_bottleneck(therapy_states)
    
    # Get optimal sequence
    optimal_sequence = graph.get_optimal_therapy_sequence(therapy_states)
    
    # Get cross-therapy insights
    cross_insights = graph.get_cross_therapy_insights(therapy_states)
    
    # Generate weekly schedule
    weekly_schedule = generate_weekly_schedule(engine.priorities, metrics)
    
    return {
        'priorities': sorted(engine.priorities, key=lambda x: x['weight'], reverse=True),
        'recommendations': list(set(engine.recommendations)),  # Remove duplicates
        'insights': list(set(engine.insights)),
        'bottleneck_analysis': bottlenecks,
        'optimal_sequence': optimal_sequence[:4],  # Top 4
        'cross_therapy_insights': cross_insights,
        'weekly_schedule': weekly_schedule,
        'metrics': metrics,
        'generated_at': datetime.now().isoformat()
    }


def generate_weekly_schedule(priorities, metrics):
    """Generate a 7-day practice schedule based on priorities"""
    
    if not priorities:
        return []
    
    # Sort by weight
    sorted_priorities = sorted(priorities, key=lambda x: x['weight'], reverse=True)
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    schedule = []
    
    for day in days:
        day_exercises = []
        
        for priority in sorted_priorities:
            therapy = priority['therapy']
            weight = priority['weight']
            priority_level = priority['priority']
            
            # Skip completed therapies
            if priority_level == 'COMPLETE':
                # Add 1 maintenance trial per week (only on Monday)
                if day == 'Monday':
                    day_exercises.append({
                        'therapy': therapy.replace('_', ' ').title(),
                        'trials': 1,
                        'focus': 'Maintenance',
                        'priority': 'LOW'
                    })
                continue
            
            # Calculate trials based on weight and priority
            if priority_level == 'HIGH':
                base_trials = 3
            elif priority_level == 'MEDIUM':
                base_trials = 2
            else:
                base_trials = 1
            
            # Adjust based on day (more on weekdays, lighter on weekends)
            if day in ['Saturday', 'Sunday']:
                trials = max(1, base_trials - 1)
            else:
                trials = base_trials
            
            # Get specific focus based on therapy and metrics
            focus = get_therapy_focus(therapy, metrics)
            
            day_exercises.append({
                'therapy': therapy.replace('_', ' ').title(),
                'trials': trials,
                'focus': focus,
                'priority': priority_level
            })
        
        schedule.append({
            'day': day,
            'exercises': day_exercises,
            'total_trials': sum(e['trials'] for e in day_exercises)
        })
    
    return schedule


def get_therapy_focus(therapy, metrics):
    """Determine specific focus area for each therapy"""
    
    if therapy == 'articulation':
        accuracy = metrics['articulation']['accuracy']
        if accuracy < 60:
            return 'Focus on basic sound production'
        elif accuracy < 80:
            return 'Practice problematic sounds (R, L, TH)'
        else:
            return 'Advanced articulation patterns'
    
    elif therapy == 'fluency':
        disfluencies = metrics['fluency']['disfluencies']
        if disfluencies > 5:
            return 'Breathing control exercises'
        elif disfluencies > 2:
            return 'Slow speech practice'
        else:
            return 'Natural fluency at normal rate'
    
    elif therapy == 'language_receptive':
        accuracy = metrics['language_receptive']['accuracy']
        if accuracy < 70:
            return 'Basic comprehension exercises'
        elif accuracy < 90:
            return 'Complex sentence understanding'
        else:
            return 'Advanced comprehension'
    
    elif therapy == 'language_expressive':
        accuracy = metrics['language_expressive']['accuracy']
        if accuracy < 60:
            return 'Simple sentence formation'
        elif accuracy < 85:
            return 'Complex expression practice'
        else:
            return 'Advanced conversation skills'
    
    return 'General practice'


if __name__ == '__main__':
    # Test with a user ID
    test_user_id = 'test_user'
    result = generate_therapy_prioritization(test_user_id)
    
    print("=== THERAPY PRIORITIZATION RESULTS ===")
    print("\nPriorities:")
    for p in result['priorities']:
        print(f"  {p['therapy']}: {p['priority']} ({p['weight']}%)")
    
    print("\nRecommendations:")
    for r in result['recommendations']:
        print(f"  - {r}")
    
    print("\nInsights:")
    for i in result['insights']:
        print(f"  💡 {i}")
