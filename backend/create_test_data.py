"""
Quick Test Data Generator for Diagnostic Comparison Feature
Creates a patient account with at-home data and facility diagnostic
"""
import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables (for MongoDB connection)
load_dotenv()

BASE_URL = "http://localhost:5000"

# Fixed credentials for easy frontend login
PATIENT_EMAIL = "testpatient@cvaped.com"
PATIENT_PASSWORD = "password"

def get_mongo_db():
    """Get MongoDB connection using the same URI as the backend app"""
    from pymongo import MongoClient
    MONGO_URI = os.getenv('MONGO_URI')
    if not MONGO_URI:
        print("  ✗ MONGO_URI not found in .env - cannot insert data directly")
        return None
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        # Test the connection
        client.admin.command('ping')
        db = client['CVACare']
        print(f"  ✓ Connected to MongoDB Atlas")
        return db
    except Exception as e:
        print(f"  ✗ MongoDB connection failed: {str(e)[:100]}")
        return None

def create_patient_account():
    """Create a test patient account"""
    print("\n📝 Creating patient account...")
    
    data = {
        "email": PATIENT_EMAIL,
        "password": PATIENT_PASSWORD,
        "firstName": "Test",
        "lastName": "Patient",
        "age": 28,
        "gender": "prefer-not-to-say",
        "therapyType": "speech",
        "patientType": "myself"
    }
    
    response = requests.post(f"{BASE_URL}/api/register", json=data)
    if response.status_code == 201:
        print(f"✓ Patient created: {PATIENT_EMAIL}")
        return True
    elif response.status_code in [400, 409]:
        # User already exists
        print(f"ℹ Patient already exists: {PATIENT_EMAIL}")
        return True
    else:
        print(f"✗ Failed to create patient: {response.status_code} - {response.text}")
        return False

