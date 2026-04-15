#!/usr/bin/env python3
"""
Train all ML prediction models for CVAPed Web
Run: python train_all_models.py
"""

import os
import sys
import traceback
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

os.environ.setdefault('ENABLE_MDNS', 'true')

from gait_mastery_predictor import GaitMasteryPredictor
from articulation_mastery_predictor import ArticulationMasteryPredictor
from language_mastery_predictor import LanguageMasteryPredictor
from fluency_mastery_predictor import FluencyMasteryPredictor


def connect_db():
    """Connect to MongoDB using environment variable"""
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        raise ValueError("MONGO_URI environment variable is not set")
    
    client = MongoClient(mongo_uri)
    db_name = mongo_uri.split('/')[-1].split('?')[0]
    db = client[db_name]
    print(f"[OK] Connected to MongoDB: {db_name}")
    return db


def train_gait_model(db):
    """Train Gait Mastery model"""
    print("\n" + "="*60)
    print("TRAINING GAIT MASTERY MODEL")
    print("="*60)
    
    predictor = GaitMasteryPredictor(db)
    metrics = predictor.train_model()
    predictor.save_model()
    
    return metrics


def train_articulation_model(db):
    """Train Articulation Mastery model"""
    print("\n" + "="*60)
    print("TRAINING ARTICULATION MASTERY MODEL")
    print("="*60)
    
    predictor = ArticulationMasteryPredictor(db)
    df = predictor.extract_training_data()
    metrics = predictor.train_model(df)
    
    return metrics


def train_language_models(db):
    """Train both Receptive and Expressive Language models"""
    results = {}
    
    for mode in ['receptive', 'expressive']:
        print("\n" + "="*60)
        print(f"TRAINING LANGUAGE {mode.upper()} MASTERY MODEL")
        print("="*60)
        
        predictor = LanguageMasteryPredictor(db, mode=mode)
        
        try:
            metrics = predictor.train_model()
            results[mode] = metrics
        except Exception as e:
            print(f"[WARN] Error training {mode} model: {e}")
            results[mode] = {'error': str(e)}
    
    return results


def train_fluency_model(db):
    """Train Fluency Mastery model"""
    print("\n" + "="*60)
    print("TRAINING FLUENCY MASTERY MODEL")
    print("="*60)
    
    predictor = FluencyMasteryPredictor(db)
    metrics = predictor.train_model()
    
    return metrics


def main():
    print("\n" + "="*60)
    print("CVAPed ML Model Training")
    print("Started at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)
    
    try:
        db = connect_db()
        
        results = {}
        
        # Train all models
        results['gait'] = train_gait_model(db)
        results['articulation'] = train_articulation_model(db)
        results['language'] = train_language_models(db)
        results['fluency'] = train_fluency_model(db)
        
        # Summary
        print("\n" + "="*60)
        print("TRAINING SUMMARY")
        print("="*60)
        
        for model_name, metrics in results.items():
            print(f"\n{model_name.upper()}:")
            if isinstance(metrics, dict):
                if 'error' in metrics:
                    print(f"   [ERR] Error: {metrics['error']}")
                else:
                    for k, v in metrics.items():
                        print(f"   {k}: {v}")
        
        print("\n" + "="*60)
        print("[OK] All models trained successfully!")
        print("="*60)
        
    except Exception as e:
        print(f"\n[ERROR] Training failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()