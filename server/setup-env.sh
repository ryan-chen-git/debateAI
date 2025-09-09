#!/bin/bash

echo "🔧 Setting up DebateAI Environment..."
echo

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy example to actual .env file
cp .env.example .env

echo "✅ Created .env file from .env.example"
echo
echo "📝 Please edit the .env file and add your OpenAI API key:"
echo "   OPENAI_API_KEY=your_actual_api_key_here"
echo
echo "🔑 Get your API key from: https://platform.openai.com/api-keys"
echo
echo "💡 After adding your API key, restart the enhanced server:"
echo "   npm start"
