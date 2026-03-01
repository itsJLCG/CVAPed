"""
Test Arduino Connection to Backend
Run this to verify the /api/wearable/data endpoint is working
"""
import requests
import json

# Test data matching Arduino format
test_data = {
    "LEFT_WAIST": {
        "ax": 0.12,
        "ay": -0.98,
        "az": 0.05,
        "gx": 1.2,
        "gy": -0.3,
        "gz": 0.8
    },
    "RIGHT_WAIST": {
        "ax": 0.15,
        "ay": -0.95,
        "az": 0.07,
        "gx": 1.1,
        "gy": -0.4,
        "gz": 0.9
    }
}

print("🧪 Testing Arduino Connection...")
print("="*60)

# Test POST (simulating Arduino)
print("\n1️⃣ Testing POST (simulating Arduino sending data)...")
try:
    response = requests.post(
        'http://localhost:5000/api/wearable/data',
        json=test_data,
        headers={'Content-Type': 'application/json'},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test GET (simulating frontend)
print("\n2️⃣ Testing GET (simulating frontend fetching data)...")
try:
    response = requests.get('http://localhost:5000/api/wearable/data', timeout=5)
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   Data received: {json.dumps(data, indent=2)}")
    
    if data:
        print("   ✅ Backend is storing and returning data!")
    else:
        print("   ⚠️ Backend returns empty - no data stored yet")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "="*60)
print("💡 Next steps:")
print("   1. If this test works, the issue is with Arduino network connection")
print("   2. Make sure Arduino IP matches backend server IP")
print("   3. Check Arduino Serial Monitor for HTTP status codes")
print("="*60)
