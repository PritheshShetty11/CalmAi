import requests
import json
import io
import wave
import numpy as np

def create_test_audio():
    """Create a simple test audio file"""
    # Generate a simple sine wave
    sample_rate = 16000
    duration = 2  # 2 seconds
    frequency = 440  # A4 note
    
    t = np.linspace(0, duration, sample_rate * duration)
    audio_data = np.sin(2 * np.pi * frequency * t) * 0.5
    
    # Convert to bytes
    audio_bytes = (audio_data * 32767).astype(np.int16).tobytes()
    
    return audio_bytes

def test_voice_endpoint():
    print("Testing voice endpoint with synthetic audio...")
    
    # Create test audio
    audio_data = create_test_audio()
    
    # Create a file-like object
    audio_file = io.BytesIO(audio_data)
    
    # Send to backend
    try:
        files = {'file': ('test.webm', audio_file, 'audio/webm')}
        response = requests.post("http://localhost:8000/analyze", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"Status: {response.status_code}")
            print(f"Transcription: {result.get('transcription')}")
            print(f"Language: {result.get('language')}")
            print(f"Analysis: {result.get('analysis')}")
        else:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_voice_endpoint()
