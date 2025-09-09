import express, { Request, Response, NextFunction } from 'express';
import { DebateManager } from './debate/debateManager';
import { logger } from '../shared/logger';

const app = express();
const port = process.env.PORT || 3000;

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

const debateManager = new DebateManager(180); // Set word cap as needed

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'DebateAI Main Server',
        version: '1.0.0',
        endpoints: [
            'GET / - Server info',
            'POST /debate/submit - Submit debate arguments'
        ],
        status: 'running'
    });
});

app.post('/debate/submit', (req, res) => {
    const { argument, side } = req.body;
    
    // Convert 'pro'/'con' to 'sideA'/'sideB'
    const mappedSide = side === 'pro' ? 'sideA' : side === 'con' ? 'sideB' : side;
    
    // Call with correct parameter order: side first, then argument
    const result = debateManager.submitArgument(mappedSide, argument);
    res.json(result);
});

app.listen(port, () => {
    console.log(`Debate app listening at http://localhost:${port}`);
    logger.log('INFO', 'backend', `Server running on http://localhost:${port}`);
});