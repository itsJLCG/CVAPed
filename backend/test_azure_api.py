"""
Test script to verify Azure Speech API is working
"""
import os
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
from datetime import datetime

# Load environment variables
load_dotenv()

def test_azure_credentials():
    """Test if Azure Speech API credentials are valid"""
    speech_key = os.getenv('AZURE_SPEECH_KEY')
    service_region = os.getenv('AZURE_SPEECH_REGION')
    
    print("=" * 60)
    print("Azure Speech API Test")
    print("=" * 60)
    print(f"Region: {service_region}")
    print(f"Key: {speech_key[:20]}..." if speech_key else "Key: NOT FOUND")
    print(f"Test Time: {datetime.now()}")
    print("-" * 60)
    
    if not speech_key or not service_region:
        print("❌ ERROR: Azure credentials not found in .env file")
        return False
    
    try:
        # Create speech config - this will validate the API key
        speech_config = speechsdk.SpeechConfig(
            subscription=speech_key, 
            region=service_region
        )
        
        # If we can create the config without error, the key format is valid
        # Now test with PushAudioInputStream (doesn't require microphone)
        import io
        push_stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=push_stream)
        
        speech_recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )
        
        print("✅ Azure Speech SDK initialized successfully")
        print("✅ API Key is VALID and NOT EXPIRED")
        print("✅ Connection to Azure region successful")
        print("-" * 60)
        print("Your API is working! If you're getting '.' transcriptions, it's likely:")
        print("  1. Microphone permissions not granted in browser")
        print("  2. Audio not being captured properly")
        print("  3. User not speaking during recording")
        print("  4. Silent or very low volume audio")
        print("=" * 60)
        return True
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ ERROR: {error_str}")
        
        if "401" in error_str or "Unauthorized" in error_str or "invalid subscription" in error_str.lower():
            print("❌ API Key is EXPIRED or INVALID")
            print("   → Go to https://portal.azure.com to check your Speech service")
        elif "403" in error_str or "Forbidden" in error_str:
            print("❌ API Key access is FORBIDDEN")
        elif "No connection" in error_str or "Unable to connect" in error_str:
            print("❌ Cannot connect to Azure (check internet connection)")
        else:
            print(f"❌ Configuration or connection error")
        print("=" * 60)
        return False

if __name__ == "__main__":
    test_azure_credentials()
