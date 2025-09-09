#!/bin/bash

echo "🚀 Starting DebateAI Development Environment..."
echo "================================================"

# Stop any existing servers
echo "🛑 Stopping any existing servers..."
pkill -f 'ts-node src/app.ts' 2>/dev/null
pkill -f 'server.*ts-node' 2>/dev/null  
pkill -f 'craco start' 2>/dev/null
sleep 2

# Start main server
echo "🔧 Starting Main Server (port 3000)..."
npm run start:main &
MAIN_PID=$!

# Start enhanced server
echo "⚡ Starting Enhanced Server (port 3001)..."
(cd server && npm start) &
ENHANCED_PID=$!

# Start React client
echo "🎨 Starting React Client (port 3002)..."
(cd client && PORT=3002 npm start) &
CLIENT_PID=$!

# Wait for servers to start
echo "⏳ Waiting for servers to start..."
sleep 8

# Check if servers are running
echo "🔍 Checking server status..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Main Server: Running on http://localhost:3000"
else
    echo "❌ Main Server: Not responding"
fi

if curl -s http://localhost:3001 >/dev/null 2>&1; then
    echo "✅ Enhanced Server: Running on http://localhost:3001"
else
    echo "❌ Enhanced Server: Not responding"
fi

if curl -s http://localhost:3002 >/dev/null 2>&1; then
    echo "✅ React Client: Running on http://localhost:3002"
else
    echo "❌ React Client: Not responding"
fi

echo
echo "🌐 Opening frontend in browser..."
sleep 2
open http://localhost:3002

echo
echo "🎉 Development environment started!"
echo "📊 Access points:"
echo "   🔧 Main Server API:    http://localhost:3000"
echo "   ⚡ Enhanced Server API: http://localhost:3001"
echo "   🎨 React Frontend:      http://localhost:3002"
echo
echo "💡 To stop all servers: npm stop"

# Keep script running to show logs
echo "�� Press Ctrl+C to stop all servers and exit"
wait
