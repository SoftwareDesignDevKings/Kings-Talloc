#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE} Starting Firebase Emulators + Dev Server...${NC}\n"

# Track PIDs for cleanup
EMULATOR_PID=""
DEV_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${RED} Shutting down...${NC}"

    # Kill emulators first (clean shutdown)
    if [ ! -z "$EMULATOR_PID" ]; then
        echo "  Stopping Firebase emulators (PID: $EMULATOR_PID)..."
        kill $EMULATOR_PID 2>/dev/null
        wait $EMULATOR_PID 2>/dev/null
    fi

    # Then kill dev server
    if [ ! -z "$DEV_PID" ]; then
        echo "  Stopping dev server (PID: $DEV_PID)..."
        kill $DEV_PID 2>/dev/null
        wait $DEV_PID 2>/dev/null
    fi

    echo -e "${GREEN} Cleanup complete${NC}"
    exit 0
}

# Register cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start Firebase Emulators with dev config (open rules, safe from production)
echo -e "${BLUE}🔥 Starting Firebase emulators with dev config...${NC}"
cd firebase
# Use FIREBASE_PROJECT env var if set, otherwise default to demo-test.
# demo-* projects work with emulators without a real Firebase account.
firebase emulators:start --config firebase.emulator.json --project "${FIREBASE_PROJECT:-demo-test}" &
EMULATOR_PID=$!
cd ..

# Wait for emulators to be ready (check for port 8080)
# Allow up to 60s so auth emulator binary can download on first run
echo -e "${BLUE}⏳ Waiting for emulators to be ready...${NC}"
for i in {1..60}; do
    if lsof -i:8080 > /dev/null 2>&1; then
        echo -e "${GREEN} Emulators ready!${NC}\n"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED} Emulators failed to start${NC}"
        exit 1
    fi
done

# Start Next.js dev server
echo -e "${BLUE}⚡ Starting Next.js dev server...${NC}"
npm run dev &
DEV_PID=$!

# Wait for both processes
echo -e "\n${GREEN}🎉 Both servers running!${NC}"
echo -e "${BLUE} Emulator UI: http://localhost:4000${NC}"
echo -e "${BLUE} Dev Server: http://localhost:3000${NC}"
echo -e "\n${RED}Press Ctrl+C to stop all servers${NC}\n"

wait
