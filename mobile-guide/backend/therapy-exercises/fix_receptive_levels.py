"""
Migration script to add level_name and level_color to existing receptive exercises
Run this once to fix existing database entries
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/CVACare')
client = MongoClient(MONGODB_URI)
db = client.get_database()
receptive_exercises_collection = db['receptive_exercises']

# Level metadata
level_metadata = {
    1: {'name': 'Vocabulary', 'color': '#e8b04e'},
    2: {'name': 'Directions', 'color': '#479ac3'},
    3: {'name': 'Comprehension', 'color': '#3b82f6'}
}

def migrate_receptive_exercises():
    """Add level_name and level_color to all receptive exercises"""
    print("🔄 Starting migration...")
    
    # Find all exercises
    exercises = receptive_exercises_collection.find()
    count = 0
    
    for exercise in exercises:
        level = exercise.get('level')
        
        # Skip if already has level_name
        if 'level_name' in exercise and 'level_color' in exercise:
            print(f"  ⏭️  Skipping {exercise.get('exercise_id')} - already has metadata")
            continue
        
        # Get metadata for this level
        metadata = level_metadata.get(level, {'name': 'Unknown Level', 'color': '#999999'})
        
        # Update the exercise
        receptive_exercises_collection.update_one(
            {'_id': exercise['_id']},
            {'$set': {
                'level_name': metadata['name'],
                'level_color': metadata['color']
            }}
        )
        
        print(f"  ✅ Updated {exercise.get('exercise_id')} - Level {level}: {metadata['name']}")
        count += 1
    
    print(f"\n✨ Migration complete! Updated {count} exercises.")

if __name__ == '__main__':
    try:
        migrate_receptive_exercises()
    except Exception as e:
        print(f"❌ Error: {e}")
