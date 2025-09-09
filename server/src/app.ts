import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { DebateManager } from '../../src/debate/debateManager';
import { logger } from '../../shared/logger';

// Override console methods to redirect to file
console.log = (...args) => logger.log('INFO', 'backend', args.join(' '));
console.error = (...args) => logger.log('ERROR', 'backend', args.join(' '));
console.warn = (...args) => logger.log('WARN', 'backend', args.join(' '));
console.info = (...args) => logger.log('INFO', 'backend', args.join(' '));

dotenv.config();

const app = express();
const PORT = 3001;

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

app.get('/api/ping', (req, res) => {
    logger.log('DEBUG', 'backend', 'Ping endpoint called');
    res.json({ message: 'pong' });
});

// POST /api/validate-topic: Validate debate topic using OpenAI
app.post('/api/validate-topic', async (req, res) => {
  const { topic } = req.body;
  console.log('Received topic for validation:', topic);
  if (!topic || typeof topic !== 'string') {
    console.log('No topic provided or topic is not a string');
    return res.status(400).json({ valid: false, reason: 'No topic provided.' });
  }

  try {
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
    console.log('OpenAI response:', aiContent);
    let result;
    try {
      result = JSON.parse(aiContent);
    } catch {
      console.log('AI response could not be parsed:', aiContent);
      return res.status(500).json({ valid: false, reason: 'AI response could not be parsed.' });
    }
    res.json(result);
  } catch (err) {
    console.log('Error validating topic:', err);
    res.status(500).json({ valid: false, reason: 'Error validating topic.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
