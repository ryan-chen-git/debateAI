# DebateAI - Unified Architecture

A streamlined 1v1 debate application that utilizes a Large Language Model (LLM) as a judge to enforce strict word caps on arguments and provide valid JSON results based on the debate submissions.

## 🚀 Quick Start

### Option 1: Quick Development Start
```bash
npm run start:dev
```

### Option 2: Using the Startup Script
```bash
./start-unified.sh
```

### Option 3: Production Build
```bash
npm run build
npm start
```

## 📁 Simplified Architecture

The application now runs as a **single unified server** on port 3000:

```
unified-server (Port 3000)
├── 🎨 React Frontend (/)
├── 🔧 API Endpoints (/api/*)
│   ├── /api/ping - Health check
│   ├── /api/info - Server information
│   ├── /api/validate-topic - Gemini AI topic validation
│   ├── /api/debate/submit - Submit arguments
│   └── /api/debate/state - Get debate state
├── 📊 Debate Management
├── 🤖 Gemini AI Integration
└── 📝 Centralized Logging
```

## ✨ Key Improvements

- **Single Port**: Everything runs on port 3000
- **Simplified Deployment**: One server to manage
- **Better Performance**: No cross-server communication overhead
- **Easier Development**: Single build and start process
- **Production Ready**: Serves built React app as static files

## 🛠 Features

- **Debate Management**: Manages 1v1 debate flow with word cap enforcement (180 words)
- **AI Topic Validation**: Uses Google Gemini to validate debate topics
- **Fallback Validation**: Works even without Gemini API key
- **Modern React UI**: Clean, responsive interface with real-time feedback
- **Advanced Logging**: Comprehensive request/response and error logging
- **Gemini AI Integration**: Free credits for topic validation and counter-arguments

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Build client and start development server |
| `npm run build` | Build both client and server for production |
| `npm start` | Run production build |
| `npm run clean` | Clean build directories |
| `./start-unified.sh` | Interactive startup with health checks |

## 🔧 Environment Setup

### Quick Setup:
```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. Edit .env and add your API keys
# 3. Get your Gemini API key from: https://aistudio.google.com/app/apikey
```

### Required API Keys:

**Google Gemini API Key** (Required for ALL AI features):
- Go to: https://aistudio.google.com/app/apikey
- Sign in with Google account
- Click "Create API Key" 
- Add to `.env` file as: `GEMINI_API_KEY=your_key_here`
- **FREE CREDITS** - No payment required to get started!

**Features powered by Gemini:**
- ✅ Smart topic validation
- ✅ AI counter-argument generation  
- ✅ Contextual debate responses
- ✅ Fallback protection if API fails

### Example .env file:
```env
# Required for ALL AI features (topic validation + counter-arguments)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional settings
PORT=3000
USE_FALLBACK=false
```

## 🌐 Access Points

Once started, access the application at:
- **Main Application**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/ping
- **Server Info**: http://localhost:3000/api/info

## 🗂 Project Structure

```
debate-app/
├── unified-server.ts          # Main server combining all functionality
├── client/                    # React frontend
│   ├── src/App.tsx           # Main React component
│   └── build/                # Built React app (after npm run build:client)
├── src/debate/               # Debate management logic
│   └── debateManager.ts      # Core debate functionality
├── shared/                   # Shared utilities
│   └── logger.ts            # Centralized logging
├── logs/                     # Application logs
├── package.json             # Unified dependencies and scripts
└── start-unified.sh         # Interactive startup script
```

## 🔄 Migration from Multi-Server

The previous three-server architecture has been consolidated:

| Old Architecture | New Architecture |
|------------------|------------------|
| Main Server (3000) + Enhanced Server (3001) + React Client (3002) | **Unified Server (3000)** |
| Complex inter-server communication | Direct API calls |
| Multiple build processes | Single build process |
| Difficult deployment | Simple deployment |

## 🚦 API Endpoints

### Topic Validation
```http
POST /api/validate-topic
Content-Type: application/json

{
  "topic": "Should universities ban cars on campus?"
}
```

### Submit Debate Argument
```http
POST /api/debate/submit
Content-Type: application/json

{
  "side": "pro",
  "argument": "Your debate argument here..."
}
```

### Get Debate State
```http
GET /api/debate/state
```

## 🐛 Troubleshooting

1. **Port already in use**: Kill existing processes with `pkill -f 'unified-server'`
2. **React build missing**: Run `npm run build:client`
3. **Gemini AI errors**: Set `USE_FALLBACK=true` in `.env` file
4. **Dependencies issues**: Delete `node_modules` and run `npm install`

## 🤝 Contributing

The simplified architecture makes contributions much easier:
1. Clone the repository
2. Run `npm install` 
3. Start development with `npm run start:dev`
4. Make your changes
5. Test with `npm run build && npm start`

---

**Previous multi-server architecture files are preserved for reference but no longer needed for running the application.**