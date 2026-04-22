import os
import json
import re
import tempfile
import whisper
import aiosmtplib
from email.message import EmailMessage

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from groq import Groq

# ------------------ INIT ------------------

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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

# ------------------ LOCATION EXTRACT ------------------

def extract_location(text):
    text_lower = text.lower()

    match1 = re.search(r"room\s*\d+", text_lower)
    if match1:
        return match1.group()

    match2 = re.search(r"\b\d{2,4}\b", text_lower)
    if match2:
        return f"room {match2.group()}"

    return "Unknown"

# ------------------ WEBSOCKET ------------------

async def send_email_alert(data):
    try:
        msg = EmailMessage()
        msg["From"] = os.getenv("EMAIL_USER")
        msg["To"] = os.getenv("ALERT_EMAIL")
        msg["Subject"] = f"🚨 {data['analysis']['severity'].upper()} ALERT"

        msg.set_content(f"""
Crisis Type: {data['analysis']['crisis_type']}
Severity: {data['analysis']['severity']}
Location: {data['analysis']['location']}
Summary: {data['analysis']['summary']}

Message:
{data['transcription']}
""")

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=os.getenv("EMAIL_USER"),
            password=os.getenv("EMAIL_PASS"),
        )

        print("📧 Email sent!")

    except Exception as e:
        print("Email error:", e)

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
    prompt = f"""
You are a STRICT crisis detection AI.

Rules:
- fire → critical
- medical → high
- security → medium
- others → low
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

    # Help fallback (only if AI failed)
    elif crisis == "other" and any(word in text_lower for word in [
        "help", "madad", "sahaya"
    ]):
        crisis = "medical"
        severity = "high"

    # ------------------------
    # 📍 LOCATION
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

# ------------------ AUDIO (MULTI-LANGUAGE 🔥) ------------------

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # 🔥 Auto language detect + translate
        result = whisper_model.transcribe(
            tmp_path,
            task="translate"   # 🔥 converts ANY language → English
        )

        original_text = result["text"].strip()
        language = result.get("language", "unknown")

        print("🌍 Language:", language)
        print("🎤 Text:", original_text)

        if not original_text:
            original_text = "unknown"

        ai = analyze_with_groq(original_text)
        analysis = enforce_rules(original_text, ai)

        final = {
            "transcription": original_text,
            "language": language,
            "analysis": analysis
        }

        await manager.broadcast(final)

        # 📧 SEND EMAIL ONLY FOR HIGH / CRITICAL
        if analysis["severity"] in ["high", "critical"]:
            await send_email_alert(final)
        return final

    finally:
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

    final = {
        "transcription": text,
        "analysis": analysis
    }

    await manager.broadcast(final)

    # 📧 SEND EMAIL ONLY FOR HIGH / CRITICAL
    if analysis["severity"] in ["high", "critical"]:
        await send_email_alert(final)
    return final