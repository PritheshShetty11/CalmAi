import requests
import json

# Test the text analysis endpoint
url = "http://localhost:8000/analyze-text"
data = {"text": "medical emergency in room 205"}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
