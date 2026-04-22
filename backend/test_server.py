import asyncio
import httpx
import websockets
import wave
import struct

# Create dummy audio file
audio_path = "test_audio.wav"
with wave.open(audio_path, 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(44100)
    for _ in range(44100):
        f.writeframesraw(struct.pack('<h', 0))

async def test_websocket_and_api():
    uri = "ws://localhost:8000/ws/dashboard"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to websocket")
            
            # Send POST request in background
            async def upload_audio():
                print("Sending audio to /analyze")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    with open(audio_path, "rb") as f:
                        response = await client.post(
                            "http://localhost:8000/analyze",
                            files={"file": ("test_audio.wav", f, "audio/wav")}
                        )
                    print(f"API Response: {response.status_code}")
                    print(response.text)
            
            # Fire and forget the upload
            task = asyncio.create_task(upload_audio())
            
            # Wait for websocket broadcast
            print("Waiting for broadcast on websocket...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print("Received from websocket:", message)
            except asyncio.TimeoutError:
                print("Timed out waiting for websocket message")
            
            await task
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket_and_api())
