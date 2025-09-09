import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { DebateManager } from '../../src/debate/debateManager';
import { logger } from '../../shared/logger';

dotenv.config();

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Clear logs when server starts
logger.clearLogs();

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Log request
    logger.log('INFO', 'backend', `Incoming ${req.method} request to ${req.url}`);
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body) {
        const duration = Date.now() - start;
        logger.logRequest('backend', req.method, req.url, body, duration);
        return originalSend.call(this, body);
    };
    
    next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.logError('backend', err, { 
        method: req.method,
        url: req.url,
        body: req.body
    });
    res.status(500).json({ error: 'Internal Server Error' });
});

// Set a default word cap (e.g., 180 for round 1)
const debateManager = new DebateManager(180);

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'DebateAI Enhanced Server',
        version: '1.0.0',
        endpoints: [
            'GET / - Server info',
            'GET /api/ping - Health check',
            'POST /api/validate-topic - Validate debate topics with OpenAI'
        ],
        status: 'running',
        features: ['OpenAI Integration', 'Advanced Logging']
    });
});

app.get('/api/ping', (req, res) => {
    logger.log('DEBUG', 'backend', 'Ping endpoint called');
    res.json({ message: 'pong' });
});

// POST /api/validate-topic: Validate debate topic using OpenAI
app.post('/api/validate-topic', async (req, res) => {
  const { topic } = req.body;
  logger.log('INFO', 'backend', 'Received topic for validation:', { topic });
  if (!topic || typeof topic !== 'string') {
    logger.log('WARN', 'backend', 'No topic provided or topic is not a string');
    return res.status(400).json({ valid: false, reason: 'No topic provided.' });
  }

  // Check if we should use OpenAI or fallback
  if (!process.env.OPENAI_API_KEY || process.env.USE_FALLBACK === 'true') {
    logger.log('INFO', 'backend', 'Using fallback validation (OpenAI disabled or no credits)');
    const fallbackResponse = {
      valid: topic.length >= 15 && topic.includes(' '),
      reason: topic.length >= 15 && topic.includes(' ')
        ? `"${topic}" appears to be a valid debate topic.`
        : `"${topic}" seems too short or simple for a debate topic. Please provide more detail.`
    };
    return res.json(fallbackResponse);
  }

  try {
    // Debug: Check if API key is loaded
    logger.log('DEBUG', 'backend', 'API Key status', { 
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10)
    });
    
    // Call OpenAI API (replace YOUR_OPENAI_API_KEY with your actual key)
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a debate judge. Reply only with JSON.' },
          { role: 'user', content: `Is this a valid debate topic? Reply with {"valid":true/false,"reason":"..."}. Topic: ${topic}` }
        ],
        temperature: 0.0
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Parse OpenAI response
    const aiContent = response.data.choices[0].message.content;
    logger.log('INFO', 'backend', 'OpenAI response received', { aiContent });
    let result;
    try {
      result = JSON.parse(aiContent);
    } catch {
      logger.log('ERROR', 'backend', 'AI response could not be parsed', { aiContent });
      return res.status(500).json({ valid: false, reason: 'AI response could not be parsed.' });
    }
    res.json(result);
  } catch (err: any) {
    logger.logError('backend', err as Error, { context: 'validate-topic' });
    
    // Handle specific OpenAI errors
    if (err.response?.status === 429) {
      logger.log('WARN', 'backend', 'OpenAI rate limit hit, using fallback validation');
      // Fallback validation based on topic length and content
      const fallbackResponse = {
        valid: topic.length >= 15 && topic.includes(' '),
        reason: topic.length >= 15 && topic.includes(' ')
          ? `"${topic}" appears to be a valid debate topic. (OpenAI temporarily unavailable - using fallback validation)`
          : `"${topic}" seems too short or simple for a debate topic. Please provide more detail. (OpenAI temporarily unavailable)`
      };
      return res.json(fallbackResponse);
    }
    
    if (err.response?.status === 401) {
      logger.log('ERROR', 'backend', 'OpenAI API key invalid or expired');
      return res.status(500).json({ valid: false, reason: 'API configuration error. Please check your OpenAI API key.' });
    }
    
    res.status(500).json({ valid: false, reason: 'Error validating topic. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  logger.log('INFO', 'backend', `Enhanced server running on http://localhost:${PORT}`);
});
