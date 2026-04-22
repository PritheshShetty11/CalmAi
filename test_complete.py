import requests
import json

def test_complete_workflow():
    print("Testing complete CalmAI workflow...")
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get("http://localhost:8000/health")
        health = response.json()
        print(f"   Status: {health.get('status')}")
        print(f"   FFmpeg available: {health.get('ffmpeg_available')}")
        print(f"   Whisper loaded: {health.get('whisper_loaded')}")
    except Exception as e:
        print(f"   Health check failed: {e}")
    
    # Test 2: Text analysis
    print("\n2. Testing text analysis...")
    try:
        response = requests.post("http://localhost:8000/analyze-text", 
                               json={"text": "fire emergency in room 305"})
        result = response.json()
        print(f"   Text: {result.get('transcription')}")
        print(f"   Crisis type: {result.get('analysis', {}).get('crisis_type')}")
        print(f"   Severity: {result.get('analysis', {}).get('severity')}")
        print(f"   Location: {result.get('analysis', {}).get('location')}")
    except Exception as e:
        print(f"   Text analysis failed: {e}")
    
    print("\n3. Voice recording test:")
    print("   - Go to http://localhost:3000/")
    print("   - Click the HELP button")
    print("   - Speak clearly: 'medical emergency in room 205'")
    print("   - Check if transcription shows exactly what you said")
    
    print("\n4. Dashboard test:")
    print("   - Go to http://localhost:3000/dashboard")
    print("   - Should show real-time alerts")
    print("   - Should play audio notification for new alerts")

if __name__ == "__main__":
    test_complete_workflow()
