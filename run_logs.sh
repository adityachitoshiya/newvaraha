#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 VARAHA JEWELS - Development Server${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get Local IP
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
echo -e "${BLUE}🌐 Network:${NC} $IP"
echo -e "${GREEN}📱 Frontend:${NC} http://$IP:3000"
echo -e "${GREEN}🔧 Backend:${NC}  http://$IP:8000"
echo -e "${GREEN}📖 API Docs:${NC} http://$IP:8000/docs"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${YELLOW}✓ Servers stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Kill old processes
echo -e "${YELLOW}🔄 Cleaning up old processes...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
pkill -f uvicorn 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Start Backend
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 BACKEND STARTING...${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd backend

# Check for virtual environment
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
    echo -e "${GREEN}✓ Using .venv environment${NC}"
elif [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ Using venv environment${NC}"
else
    echo -e "${YELLOW}⚙️  Creating new virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Start backend with logs
echo -e "${CYAN}🚀 Starting FastAPI server...${NC}"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"
sleep 3

# Start Frontend
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}⚛️  FRONTEND STARTING...${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing node modules...${NC}"
    npm install
    echo -e "${GREEN}✓ Node modules installed${NC}"
else
    echo -e "${GREEN}✓ Node modules found${NC}"
fi

echo -e "${CYAN}🚀 Starting Next.js server...${NC}"
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"
sleep 2

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ALL SERVERS RUNNING!${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📱 Frontend:${NC}  http://$IP:3000"
echo -e "${CYAN}🔧 Backend:${NC}   http://$IP:8000"
echo -e "${CYAN}📖 API Docs:${NC}  http://$IP:8000/docs"
echo ""
echo -e "${YELLOW}💡 Logs will appear below...${NC}"
echo -e "${RED}Press CTRL+C to stop all servers${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Wait for both processes and show their output
wait
