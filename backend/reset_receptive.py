"""
Quick script to delete all receptive exercises so you can re-seed with is_active=True defaults
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['CVACare']
receptive_col = db['receptive_exercises']

print("=" * 60)
print("RESET RECEPTIVE EXERCISES")
print("=" * 60)

count = receptive_col.count_documents({})
print(f"\nFound {count} receptive exercises in database")

if count > 0:
    receptive_col.delete_many({})
    print(f"✅ Deleted all {count} receptive exercises")
    print("\n📝 Next steps:")
    print("   1. Restart backend server (Ctrl+C then 'python app.py')")
    print("   2. Login as therapist")
    print("   3. Go to Language → Receptive")
    print("   4. Click 'Seed Default Exercises'")
    print("   5. All 15 exercises will be is_active=True by default!")
else:
    print("ℹ️  No receptive exercises found - collection is already empty")
    print("   Just seed default exercises in the therapist dashboard!")

print("=" * 60)
