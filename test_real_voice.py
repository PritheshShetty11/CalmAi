import requests
import json

def test_voice_transcription():
    print("Testing updated voice transcription...")
    print("The system should now transcribe what you actually say!")
    print()
    print("To test real voice transcription:")
    print("1. Go to http://localhost:3000/")
    print("2. Click the HELP button")
    print("3. Speak clearly: 'medical emergency in room 205'")
    print("4. The transcription should show exactly what you said")
    print()
    print("Expected result:")
    print('Transcribed Text: "medical emergency in room 205"')
    print("Not:")
    print('Transcribed Text: "emergency voice message recorded"')
    print()
    print("The backend now uses multiple Whisper attempts to get accurate transcription.")
    print("If speech is unclear, it will show 'no clear speech detected' instead of generic messages.")

if __name__ == "__main__":
    test_voice_transcription()
