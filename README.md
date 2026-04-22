# CalmAI - Voice-First Emergency Response

CalmAI is a full-stack application designed to be a frictionless panic button for hotel guests. With a single click, guests can speak or type their emergency. CalmAI uses artificial intelligence to automatically transcribe the audio, classify the severity and type of the crisis, and instantly alert staff members on a real-time dashboard.

## Features
- **Guest App**: A clean, mobile-friendly interface featuring a single, large panic button and a room QR code scanner placeholder.
- **Audio & Text Fallback**: Guests can use their microphone to describe the emergency or type it manually if preferred.
- **Staff Dashboard**: A real-time, live-updating dashboard for hotel staff with a live clock, hotel branding ("AIT Grand Hotel"), and audible beep notifications upon receiving incoming alerts.
- **AI Triage**: Uses OpenAI's Whisper model for voice transcription and GPT-3.5-Turbo for structuring the unstructured crisis data (e.g. determining severity and location).
- **Demo Mode**: Includes built-in mock responses so you can safely demonstrate the real-time WebSocket flow even without a valid API key.

## Tech Stack
- **Frontend**: React.js, React Router, Vanilla CSS with modern animations.
- **Backend**: Python, FastAPI, WebSockets for real-time bi-directional communication.
- **AI / LLMs**: OpenAI API (Whisper, GPT-3.5-Turbo).

## How to Run

### Prerequisites
1. Python 3.10+
2. Node.js & npm
3. An OpenAI API Key

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` folder.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install fastapi uvicorn openai python-multipart python-dotenv websockets pydantic
   ```
4. Update the `.env` file in the `backend/` directory with your actual OpenAI API key:
   ```env
   OPENAI_API_KEY="sk-..."
   ```
   *(Note: If you use a placeholder key, the server will fallback to Demo Mode automatically.)*
5. Start the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### 3. Usage
- **Guest Interface**: Navigate to `http://localhost:3000/`. Use the purple panic button or text fallback to trigger an alert.
- **Staff Dashboard**: Navigate to `http://localhost:3000/dashboard` in a new tab. Ensure your browser allows sound to hear the audio beep on new alerts!
