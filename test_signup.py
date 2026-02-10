import requests
import json

url = "http://localhost:8000/auth/signup"
data = {
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "password123"
}

response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
