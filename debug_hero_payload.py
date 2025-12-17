import requests
import json

url = "http://localhost:8000/api/content/hero"
payload = {
    "image": "https://example.com/desktop.jpg",
    "mobile_image": "https://example.com/mobile.jpg",
    "title": "Debug Title",
    "subtitle": "Debug Subtitle",
    "link_text": "Debug Link",
    "link_url": "/collections/debug"
}

print(f"Sending POST to {url} with payload: {payload}")
try:
    res = requests.post(url, json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
