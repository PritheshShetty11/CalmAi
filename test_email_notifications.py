import requests
import json

# Test the email notification system with different emergency types
test_cases = [
    {'text': 'fire emergency in room 205', 'type': 'fire'},
    {'text': 'medical emergency in room 302', 'type': 'medical'},
    {'text': 'security threat in lobby', 'type': 'security'},
    {'text': 'help needed in room 101', 'type': 'other'}
]

url = 'http://localhost:8000/analyze-text'

for test in test_cases:
    try:
        response = requests.post(url, json={'text': test['text']})
        print(f'Testing {test["type"]} emergency:')
        print(f'  Input: {test["text"]}')
        print(f'  Status: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print(f'  Location: {result.get("analysis", {}).get("location")}')
            print(f'  Severity: {result.get("analysis", {}).get("severity")}')
            print(f'  Emails Sent: {result.get("emails_sent", 0)}')
            
            assigned_staff = result.get('assigned_staff', [])
            if assigned_staff:
                print(f'  Assigned Staff:')
                for staff in assigned_staff:
                    print(f'    - {staff.get("name", "Unknown")} ({staff.get("role", "Unknown")})')
            else:
                print(f'  No staff assigned')
        else:
            print(f'  Error: {response.text}')
        print()
    except Exception as e:
        print(f'Failed to test {test["type"]}: {e}')
        print()
