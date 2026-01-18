"""
Script to update ALL test users with first name and last name
"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['CVACare']
users_collection = db['users']

print("🔍 Finding all test users...")
print("="*60)

# Find all users with email containing "testuser" or missing firstName/lastName
test_users = users_collection.find({
    '$or': [
        {'email': {'$regex': 'testuser', '$options': 'i'}},
        {'firstName': {'$exists': False}},
        {'lastName': {'$exists': False}},
        {'firstName': ''},
        {'lastName': ''}
    ]
})

updated_count = 0

for user in test_users:
    email = user.get('email', '')
    current_first = user.get('firstName', '')
    current_last = user.get('lastName', '')
    
    # Skip if already has names
    if current_first and current_last:
        print(f"⏭️  Skipped {email} (already has name: {current_first} {current_last})")
        continue
    
    # Generate name from email
    if 'testuser' in email.lower():
        # Extract number from email like testuser7@cvacare.com
        match = re.search(r'testuser(\d+)', email.lower())
        if match:
            number = match.group(1)
            first_name = 'Test User'
            last_name = f'#{number}'
        else:
            first_name = 'Test'
            last_name = 'User'
    else:
        # For other users without names
        username = email.split('@')[0]
        first_name = username.capitalize()
        last_name = 'Patient'
    
    # Update user
    result = users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {
            'firstName': first_name,
            'lastName': last_name
        }}
    )
    
    if result.modified_count > 0:
        print(f"✅ Updated {email}")
        print(f"   → {first_name} {last_name}")
        updated_count += 1
    else:
        print(f"⚠️  No changes for {email}")

print("="*60)
print(f"\n✅ Updated {updated_count} user(s)")

client.close()
