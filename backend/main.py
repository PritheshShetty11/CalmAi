import os
import json
import re
import tempfile
import whisper
import subprocess
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

# Load environment variables from config file
load_dotenv("config.env")

# ------------------ INIT ------------------

# Demo mode - Set to False to send real emails
DEMO_MODE = False  # Set to False to send real emails
groq_client = None

# Check for GROQ API key (optional for email functionality)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("GROQ API Key found - Live AI analysis enabled")
else:
    print("No GROQ API Key found - Using demo mode for AI analysis, but emails will be real")

print(f"Email mode: {'Demo' if DEMO_MODE else 'Live'}")

# 🔥 better model for multi-language
whisper_model = whisper.load_model("small")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint to verify system status"""
    ffmpeg_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ffmpeg.exe')
    ffmpeg_exists = os.path.exists(ffmpeg_path)
    
    return {
        "status": "healthy",
        "demo_mode": DEMO_MODE,
        "ffmpeg_available": ffmpeg_exists,
        "whisper_loaded": whisper_model is not None,
        "groq_client": groq_client is not None
    }

# ------------------ LOCATION EXTRACT ------------------

def extract_location(text):
    text_lower = text.lower()

    # First try to find "room" followed by number
    match1 = re.search(r"room\s*(\d+)", text_lower)
    if match1:
        return f"room {match1.group(1)}"

    # Handle date formats like "1/03", "2/15" etc. - combine digits to form room number
    match_date = re.search(r"(\d+)[/]\s*(\d{2,3})", text_lower)
    if match_date:
        first_part = match_date.group(1)
        second_part = match_date.group(2)
        # Combine the parts: "1" + "03" = "103"
        combined_number = first_part + second_part
        return f"room {combined_number}"
    
    # Handle time formats like "6:02", "12:15" etc. - combine digits to form room number
    match_time = re.search(r"(\d+)[:]\s*(\d{2})", text_lower)
    if match_time:
        first_part = match_time.group(1)
        second_part = match_time.group(2)
        # Combine the parts: "6" + "02" = "602"
        combined_number = first_part + second_part
        return f"room {combined_number}"
    
    # Then try to find standalone 3-4 digit numbers (more specific)
    match2 = re.search(r"\b(\d{3,4})\b", text_lower)
    if match2:
        return f"room {match2.group(1)}"
    
    # Finally try 2-digit numbers
    match3 = re.search(r"\b(\d{2})\b", text_lower)
    if match3:
        return f"room {match3.group(1)}"

    return "Unknown"

# ------------------ WEBSOCKET ------------------

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.buffer: list[dict] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

        # send previous alerts
        for msg in self.buffer:
            await websocket.send_json(msg)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        print("📡 Clients:", len(self.active_connections))

        self.buffer.append(message)
        if len(self.buffer) > 50:
            self.buffer.pop(0)

        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ------------------ GROQ ------------------

def analyze_with_groq(text):
    if DEMO_MODE or not groq_client:
        # Demo mode fallback
        text_lower = text.lower()
        
        if "fire" in text_lower:
            return {"crisis_type": "fire", "severity": "critical", "location": "Unknown", "summary": "Fire emergency detected"}
        elif any(word in text_lower for word in ["medical", "emergency", "breathing", "injury", "pain", "heart", "chest"]):
            return {"crisis_type": "medical", "severity": "high", "location": "Unknown", "summary": "Medical emergency detected"}
        elif "security" in text_lower:
            return {"crisis_type": "security", "severity": "medium", "location": "Unknown", "summary": "Security issue detected"}
        elif any(word in text_lower for word in ["help", "madad", "sahaya"]):
            return {"crisis_type": "other", "severity": "medium", "location": "Unknown", "summary": "General assistance requested"}
        else:
            return {"crisis_type": "other", "severity": "low", "location": "Unknown", "summary": "General assistance requested"}
    
    prompt = f"""
