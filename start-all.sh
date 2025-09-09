#!/bin/bash

echo "🚀 Starting all DebateAI servers..."
echo

# Start main server
echo "🔧 Starting Main Server (port 3000)..."
npm start &
MAIN_PID=$!

# Start enhanced server
echo "⚡ Starting Enhanced Server (port 3001)..."
cd server && npm start &
ENHANCED_PID=$!
cd ..

# Start React client  
echo "🎨 Starting React Client (port 3002)..."
cd client && PORT=3002 npm start &
CLIENT_PID=$!
cd ..

echo
echo "🎉 All servers starting!"
echo "📊 Access points:"
echo "   🔧 Main Server:     http://localhost:3000"
echo "   ⚡ Enhanced Server: http://localhost:3001" 
echo "   🎨 React Client:    http://localhost:3002"
echo
echo "💡 To stop all servers: ./stop-all.sh"
