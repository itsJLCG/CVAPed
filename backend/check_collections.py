"""Check current state of language collections"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['CVACare']

print("=" * 60)
print("LANGUAGE COLLECTIONS STATUS")
print("=" * 60)

# Check language_exercises
lang_docs = list(db['language_exercises'].find({}, {'exercise_id': 1, 'type': 1, 'mode': 1, 'level': 1, '_id': 0}).limit(5))
print(f"\n📁 language_exercises collection: {db['language_exercises'].count_documents({})} documents")
if lang_docs:
    print("   Sample documents:")
    for doc in lang_docs:
        print(f"   - {doc}")

# Check receptive_exercises
recep_docs = list(db['receptive_exercises'].find({}, {'exercise_id': 1, 'type': 1, 'level': 1, '_id': 0}).limit(5))
print(f"\n📁 receptive_exercises collection: {db['receptive_exercises'].count_documents({})} documents")
if recep_docs:
    print("   Sample documents:")
    for doc in recep_docs:
        print(f"   - {doc}")

print("=" * 60)