def login_patient():
    """Login and get token"""
    print("\n🔐 Logging in...")
    
    response = requests.post(f"{BASE_URL}/api/login", json={
        "email": PATIENT_EMAIL,
        "password": PATIENT_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        patient_id = data.get('user', {}).get('id')
        print(f"✓ Login successful")
        print(f"  Patient ID: {patient_id}")
        return token, patient_id
    else:
        print(f"✗ Login failed: {response.status_code}")
        return None, None

def set_diagnostic_status(token, patient_id):
    """Enable diagnostic comparison for patient"""
    print("\n⚙️ Enabling diagnostic comparison...")
    
    # Set it via API
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(
        f"{BASE_URL}/api/user/diagnostic-status",
        headers=headers,
        json={
            "hasDiagnosticComparison": True,
            "hasInitialDiagnostic": True
        }
    )
    
    if response.status_code == 200:
        print("✓ Diagnostic comparison enabled via API")
    else:
        print(f"⚠ API status update returned {response.status_code} (setting directly via DB)")
    
    # Also ensure it's set directly in DB (in case API has issues)
    db = get_mongo_db()
    if db is not None:
        from bson import ObjectId
        db.users.update_one(
            {'_id': ObjectId(patient_id)},
            {'$set': {
                'hasDiagnosticComparison': True,
                'hasInitialDiagnostic': True
            }}
        )
        print("✓ Diagnostic flags set directly in database")
    return True

def create_at_home_data(token, patient_id):
    """Create simulated at-home exercise data via direct MongoDB insert"""
    print("\n🏠 Creating at-home exercise data...")
    
    db = get_mongo_db()
    if db is None:
        print("  ✗ Cannot create at-home data without MongoDB connection")
        return False
    
    # Articulation Progress (5 sounds)
    articulation_sounds = {
        'r': 0.85,
        's': 0.70, 
        'l': 0.90,
        'th': 0.60,
        'k': 0.75
    }
    
    # Clear old test data for this patient first
    db.articulation_progress.delete_many({'user_id': patient_id})
    db.fluency_progress.delete_many({'user_id': patient_id})
    db.language_progress.delete_many({'user_id': patient_id})
    print("  ✓ Cleared old at-home progress data")
    
    # Insert articulation progress
    for sound, mastery in articulation_sounds.items():
        db.articulation_progress.insert_one({
            'user_id': patient_id,
            'sound_id': sound,
            'overall_mastery': mastery,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        })
        print(f"  ✓ Articulation /{sound}/ - {mastery * 100}% mastery")
    
    # Insert fluency progress
    db.fluency_progress.insert_one({
        'user_id': patient_id,
        'overall_mastery': 0.65,
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    })
    print(f"  ✓ Fluency - 65% mastery")
    
    # Insert receptive language
    db.language_progress.insert_one({
        'user_id': patient_id,
        'mode': 'receptive',
        'accuracy': 0.80,
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    })
    print(f"  ✓ Receptive Language - 80% accuracy")
    
    # Insert expressive language
    db.language_progress.insert_one({
        'user_id': patient_id,
        'mode': 'expressive',
        'accuracy': 0.72,
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    })
    print(f"  ✓ Expressive Language - 72% accuracy")
    
    # ----- Insert therapy trial records (for Recent Activities) -----
    print("\n📊 Creating trial records for Recent Activities...")
    
    # Clear old trial data for this patient
    db.articulation_trials.delete_many({'user_id': patient_id})
    db.language_trials.delete_many({'user_id': patient_id})
    db.fluency_trials.delete_many({'user_id': patient_id})
    print("  ✓ Cleared old trial data")
    
    # Articulation trials (various sounds over the past week)
    articulation_trial_data = [
        {'sound_id': 'r',  'accuracy': 0.85, 'days_ago': 0},
        {'sound_id': 's',  'accuracy': 0.70, 'days_ago': 1},
        {'sound_id': 'l',  'accuracy': 0.90, 'days_ago': 1},
        {'sound_id': 'th', 'accuracy': 0.60, 'days_ago': 2},
        {'sound_id': 'k',  'accuracy': 0.75, 'days_ago': 3},
        {'sound_id': 'r',  'accuracy': 0.80, 'days_ago': 4},
        {'sound_id': 's',  'accuracy': 0.65, 'days_ago': 5},
    ]
    
    for trial in articulation_trial_data:
        db.articulation_trials.insert_one({
            'user_id': patient_id,
            'sound_id': trial['sound_id'],
            'accuracy': trial['accuracy'],
            'timestamp': datetime.now() - timedelta(days=trial['days_ago'], hours=trial['days_ago']),
            'word_position': 'initial',
            'attempts': 10,
            'correct': int(trial['accuracy'] * 10)
        })
    print(f"  ✓ Inserted {len(articulation_trial_data)} articulation trials")
    
    # Language trials
    language_trial_data = [
        {'level': 1, 'accuracy': 0.80, 'days_ago': 0},
        {'level': 2, 'accuracy': 0.72, 'days_ago': 2},
        {'level': 1, 'accuracy': 0.75, 'days_ago': 4},
    ]
    
    for trial in language_trial_data:
        db.language_trials.insert_one({
            'user_id': patient_id,
            'level': trial['level'],
            'accuracy': trial['accuracy'],
            'timestamp': datetime.now() - timedelta(days=trial['days_ago'], hours=trial['days_ago'] + 2),
            'mode': 'receptive',
            'correct_answers': int(trial['accuracy'] * 10),
            'total_questions': 10
        })
    print(f"  ✓ Inserted {len(language_trial_data)} language trials")
    
    # Fluency trials
    fluency_trial_data = [
        {'level': 1, 'accuracy': 0.65, 'days_ago': 1},
        {'level': 2, 'accuracy': 0.55, 'days_ago': 3},
    ]
    
    for trial in fluency_trial_data:
        db.fluency_trials.insert_one({
            'user_id': patient_id,
            'level': trial['level'],
            'accuracy': trial['accuracy'],
            'timestamp': datetime.now() - timedelta(days=trial['days_ago'], hours=trial['days_ago'] + 4),
            'duration_seconds': 120,
            'words_per_minute': 85
        })
    print(f"  ✓ Inserted {len(fluency_trial_data)} fluency trials")
    
    return True

def create_therapist_account():
    """Create a therapist account"""
    print("\n👨‍⚕️ Creating therapist account...")
    
    therapist_email = "testtherapist@cvaped.com"
    therapist_password = "password"
    
    data = {
        "email": therapist_email,
        "password": therapist_password,
        "firstName": "Dr. Jane",
        "lastName": "Therapist",
        "age": 35,
        "gender": "female",
        "therapyType": "speech",
        "patientType": "myself"
    }
    
    response = requests.post(f"{BASE_URL}/api/register", json=data)
    if response.status_code == 201:
        print(f"✓ Therapist created: {therapist_email}")
    elif response.status_code in [400, 409]:
        print(f"ℹ Therapist already exists: {therapist_email}")
    else:
        print(f"⚠ Therapist registration: {response.status_code}")
    
    # Try to update role to therapist using MongoDB
    try:
        db = get_mongo_db()
        if db is not None:
            result = db.users.update_one(
                {'email': therapist_email},
                {'$set': {'role': 'therapist'}}
            )
            if result.modified_count > 0:
                print("  ✓ Role updated to 'therapist' in database")
            elif result.matched_count > 0:
                print("  ✓ Role already set to 'therapist' in database")
            else:
                print("  ⚠ MongoDB update: User not found")
        else:
            print("  ⚠ Could not connect to MongoDB to update role")
    except Exception as e:
        print(f"  ⚠ Error updating role: {str(e)[:100]}...")
    
    # Login as therapist (this will get a fresh token with updated role)
    response = requests.post(f"{BASE_URL}/api/login", json={
        "email": therapist_email,
        "password": therapist_password
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        print(f"✓ Therapist login successful (token with current role)")
        return token, therapist_email
    else:
        print(f"✗ Therapist login failed: {response.status_code}")
        return None, therapist_email

def create_facility_diagnostic(therapist_token, patient_id):
    """Create facility diagnostic data (cleans up old test diagnostics first)"""
    print("\n🏥 Creating facility diagnostic...")
    
    # Clean up old duplicate diagnostics for this patient
    db = get_mongo_db()
    if db is not None:
        old_count = db.facility_diagnostics.count_documents({'user_id': patient_id})
        if old_count > 0:
            db.facility_diagnostics.delete_many({'user_id': patient_id})
            print(f"  ✓ Cleaned up {old_count} old diagnostic(s) for this patient")
    
    headers = {"Authorization": f"Bearer {therapist_token}"}
    
    diagnostic_data = {
        "user_id": patient_id,
        "assessment_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
        "assessment_type": "initial",
        "severity_level": "moderate",
        "assessor_name": "Dr. Jane Therapist",
        "articulation_scores": {
            "r": 30,
            "s": 45,
            "l": 60,
            "th": 50,
            "k": 70
        },
        "fluency_score": 40,
        "receptive_score": 55,
        "expressive_score": 35,
        "gait_scores": {
            "stability": 42,
            "symmetry": 50,
            "regularity": 45,
            "overall": 46
        },
        "notes": "Initial facility assessment - Patient shows moderate delays across articulation and language domains. Good progress potential with consistent therapy."
    }
    
    response = requests.post(
        f"{BASE_URL}/api/therapist/diagnostics",
        headers=headers,
        json=diagnostic_data
    )
    
    if response.status_code in [200, 201]:
        result = response.json()
        # Try multiple possible field names for the ID
        diagnostic_id = (result.get('diagnosticId') or 
                        result.get('diagnostic_id') or 
                        result.get('id') or
                        result.get('_id'))
        print(f"✓ Facility diagnostic created")
        print(f"  Assessment Date: {diagnostic_data['assessment_date']}")
        print(f"  Severity: {diagnostic_data['severity_level']}")
        if diagnostic_id:
            print(f"  Diagnostic ID: {diagnostic_id}")
        else:
            print(f"  ✓ Diagnostic saved successfully")
        return diagnostic_id
    else:
        print(f"✗ Failed to create diagnostic: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def main():
    print("\n" + "="*70)
    print("  CVAPed - Quick Test Data Setup for Diagnostic Comparison")
    print("="*70)
    
    # Check server
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print("✓ Backend server is running")
    except:
        print("✗ Backend server is not running!")
        print("  Please start the backend server first: python app.py")
        return
    
    # Verify MongoDB connection
    db = get_mongo_db()
    if db is None:
        print("✗ Cannot connect to MongoDB - check your .env MONGO_URI")
        return
    
    # Clean up orphan diagnostics from old test runs
    from bson import ObjectId
    all_diags = list(db.facility_diagnostics.find())
    orphan_ids = []
    for diag in all_diags:
        uid = diag.get('user_id')
        if uid:
            try:
                user_exists = db.users.find_one({'_id': ObjectId(uid)})
            except:
                user_exists = None
            if not user_exists:
                orphan_ids.append(diag['_id'])
    if orphan_ids:
        db.facility_diagnostics.delete_many({'_id': {'$in': orphan_ids}})
        print(f"🧹 Cleaned up {len(orphan_ids)} orphan diagnostic(s) from old test runs")
    
    # Create patient and login
    if not create_patient_account():
        return
    
    patient_token, patient_id = login_patient()
    if not patient_token:
        return
    
    # Enable diagnostic comparison
    set_diagnostic_status(patient_token, patient_id)
    
    # Create at-home data
    create_at_home_data(patient_token, patient_id)
    
    # Create therapist and facility diagnostic
    therapist_token, therapist_email = create_therapist_account()
    
    if therapist_token:
        diagnostic_id = create_facility_diagnostic(therapist_token, patient_id)
    
    # Verify data
    print("\n🔍 Verifying data...")
    verify_db = get_mongo_db()
    if verify_db is not None:
        art_count = verify_db.articulation_progress.count_documents({'user_id': patient_id})
        flu = verify_db.fluency_progress.find_one({'user_id': patient_id})
        rec = verify_db.language_progress.find_one({'user_id': patient_id, 'mode': 'receptive'})
        exp = verify_db.language_progress.find_one({'user_id': patient_id, 'mode': 'expressive'})
        diag_count = verify_db.facility_diagnostics.count_documents({'user_id': patient_id})
        
        # Trial record counts
        art_trials = verify_db.articulation_trials.count_documents({'user_id': patient_id})
        lang_trials = verify_db.language_trials.count_documents({'user_id': patient_id})
        flu_trials = verify_db.fluency_trials.count_documents({'user_id': patient_id})
        
        print(f"  Articulation records: {art_count} {'✓' if art_count >= 5 else '✗'}")
        print(f"  Fluency record: {'✓' if flu and flu.get('overall_mastery') else '✗'}")
        print(f"  Receptive record: {'✓' if rec and rec.get('accuracy') else '✗'}")
        print(f"  Expressive record: {'✓' if exp and exp.get('accuracy') else '✗'}")
        print(f"  Facility diagnostics: {diag_count} {'✓' if diag_count >= 1 else '✗'}")
        print(f"  Articulation trials: {art_trials} {'✓' if art_trials >= 1 else '✗'}")
        print(f"  Language trials: {lang_trials} {'✓' if lang_trials >= 1 else '✗'}")
        print(f"  Fluency trials: {flu_trials} {'✓' if flu_trials >= 1 else '✗'}")
    
    # Print summary
    print("\n" + "="*70)
    print("  ✅ TEST DATA SETUP COMPLETE!")
    print("="*70)
    print("\n📋 LOGIN CREDENTIALS FOR FRONTEND:\n")
    print("  🧑 PATIENT LOGIN:")
    print(f"     Email:    {PATIENT_EMAIL}")
    print(f"     Password: {PATIENT_PASSWORD}")
    print("\n  👨‍⚕️ THERAPIST LOGIN:")
    print(f"     Email:    {therapist_email}")
    print(f"     Password: password")
    print(f"\n  📌 Patient ID: {patient_id}")
    print(f"     Patient Name: Test Patient")
    print("\n" + "="*70)
    print("\n💡 NEXT STEPS:")
    print("  1. Open the frontend in your browser")
    print("  2. Login with PATIENT credentials → go to Health Logs to see comparison")
    print("  3. Login with THERAPIST credentials → search 'Test Patient' in Diagnostic Comparison")
    print("  4. Both views should show facility vs. at-home data with comparisons!")
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    main()
