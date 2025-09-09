import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { DebateManager } from './lib/debateManager';
import { logger } from './lib/logger';
import { GeminiService } from './lib/geminiService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development (can be removed in production)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/build')));

// Clear logs when server starts
logger.clearLogs();

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Skip logging for static assets
    if (req.url.includes('.') && !req.url.startsWith('/api/')) {
        return next();
    }
    
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

// Initialize debate manager and AI service
const debateManager = new DebateManager(180);
const geminiService = new GeminiService();

// API Routes
// Health check endpoint
app.get('/api/ping', (req, res) => {
    logger.log('DEBUG', 'backend', 'Ping endpoint called');
    res.json({ message: 'pong' });
});

// Server info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        message: 'DebateAI Unified Server',
        version: '2.0.0',
        endpoints: [
            'GET /api/info - Server info',
            'GET /api/ping - Health check',
            'POST /api/debate/submit - Submit debate arguments'
        ],
        status: 'running',
        features: ['Gemini AI Counter-Arguments', 'Advanced Logging', 'React Frontend', 'Unrestricted Debate Topics']
    });
});

// No topic validation needed - debate anything! 🔥

// Debate submission endpoint with AI counter-argument
app.post('/api/debate/submit', async (req, res) => {
    const { argument, side, topic } = req.body;
    
    if (!topic) {
        return res.status(400).json({ 
            success: false, 
            message: 'Topic is required for AI counter-argument generation' 
        });
    }
    
    // Convert 'pro'/'con' to 'sideA'/'sideB'
    const mappedSide = side === 'pro' ? 'sideA' : side === 'con' ? 'sideB' : side;
    
    // Submit user's argument
    const userResult = debateManager.submitArgument(mappedSide, argument);
    
    if (!userResult.success) {
        return res.json(userResult);
    }

    logger.log('INFO', 'backend', 'User argument submitted, generating AI counter-argument', {
        userSide: side,
        topic: topic.substring(0, 50) + '...'
    });

    try {
        // Generate AI counter-argument
        const aiResponse = await geminiService.generateCounterArgument(
            topic,
            side as 'pro' | 'con',
            argument,
            180 // word limit
        );

        if (aiResponse.success && aiResponse.argument) {
            // Submit AI's counter-argument to the opposite side
            const aiSide = side === 'pro' ? 'sideB' : 'sideA';
            const aiResult = debateManager.submitArgument(aiSide, aiResponse.argument);
            
            logger.log('INFO', 'backend', 'AI counter-argument submitted', {
                aiSide,
                success: aiResult.success
            });

            return res.json({
                success: true,
                message: 'Argument submitted successfully',
                userArgument: {
                    side,
                    argument,
                    result: userResult
                },
                aiCounterArgument: {
                    side: side === 'pro' ? 'con' : 'pro',
                    argument: aiResponse.argument,
                    result: aiResult,
                    usedFallback: !!aiResponse.error
                }
            });
        } else {
            // If AI generation fails, still return success for user submission
            logger.log('WARN', 'backend', 'AI counter-argument generation failed', aiResponse);
            
            return res.json({
                success: true,
                message: 'Argument submitted successfully (AI counter-argument unavailable)',
                userArgument: {
                    side,
                    argument,
                    result: userResult
                },
                aiError: 'AI counter-argument could not be generated'
            });
        }
    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'debate-submit-ai-generation',
            userSide: side 
        });
        
        // Return success for user submission even if AI fails
        return res.json({
            success: true,
            message: 'Argument submitted successfully (AI counter-argument unavailable)',
            userArgument: {
                side,
                argument,
                result: userResult
            },
            aiError: 'AI service temporarily unavailable'
        });
    }
});

// Get current debate state
app.get('/api/debate/state', (req, res) => {
    const debateArguments = debateManager.getArguments();
    res.json({
        arguments: debateArguments,
        totalArguments: debateArguments.sideA.length + debateArguments.sideB.length
    });
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 DebateAI Unified Server running on http://localhost:${PORT}`);
    logger.log('INFO', 'backend', `Unified server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
    console.log(`🎨 Frontend available at http://localhost:${PORT}`);
});