You are a STRICT crisis detection AI.

Rules:
- fire -> critical
- medical -> high
- security -> medium
- others -> low
- DO NOT hallucinate

Text: "{text}"

Return ONLY JSON:
{{
  "crisis_type": "",
  "severity": "",
  "location": "",
  "summary": ""
}}
"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )

    result = response.choices[0].message.content.strip()

    match = re.search(r"\{.*\}", result, re.DOTALL)
    return json.loads(match.group()) if match else {}

# ------------------ EMAIL NOTIFICATION SYSTEM ------------------

# Staff database with email addresses and specializations
STAFF_DATABASE = {
    "fire": [
        {"name": "Prithesh", "email": "pritheshrshetty@gmail.com", "role": "Fire Safety Officer"}
    ],
    "medical": [
        {"name": "Prithesh", "email": "pritheshrshetty@gmail.com", "role": "Medical Emergency Coordinator"}
    ],
    "security": [
        {"name": "Prithesh", "email": "pritheshrshetty@gmail.com", "role": "Security Coordinator"}
    ],
    "other": [
        {"name": "Prithesh", "email": "pritheshrshetty@gmail.com", "role": "General Assistance Coordinator"}
    ]
}

# Emergency notification recipient
ALERT_RECIPIENT = "kulalprashanth458@gmail.com"

def assign_staff(crisis_type, severity, location):
    """Assign one specific staff based on emergency type"""
    staff_list = STAFF_DATABASE.get(crisis_type, STAFF_DATABASE["other"])
    
    # Always assign only one specific staff member per emergency type
    assigned = [staff_list[0]] if staff_list else STAFF_DATABASE["other"][:1]
    
    return assigned

