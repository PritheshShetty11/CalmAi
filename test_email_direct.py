import requests
import json

# Test direct email to Prithesh
email_payload = {
    "staffMember": {
        "name": "Prithesh",
        "email": "pritheshrshetty@gmail.com",
        "role": "Fire Safety Officer"
    },
    "emergencyDetails": {
        "crisis_type": "fire",
        "severity": "critical",
        "location": "room 205",
        "transcription": "Test email notification for Prithesh",
        "timestamp": "2026-04-23 01:52:00"
    }
}

url = 'http://localhost:3001/send-emergency-email'

print("Testing direct email to Prithesh...")
print(f"Recipient: {email_payload['staffMember']['email']}")
print(f"Subject: URGENT: {email_payload['emergencyDetails']['crisis_type'].upper()} Emergency - {email_payload['emergencyDetails']['location']}")

try:
    response = requests.post(url, json=email_payload, timeout=30)
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        result = response.json()
        print(f'✅ Email sent successfully!')
        print(f'Message ID: {result.get("messageId", "N/A")}')
        print(f'Subject: {result.get("subject", "N/A")}')
        print(f'Recipient: {result.get("recipient", "N/A")}')
    else:
        print(f'❌ Failed to send email')
        print(f'Status: {response.status_code}')
        print(f'Response: {response.text}')
        
except Exception as e:
    print(f'❌ Error: {e}')
