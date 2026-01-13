"""
Train all XGBoost models using existing MongoDB data
Run this once to create trained models for all 4 predictors
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['CVACare']

print("\n" + "="*70)
print("🤖 TRAINING ALL XGBOOST MODELS")
print("="*70)

# 1. Train Articulation Mastery Model
print("\n1️⃣ Training Articulation Mastery Model...")
print("-"*70)
try:
    from articulation_mastery_predictor import ArticulationMasteryPredictor
    
    artic_predictor = ArticulationMasteryPredictor(db)
    
    # Extract training data
    df = artic_predictor.extract_training_data()
    
    if len(df) < 5:
        print(f"⚠️  Not enough training data ({len(df)} samples). Need at least 5 users who mastered sounds.")
    else:
        # Train the model
        metrics = artic_predictor.train_model(df)
        print(f"✅ Articulation model trained!")
        print(f"   MAE: {metrics['mae']:.2f} days")
        print(f"   R²: {metrics['r2']:.3f}")
        print(f"   Training samples: {metrics['train_samples']}")
except Exception as e:
    print(f"❌ Error training articulation model: {e}")

# 2. Train Fluency Mastery Model
print("\n2️⃣ Training Fluency Mastery Model...")
print("-"*70)
try:
    from fluency_mastery_predictor import FluencyMasteryPredictor
    
    fluency_predictor = FluencyMasteryPredictor(db)
    result = fluency_predictor.train_model()
    
    if result['success']:
        print(f"✅ Fluency model trained!")
        print(f"   MAE: {result['metrics']['mae']:.2f} days")
        print(f"   R²: {result['metrics']['r2']:.3f}")
        print(f"   Training samples: {result['metrics']['training_samples']}")
    else:
        print(f"⚠️  {result['message']}")
except Exception as e:
    print(f"❌ Error training fluency model: {e}")

# 3. Train Receptive Language Model
print("\n3️⃣ Training Receptive Language Model...")
print("-"*70)
try:
    from language_mastery_predictor import LanguageMasteryPredictor
    
    receptive_predictor = LanguageMasteryPredictor(db, mode='receptive')
    result = receptive_predictor.train_model()
    
    print(f"✅ Receptive language model trained!")
    print(f"   MAE: {result['mae']:.2f} days")
    print(f"   R²: {result['r2']:.3f}")
    print(f"   Training samples: {result['training_samples']}")
except Exception as e:
    print(f"❌ Error training receptive model: {e}")

# 4. Train Expressive Language Model
print("\n4️⃣ Training Expressive Language Model...")
print("-"*70)
try:
    from language_mastery_predictor import LanguageMasteryPredictor
    
    expressive_predictor = LanguageMasteryPredictor(db, mode='expressive')
    result = expressive_predictor.train_model()
    
    print(f"✅ Expressive language model trained!")
    print(f"   MAE: {result['mae']:.2f} days")
    print(f"   R²: {result['r2']:.3f}")
    print(f"   Training samples: {result['training_samples']}")
except Exception as e:
    print(f"❌ Error training expressive model: {e}")

# 5. Train Overall Speech Improvement Model
print("\n5️⃣ Training Overall Speech Improvement Model...")
print("-"*70)
try:
    from overall_speech_predictor import OverallSpeechPredictor
    
    overall_predictor = OverallSpeechPredictor(db)
    
    # Extract training data
    training_data = overall_predictor.extract_training_data()
    
    if len(training_data) < 5:
        print(f"⚠️  Not enough training data ({len(training_data)} samples). Need at least 5 users who completed therapy.")
    else:
        # Train the model
        overall_predictor.train_model()
        print(f"✅ Overall speech model trained!")
except Exception as e:
    print(f"❌ Error training overall model: {e}")

print("\n" + "="*70)
print("🎉 TRAINING COMPLETE!")
print("="*70)
print("\nRestart your Flask server to use the trained models.")
print("Predictions will now use real XGBoost models instead of baselines!\n")
