"""
Test script to simulate wearable sensor data being sent to the backend
This helps verify the endpoint is working before testing with actual hardware
"""
import requests
import time
import random
import json

# Backend URL
BACKEND_URL = "http://localhost:5000/api/wearable/data"

def generate_mock_sensor_data():
    """Generate mock sensor data similar to what wearable devices would send"""
    return {
        "LEFT_WAIST": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "RIGHT_WAIST": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "LEFT_KNEE": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "RIGHT_KNEE": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "LEFT_TOE": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "RIGHT_TOE": {
            "ax": round(random.uniform(-2.0, 2.0), 2),
            "ay": round(random.uniform(-2.0, 2.0), 2),
            "az": round(random.uniform(8.0, 12.0), 2),
            "gx": round(random.uniform(-50.0, 50.0), 2),
            "gy": round(random.uniform(-50.0, 50.0), 2),
            "gz": round(random.uniform(-50.0, 50.0), 2)
        },
        "LEFT_FOOT_FSR": [
            round(random.uniform(0.5, 3.0), 2),  # Toe
            round(random.uniform(0.5, 3.0), 2),  # Mid
            round(random.uniform(0.5, 3.0), 2)   # Heel
        ],
        "RIGHT_FOOT_FSR": [
            round(random.uniform(0.5, 3.0), 2),  # Toe
            round(random.uniform(0.5, 3.0), 2),  # Mid
            round(random.uniform(0.5, 3.0), 2)   # Heel
        ]
    }

def test_post_data():
    """Test sending data to the backend"""
    print("🧪 Testing Wearable Data Endpoint")
    print("=" * 60)
    
    try:
        # Test if server is running
        print("1. Checking if backend is running...")
        response = requests.get(BACKEND_URL, timeout=2)
        print(f"   ✅ Backend is responding (Status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Backend is NOT running!")
        print(f"   Error: {e}")
        print("\n   Please start the backend server first:")
        print("   cd backend")
        print("   python app.py")
        return False
    
    print("\n2. Sending mock sensor data...")
    print("-" * 60)
    
    try:
        # Send 5 test data packets
        for i in range(5):
            data = generate_mock_sensor_data()
            
            print(f"\n   Sending packet #{i+1}...")
            response = requests.post(
                BACKEND_URL,
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=2
            )
            
            if response.status_code == 200:
                print(f"   ✅ Packet #{i+1} sent successfully")
                print(f"   Response: {response.json()}")
            else:
                print(f"   ❌ Failed to send packet #{i+1}")
                print(f"   Status: {response.status_code}")
                print(f"   Response: {response.text}")
            
            time.sleep(1)  # Wait 1 second between packets
        
        print("\n" + "=" * 60)
        print("3. Testing data retrieval...")
        
        # Test GET request
        response = requests.get(BACKEND_URL, timeout=2)
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Successfully retrieved data from backend")
            print(f"   Data keys: {list(data.keys())}")
            
            # Check if we have MPU data
            if 'LEFT_WAIST' in data:
                print(f"   LEFT_WAIST data: {data['LEFT_WAIST']}")
            
            # Check if we have FSR data
            if 'LEFT_FOOT_FSR' in data:
                print(f"   LEFT_FOOT_FSR data: {data['LEFT_FOOT_FSR']}")
        else:
            print(f"   ❌ Failed to retrieve data")
            print(f"   Status: {response.status_code}")
        
        print("\n" + "=" * 60)
        print("✅ Test completed successfully!")
        print("\nNext steps:")
        print("1. Open your web browser")
        print("2. Navigate to: http://localhost:5173")
        print("3. Go to Gait Analysis page")
        print("4. You should see the sensor data updating")
        print("\nTo keep sending test data, run this script again.")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    print("\n🚀 CVACare Wearable Sensor Test Tool")
    print("=" * 60)
    print("This script simulates wearable sensor data")
    print("Use this to test the endpoint before connecting real hardware")
    print("=" * 60 + "\n")
    
    # Check if backend is running
    try:
        requests.get("http://localhost:5000", timeout=2)
    except:
        print("❌ Backend server is not running!")
        print("\nPlease start the backend first:")
        print("   1. Open a terminal")
        print("   2. cd backend")
        print("   3. venv\\Scripts\\activate  (Windows)")
        print("   4. python app.py")
        print("\nThen run this script again.\n")
        exit(1)
    
    # Run the test
    success = test_post_data()
    
    if success:
        print("\n" + "=" * 60)
        choice = input("\nWould you like to continuously send test data? (y/n): ")
        if choice.lower() == 'y':
            print("\n📡 Continuously sending sensor data...")
            print("Press Ctrl+C to stop\n")
            try:
                counter = 1
                while True:
                    data = generate_mock_sensor_data()
                    response = requests.post(
                        BACKEND_URL,
                        json=data,
                        headers={'Content-Type': 'application/json'},
                        timeout=2
                    )
                    print(f"✅ Packet #{counter} sent - Status: {response.status_code}")
                    counter += 1
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n\n✋ Stopped sending data")
                print("=" * 60)
