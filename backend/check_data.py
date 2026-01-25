from pymongo import MongoClient
import datetime

client = MongoClient('mongodb://localhost:27017/')
db = client['CVACare']

now = datetime.datetime.utcnow()
thirty_days_ago = now - datetime.timedelta(days=30)

print('=== Last 30 Days Data Analysis ===\n')

# Count trials
art_trials = db.articulation_trials.count_documents({'timestamp': {'$gte': thirty_days_ago}})
lang_trials = db.language_trials.count_documents({'timestamp': {'$gte': thirty_days_ago}})
flu_trials = db.fluency_trials.count_documents({'timestamp': {'$gte': thirty_days_ago}})

print(f'Total Trials:')
print(f'  Articulation: {art_trials}')
print(f'  Language: {lang_trials}')
print(f'  Fluency: {flu_trials}')
print(f'  TOTAL: {art_trials + lang_trials + flu_trials}\n')

# Count unique users
art_users = db.articulation_trials.distinct('user_id', {'timestamp': {'$gte': thirty_days_ago}})
lang_users = db.language_trials.distinct('user_id', {'timestamp': {'$gte': thirty_days_ago}})
flu_users = db.fluency_trials.distinct('user_id', {'timestamp': {'$gte': thirty_days_ago}})

print(f'Unique Users:')
print(f'  Articulation: {len(art_users)} users')
print(f'  Language: {len(lang_users)} users')
print(f'  Fluency: {len(flu_users)} users\n')

# Count sessions (user + date combinations per therapy type)
art_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {'_id': {'user_id': '$user_id', 'date': '$date'}}},
    {'$count': 'total'}
]
art_sessions = list(db.articulation_trials.aggregate(art_pipeline))
art_session_count = art_sessions[0]['total'] if art_sessions else 0

lang_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {'_id': {'user_id': '$user_id', 'date': '$date'}}},
    {'$count': 'total'}
]
lang_sessions = list(db.language_trials.aggregate(lang_pipeline))
lang_session_count = lang_sessions[0]['total'] if lang_sessions else 0

flu_pipeline = [
    {'$match': {'timestamp': {'$gte': thirty_days_ago}}},
    {'$addFields': {'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}}},
    {'$group': {'_id': {'user_id': '$user_id', 'date': '$date'}}},
    {'$count': 'total'}
]
flu_sessions = list(db.fluency_trials.aggregate(flu_pipeline))
flu_session_count = flu_sessions[0]['total'] if flu_sessions else 0

print(f'Sessions (user+date per therapy type):')
print(f'  Articulation: {art_session_count} sessions')
print(f'  Language: {lang_session_count} sessions')
print(f'  Fluency: {flu_session_count} sessions')
print(f'  TOTAL: {art_session_count + lang_session_count + flu_session_count} sessions\n')

# Show sample of recent data
print('Sample recent trials (first 5):')
recent_art = list(db.articulation_trials.find({'timestamp': {'$gte': thirty_days_ago}}).sort('timestamp', -1).limit(5))
for trial in recent_art:
    print(f"  User: {trial.get('user_id', 'N/A')} | Date: {trial.get('timestamp', 'N/A')} | Type: Articulation")
