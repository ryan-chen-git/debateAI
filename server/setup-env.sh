#!/bin/bash

echo "🔧 Setting up DebateAI Environment..."
echo "====================================="

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
echo "📝 NEXT STEPS:"
echo "============="
echo
echo "1. 🔑 ADD YOUR OPENAI API KEY:"
echo "   Edit .env and replace 'your_openai_api_key_here' with your actual key"
echo "   Get it from: https://platform.openai.com/api-keys"
echo
echo "2. 💳 BILLING SETUP:"
echo "   - Go to: https://platform.openai.com/settings/organization/billing"
echo "   - Add payment method and credits ($5-10 is plenty)"
echo
echo "3. 🎛️  CONFIGURE MODE:"
echo "   - If you have OpenAI credits: set USE_FALLBACK=false"
echo "   - If no credits yet: leave USE_FALLBACK=true (works great!)"
echo
echo "4. 🚀 RESTART SERVER:"
echo "   cd .. && npm start"
echo
echo "5. �� TEST:"
echo "   Visit http://localhost:3002 and try entering a debate topic!"
echo
echo "💡 TIP: The fallback mode works perfectly for development!"