def send_emergency_email(staff_member, emergency_details):
    """Send email notification to assigned staff member using Node.js service"""
    try:
        # Call Node.js email service
        email_service_url = "http://localhost:3001/send-emergency-email"
        
        payload = {
            "staffMember": staff_member,
            "emergencyDetails": emergency_details
        }
        
        if DEMO_MODE:
            print(f"EMAIL SENT (Demo Mode):")
            print(f"To: {staff_member['name']} <{staff_member['email']}>")
            print(f"Subject: URGENT: {emergency_details['crisis_type'].upper()} Emergency - {emergency_details['location']}")
            print(f"Body: Would send emergency details via Node.js service")
            return True
        else:
            # Send real email via Node.js service
            response = requests.post(email_service_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                print(f"EMAIL SENT via Node.js service:")
                print(f"To: {staff_member['name']} <{staff_member['email']}>")
                print(f"Message ID: {result.get('messageId', 'N/A')}")
                print(f"Subject: {result.get('subject', 'N/A')}")
                return True
            else:
                print(f"Failed to send email via Node.js service: {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
    except Exception as e:
        print(f"Failed to send email to {staff_member['email']}: {e}")
        return False

def notify_assigned_staff(emergency_details):
    """Notify all assigned staff members"""
    assigned_staff = assign_staff(
        emergency_details['crisis_type'], 
        emergency_details['severity'], 
        emergency_details['location']
    )
    
    notified_staff = []
    for staff_member in assigned_staff:
        success = send_emergency_email(staff_member, emergency_details)
        if success:
            notified_staff.append(staff_member)
    
    return notified_staff

# ------------------ RULE ENGINE ------------------

def enforce_rules(text, ai):
    text_lower = text.lower()

    # ✅ TRUST AI FIRST
    crisis = ai.get("crisis_type") or "other"
    severity = ai.get("severity") or "low"

    # ------------------------
    # 🔥 CRITICAL OVERRIDES ONLY
    # ------------------------

    # Fire override (must never miss)
    if "fire" in text_lower or "aag" in text_lower:
        crisis = "fire"
        severity = "critical"

    # Breathing / life-threatening
    elif any(word in text_lower for word in [
        "breathing", "can't breathe", "not breathing",
        "saans", "behosh", "unconscious"
    ]):
        crisis = "medical"
        severity = "critical"

    # Help fallback - route to front desk, not medical
    elif crisis == "other" and any(word in text_lower for word in [
        "help", "madad", "sahaya"
    ]):
        crisis = "other"
        severity = "medium"

    # ------------------------
    # LOCATION
    # ------------------------
    location = extract_location(text)

    if "lobby" in text_lower:
        location = "lobby"

    # ------------------------
    # 🧾 SUMMARY
    # ------------------------
    summary = (
        f"Emergency: {crisis.capitalize()} assistance needed at {location}"
        if location != "Unknown"
        else f"Emergency: {crisis.capitalize()} situation detected"
    )

    return {
        "crisis_type": crisis,
        "severity": severity,
        "location": location,
        "summary": summary
    }

# ------------------ AUDIO (MULTI-LANGUAGE ) ------------------

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        print(f"Received audio file: {tmp_path}")
        print(f"File size: {os.path.getsize(tmp_path)} bytes")

        # Force real transcription - no fallbacks
        original_text = ""
        language = "unknown"
        
        print("Starting speech-to-text transcription...")
        
        # Try different approaches to get real transcription
        transcription_attempts = [
            # Method 1: Direct transcription with translate
            lambda: whisper_model.transcribe(tmp_path, task="translate", fp16=False),
            # Method 2: Direct transcription without translate  
            lambda: whisper_model.transcribe(tmp_path, fp16=False),
            # Method 3: With English language hint
            lambda: whisper_model.transcribe(tmp_path, language="en", fp16=False),
        ]
        
        for i, attempt in enumerate(transcription_attempts):
            try:
                print(f"Attempt {i+1}...")
                result = attempt()
                
                original_text = result["text"].strip()
                language = result.get("language", "unknown")
                
                print(f"Transcription successful: '{original_text}'")
                print(f"Language detected: {language}")
                
                # Only accept if we got meaningful text
                if original_text and len(original_text) > 0 and original_text.lower() not in ["", " ", ".", "..", "you", "the", "and"]:
                    break
                    
            except Exception as e:
                print(f"Attempt {i+1} failed: {e}")
                continue
        
        # If no meaningful transcription, be honest about it
        if not original_text or len(original_text.strip()) == 0:
            original_text = "no clear speech detected"
            language = "unknown"
            print("No clear speech detected in audio")

        ai = analyze_with_groq(original_text)
        analysis = enforce_rules(original_text, ai)

        # Create emergency details for email notification
        emergency_details = {
            "crisis_type": analysis["crisis_type"],
            "severity": analysis["severity"],
            "location": analysis["location"],
            "transcription": original_text,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Send email notifications to assigned staff
        notified_staff = notify_assigned_staff(emergency_details)

        final = {
            "transcription": original_text,
            "language": language,
            "analysis": analysis,
            "assigned_staff": notified_staff,
            "emails_sent": len(notified_staff)
        }

        print(f"Final result: {final}")
        await manager.broadcast(final)
        return final

    finally:
        # Clean up temporary files
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ------------------ TEXT ------------------

class TextAnalysisRequest(BaseModel):
    text: str

@app.post("/analyze-text")
async def analyze_text(req: TextAnalysisRequest):
    text = req.text

    ai = analyze_with_groq(text)
    analysis = enforce_rules(text, ai)

    # Create emergency details for email notification
    emergency_details = {
        "crisis_type": analysis["crisis_type"],
        "severity": analysis["severity"],
        "location": analysis["location"],
        "transcription": text,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # Send email notifications to assigned staff
    notified_staff = notify_assigned_staff(emergency_details)

    final = {
        "transcription": text,
        "analysis": analysis,
        "assigned_staff": notified_staff,
        "emails_sent": len(notified_staff)
    }

    await manager.broadcast(final)
    return final