"""
Move receptive-like documents out of language_exercises into receptive_exercises.

Run from the backend folder:
> python migrate_receptive_from_language.py

It will:
 - create a backup collection language_exercises_backup
 - move matching documents to receptive_exercises
 - remove moved docs from language_exercises
 - print summary
"""

import os
import sys
from pymongo import MongoClient
import datetime
from copy import deepcopy

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    print("ERROR: Please set MONGO_URI environment variable (or add it to a .env file).")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client['CVACare']
lang_col = db['language_exercises']
receptive_col = db['receptive_exercises']

def looks_like_receptive(doc):
    """Determine if a document looks like a receptive exercise"""
    # 1) Explicit mode flag
    if doc.get('mode') == 'receptive':
        return True

    # 2) Common receptive types
    if doc.get('type') in ('vocabulary', 'directions', 'comprehension'):
        return True

    # 3) Exercise id patterns used in older hardcoded data
    eid = doc.get('exercise_id', '') or doc.get('id', '')
    if isinstance(eid, str) and (
        eid.startswith('vocab') or 
        eid.startswith('dir') or 
        eid.startswith('comp') or 
        'comprehension' in eid.lower()
    ):
        return True

    # 4) Presence of receptive-specific fields (options array with target/instruction)
    if 'options' in doc and isinstance(doc.get('options'), list) and len(doc.get('options', [])) > 0:
        if 'target' in doc or ('instruction' in doc and 'select' in doc.get('instruction', '').lower()):
            return True

    return False

def transform_to_receptive(doc):
    """Transform a document to receptive schema"""
    new = {}
    new['exercise_id'] = doc.get('exercise_id') or doc.get('id') or str(doc.get('_id'))
    new['type'] = doc.get('type') or 'vocabulary'
    new['level'] = doc.get('level') or 1
    new['instruction'] = doc.get('instruction') or doc.get('prompt') or ''
    new['target'] = doc.get('target') or ''
    new['options'] = doc.get('options') or []
    new['order'] = doc.get('order', 0)
    new['is_active'] = doc.get('is_active', False)
    new['created_at'] = doc.get('created_at') or datetime.datetime.utcnow()
    new['updated_at'] = datetime.datetime.utcnow()
    # preserve the original document id for traceability
    new['_migrated_from'] = str(doc.get('_id'))
    return new

def backup_collection():
    """Create a backup of language_exercises collection"""
    backup_name = 'language_exercises_backup'
    if backup_name in db.list_collection_names():
        print(f"ℹ️  Backup collection '{backup_name}' already exists. Skipping backup creation.")
        return
    
    print("📦 Creating backup collection 'language_exercises_backup'...")
    docs = list(lang_col.find({}))
    if not docs:
        print("⚠️  language_exercises is empty — backup will be empty as well.")
    else:
        db[backup_name].insert_many(deepcopy(docs))
        print(f"✅ Backup created with {len(docs)} documents.")

def migrate():
    """Migrate receptive documents from language_exercises to receptive_exercises"""
    docs = list(lang_col.find({}))
    if not docs:
        print("ℹ️  No documents found in language_exercises — nothing to migrate.")
        return

    to_move = [d for d in docs if looks_like_receptive(d)]
    keep = [d for d in docs if not looks_like_receptive(d)]

    print(f"\n📊 Migration Analysis:")
    print(f"   Total documents in language_exercises: {len(docs)}")
    print(f"   Identified as RECEPTIVE (will move): {len(to_move)}")
    print(f"   Identified as EXPRESSIVE (will keep): {len(keep)}")
    
    if len(to_move) == 0:
        print("✅ No receptive documents found to migrate. Collection is clean!")
        return

    print(f"\n🔍 Sample of documents to move:")
    for i, doc in enumerate(to_move[:3]):
        print(f"   {i+1}. ID: {doc.get('exercise_id', 'N/A')}, Type: {doc.get('type', 'N/A')}, Target: {doc.get('target', 'N/A')}")
    if len(to_move) > 3:
        print(f"   ... and {len(to_move) - 3} more")

    # Auto-confirm (since user said "just do it")
    print(f"\n🚀 Proceeding with migration...")

    moved = 0
    for doc in to_move:
        new_doc = transform_to_receptive(doc)
        # insert into receptive collection
        receptive_col.insert_one(new_doc)
        # remove original
        lang_col.delete_one({'_id': doc['_id']})
        moved += 1

    print(f"\n✅ Migration complete!")
    print(f"   ✓ Moved {moved} documents to 'receptive_exercises'")
    print(f"   ✓ Removed {moved} documents from 'language_exercises'")
    print(f"   ✓ Kept {len(keep)} expressive documents in 'language_exercises'")
    print(f"\n📝 Next steps:")
    print(f"   1. Restart your backend server (Ctrl+C then 'python app.py')")
    print(f"   2. In TherapistDashboard → Language → Receptive, click Load/Refresh")
    print(f"   3. Toggle 'is_active' checkboxes for exercises you want patients to see")

if __name__ == '__main__':
    print("=" * 60)
    print("  RECEPTIVE EXERCISE MIGRATION TOOL")
    print("=" * 60)
    backup_collection()
    migrate()
    print("=" * 60)
