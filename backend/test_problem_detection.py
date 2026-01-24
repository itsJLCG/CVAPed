"""
Test script to verify gait problem detection integration
Tests both good and problematic gait scenarios
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gait_problem_detector import GaitProblemDetector


def test_normal_gait():
    """Test with normal gait metrics (no problems expected)"""
    print("\n" + "="*70)
    print("TEST 1: NORMAL GAIT (Healthy Adult)")
    print("="*70)
    
    detector = GaitProblemDetector()
    
    # Normal healthy gait metrics (around 50th percentile)
    normal_metrics = {
        'step_count': 100,
        'cadence': 110,  # Normal is ~105-115 steps/min
        'stride_length': 1.35,  # Normal is ~1.2-1.5m
        'velocity': 1.25,  # Normal is ~1.0-1.4 m/s
        'gait_symmetry': 0.92,  # Normal is >0.85
        'stability_score': 0.88,  # Normal is >0.75
        'step_regularity': 0.90,  # Normal is >0.75
        'vertical_oscillation': 0.05
    }
    
    problems = detector.detect_problems(normal_metrics)
    problems = detector.prioritize_problems(problems)
    summary = detector.generate_summary(problems)
    
    print(f"\nMetrics:")
    for key, value in normal_metrics.items():
        print(f"  {key}: {value}")
    
    print(f"\n✓ Problems Detected: {len(problems)}")
    print(f"✓ Overall Status: {summary['overall_status']}")
    print(f"✓ Risk Level: {summary['risk_level']}")
    print(f"\n{summary['summary']}")


def test_problematic_gait():
    """Test with problematic gait metrics (multiple issues expected)"""
    print("\n" + "="*70)
    print("TEST 2: PROBLEMATIC GAIT (Post-Stroke Patient Simulation)")
    print("="*70)
    
    detector = GaitProblemDetector()
    
    # Problematic gait metrics (below 5th percentile - severe issues)
    problematic_metrics = {
        'step_count': 60,
        'cadence': 75,  # Very slow (below p5: ~87)
        'stride_length': 0.85,  # Very short (below p5: ~0.95)
        'velocity': 0.65,  # Very slow (below p5: ~0.75)
        'gait_symmetry': 0.55,  # Poor symmetry (below p5: ~0.68)
        'stability_score': 0.45,  # Poor stability
        'step_regularity': 0.40,  # Irregular steps
        'vertical_oscillation': 0.09
    }
    
    problems = detector.detect_problems(problematic_metrics)
    problems = detector.prioritize_problems(problems)
    summary = detector.generate_summary(problems)
    
    print(f"\nMetrics:")
    for key, value in problematic_metrics.items():
        print(f"  {key}: {value}")
    
    print(f"\n⚠️  Problems Detected: {len(problems)}")
    print(f"⚠️  Overall Status: {summary['overall_status']}")
    print(f"⚠️  Risk Level: {summary['risk_level']}")
    print(f"\n{summary['summary']}")
    
    print(f"\n{'─'*70}")
    print("DETAILED PROBLEM REPORT:")
    print('─'*70)
    
    for i, problem in enumerate(problems, 1):
        print(f"\n{i}. {problem['problem'].upper().replace('_', ' ')}")
        print(f"   Severity: {problem['severity'].upper()}")
        print(f"   Category: {problem['category']}")
        print(f"   Current: {problem['current_value']} | Normal: {problem['normal_range']}")
        if 'percentile' in problem:
            print(f"   Percentile: {problem['percentile']}th")
        print(f"\n   📋 Description:")
        print(f"      {problem['description']}")
        print(f"\n   💥 Impact:")
        print(f"      {problem['impact']}")
        print(f"\n   💊 Recommendations:")
        for rec in problem['recommendations']:
            print(f"      • {rec}")


def test_moderate_issues():
    """Test with moderate gait issues (some problems but not severe)"""
    print("\n" + "="*70)
    print("TEST 3: MODERATE ISSUES (Elderly Patient)")
    print("="*70)
    
    detector = GaitProblemDetector()
    
    # Moderate issues (between p5 and p25)
    moderate_metrics = {
        'step_count': 85,
        'cadence': 95,  # Slightly slow (below p25: ~100)
        'stride_length': 1.10,  # Slightly short (below p25: ~1.15)
        'velocity': 0.95,  # Slightly slow (below p25: ~1.05)
        'gait_symmetry': 0.78,  # Slightly asymmetric (below p25: ~0.82)
        'stability_score': 0.60,  # Moderate stability issue
        'step_regularity': 0.68,  # Moderate irregularity
        'vertical_oscillation': 0.06
    }
    
    problems = detector.detect_problems(moderate_metrics)
    problems = detector.prioritize_problems(problems)
    summary = detector.generate_summary(problems)
    
    print(f"\nMetrics:")
    for key, value in moderate_metrics.items():
        print(f"  {key}: {value}")
    
    print(f"\nℹ️  Problems Detected: {len(problems)}")
    print(f"ℹ️  Overall Status: {summary['overall_status']}")
    print(f"ℹ️  Risk Level: {summary['risk_level']}")
    print(f"\n{summary['summary']}")
    
    print(f"\n{'─'*70}")
    print("PROBLEM SUMMARY BY SEVERITY:")
    print('─'*70)
    
    severe = [p for p in problems if p['severity'] == 'severe']
    moderate = [p for p in problems if p['severity'] == 'moderate']
    
    if severe:
        print(f"\n🔴 SEVERE ({len(severe)}):")
        for p in severe:
            print(f"   • {p['problem'].replace('_', ' ').title()}: {p['current_value']}")
    
    if moderate:
        print(f"\n🟡 MODERATE ({len(moderate)}):")
        for p in moderate:
            print(f"   • {p['problem'].replace('_', ' ').title()}: {p['current_value']}")


if __name__ == '__main__':
    print("\n" + "="*70)
    print("GAIT PROBLEM DETECTION TEST SUITE")
    print("Testing PhysioNet Baseline Integration")
    print("="*70)
    
    try:
        test_normal_gait()
        test_moderate_issues()
        test_problematic_gait()
        
        print("\n" + "="*70)
        print("✓ ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
