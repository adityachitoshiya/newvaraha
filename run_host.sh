#!/bin/bash
echo "🚀 Starting Varaha Jewels on Local Network..."

# Get Local IP
IP=$(ipconfig getifaddr en0)
echo "🌐 Your Local IP is: $IP"
echo "👉 Access on other devices via: http://$IP:3000"

# Kill existing processes
echo "🧹 Cleaning up old processes..."
pkill -f uvicorn
pkill -f "next-server"

# 1. Start Backend
echo "Starting Backend..."
cd backend
source ../venv/bin/activate || source venv/bin/activate || python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Start Frontend
echo "Starting Frontend..."
cd frontend
npm install > /dev/null 2>&1
npm run dev -- -p 3000 &
FRONTEND_PID=$!
cd ..

echo "✅ Services Started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press CTRL+C to stop."

wait
