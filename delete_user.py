#!/usr/bin/env python3
"""
Simple script to delete a user by email from Supabase Auth
Usage: python delete_user.py your-email@example.com
"""

import sys
import requests
from urllib.parse import quote

if len(sys.argv) < 2:
    print("Usage: python delete_user.py <email>")
    sys.exit(1)

email = sys.argv[1]
# URL encode the email (especially the @ symbol)
encoded_email = quote(email, safe='')

url = f"http://localhost:8000/api/admin/users/{encoded_email}"

print(f"Deleting user: {email}")
print(f"URL: {url}")

try:
    response = requests.delete(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print(f"✓ Successfully deleted user: {email}")
    else:
        print(f"✗ Failed to delete user: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
