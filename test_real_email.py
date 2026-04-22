import requests
import json

# Test the real email system with fire emergency
test_data = {
    'text': 'fire emergency in room 205'
}

url = 'http://localhost:8000/analyze-text'

print("Testing real email notification to Prithesh...")
print(f"Input: {test_data['text']}")

try:
    response = requests.post(url, json=test_data)
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        result = response.json()
        print(f'Location: {result.get("analysis", {}).get("location")}')
        print(f'Severity: {result.get("analysis", {}).get("severity")}')
        print(f'Emails Sent: {result.get("emails_sent", 0)}')
        
        assigned_staff = result.get('assigned_staff', [])
        if assigned_staff:
            print(f'Assigned Staff:')
            for staff in assigned_staff:
                print(f'    - {staff.get("name", "Unknown")} ({staff.get("role", "Unknown")})')
                print(f'      Email: {staff.get("email", "Unknown")}')
        else:
            print(f'No staff assigned')
    else:
        print(f'Error: {response.text}')
        
except Exception as e:
    print(f'Failed to test email: {e}')
