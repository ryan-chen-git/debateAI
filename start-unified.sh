#!/bin/bash

echo "🚀 Starting DebateAI Unified Server..."
echo "====================================="

# Stop any existing servers
echo "🛑 Stopping any existing servers..."
pkill -f 'unified-server' 2>/dev/null
pkill -f 'ts-node unified-server.ts' 2>/dev/null
pkill -f 'ts-node src/app.ts' 2>/dev/null
pkill -f 'server.*ts-node' 2>/dev/null  
pkill -f 'craco start' 2>/dev/null
sleep 2

# Build client first
echo "🎨 Building React client..."
cd client && npm run build && cd ..

# Start unified server
echo "🔧 Starting Unified Server (port 3000)..."
npm run start:server &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
echo "🔍 Checking server status..."
if curl -s http://localhost:3000/api/ping >/dev/null 2>&1; then
    echo "✅ Unified Server: Running on http://localhost:3000"
    echo "✅ API endpoints: Available at http://localhost:3000/api/*"
    echo "✅ Frontend: Available at http://localhost:3000"
else
    echo "❌ Unified Server: Not responding"
    exit 1
fi

echo
echo "🌐 Opening application in browser..."
sleep 2
open http://localhost:3000

echo
echo "🎉 DebateAI is now running on a single port!"
echo "📊 All-in-one access: http://localhost:3000"
echo "🔧 API endpoints: http://localhost:3000/api/*"
echo
echo "💡 To stop the server: pkill -f 'unified-server' or Ctrl+C"

# Keep script running to show logs
echo "📝 Press Ctrl+C to stop the server and exit"
wait
