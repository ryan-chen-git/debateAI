#!/bin/bash

echo "🛑 Stopping all DebateAI servers..."
echo

# Stop main server
echo "🔧 Stopping Main Server (port 3000)..."
pkill -f 'ts-node src/app.ts' && echo "✅ Main server stopped" || echo "ℹ️  Main server was not running"

# Stop enhanced server  
echo "⚡ Stopping Enhanced Server (port 3001)..."
pkill -f 'server.*ts-node' && echo "✅ Enhanced server stopped" || echo "ℹ️  Enhanced server was not running"

# Stop React client
echo "🎨 Stopping React Client (port 3002)..."
pkill -f 'craco start' && echo "✅ React client stopped" || echo "ℹ️  React client was not running"

echo
echo "🎉 All servers stopped!"
