from pymongo import MongoClient
import datetime
from collections import defaultdict

client = MongoClient('mongodb://localhost:27017/')
db = client['CVACare']

now = datetime.datetime.utcnow()
thirty_days_ago = now - datetime.timedelta(days=30)

print("=== Session Analysis (Last 30 Days) ===\n")

# Analyze articulation sessions
art_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {
        '_id': {'user_id': '$user_id', 'date': '$date'},
        'trial_count': {'$sum': 1}
    }},
    {'$sort': {'trial_count': -1}}
]

art_sessions = list(db.articulation_trials.aggregate(art_pipeline))

print(f"ARTICULATION SESSIONS: {len(art_sessions)}")
print("Breakdown by user:")

user_session_counts = defaultdict(int)
user_trial_counts = defaultdict(int)

for session in art_sessions:
    user_id = session['_id']['user_id']
    user_session_counts[user_id] += 1
    user_trial_counts[user_id] += session['trial_count']

for user_id, session_count in sorted(user_session_counts.items(), key=lambda x: x[1], reverse=True):
    trial_count = user_trial_counts[user_id]
    print(f"  User {user_id}: {session_count} sessions, {trial_count} trials ({trial_count/session_count:.1f} trials/session)")

print(f"\nTop 10 heaviest sessions (most trials in one day):")
for i, session in enumerate(art_sessions[:10], 1):
    print(f"  {i}. User {session['_id']['user_id']} on {session['_id']['date']}: {session['trial_count']} trials")

# Language sessions
lang_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {
        '_id': {'user_id': '$user_id', 'date': '$date'},
        'trial_count': {'$sum': 1}
    }}
]

lang_sessions = list(db.language_trials.aggregate(lang_pipeline))
print(f"\nLANGUAGE SESSIONS: {len(lang_sessions)}")

# Fluency sessions
flu_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {
        '_id': {'user_id': '$user_id', 'date': '$date'},
        'trial_count': {'$sum': 1}
    }}
]

flu_sessions = list(db.fluency_trials.aggregate(flu_pipeline))
print(f"FLUENCY SESSIONS: {len(flu_sessions)}")

print(f"\n{'='*50}")
print(f"TOTAL SESSIONS: {len(art_sessions) + len(lang_sessions) + len(flu_sessions)}")
print(f"{'='*50}")
