import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { DebateManager } from './lib/debateManager';
import { logger } from './lib/logger';
import { GeminiService } from './lib/geminiService';
import { DebateSession, DebateRound } from './lib/types';

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
            'POST /api/validate-topic - Validate debate topic',
            'POST /api/debate/create - Create new debate session',
            'POST /api/debate/:sessionId/submit - Submit round response',
            'GET /api/debate/:sessionId - Get session details',
            'POST /api/debate/submit - Submit debate arguments (legacy)',
            'GET /api/debate/state - Get debate state (legacy)'
        ],
        status: 'running',
        features: ['Gemini AI Counter-Arguments', 'Advanced Logging', 'React Frontend', 'Unrestricted Debate Topics']
    });
});

// Topic validation endpoint
app.post('/api/validate-topic', async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({
                valid: false,
                reason: 'Topic is required and must be a string'
            });
        }

        const validation = await geminiService.validateTopic(topic);
        
        res.json(validation);
    } catch (error) {
        logger.logError('backend', error as Error, { context: 'topic-validation' });
        res.status(500).json({
            valid: false,
            reason: 'Server error during validation'
        });
    }
});

// No topic validation needed - debate anything! 🔥

// Create new debate session
app.post('/api/debate/create', async (req, res) => {
    try {
        const { topic, refinedTopic, userSide } = req.body;
        
        if (!topic || !refinedTopic || !userSide) {
            return res.status(400).json({
                success: false,
                message: 'Topic, refinedTopic, and userSide are required'
            });
        }

        if (!['pro', 'con'].includes(userSide)) {
            return res.status(400).json({
                success: false,
                message: 'userSide must be either "pro" or "con"'
            });
        }

        const session = debateManager.createSession(topic, refinedTopic, userSide);
        
        logger.log('INFO', 'backend', 'New debate session created', {
            sessionId: session.id,
            topic: topic.substring(0, 50) + '...',
            userSide
        });

        res.json({
            success: true,
            session: session,
            message: 'Debate session created successfully'
        });
        
    } catch (error) {
        logger.logError('backend', error as Error, { context: 'create-debate-session' });
        res.status(500).json({
            success: false,
            message: 'Server error creating debate session'
        });
    }
});

// Submit user response for current round
app.post('/api/debate/:sessionId/submit', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { response } = req.body;
        
        if (!response || typeof response !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Response is required and must be a string'
            });
        }

        const session = debateManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Debate session not found'
            });
        }

        if (session.isComplete) {
            return res.status(400).json({
                success: false,
                message: 'Debate session is already complete'
            });
        }

        const currentRoundType = debateManager.getCurrentRoundType(session.currentRound);
        
        // Submit user response
        const userResult = debateManager.submitUserResponse(sessionId, response, currentRoundType);
        if (!userResult.success) {
            return res.status(400).json(userResult);
        }

        logger.log('INFO', 'backend', 'User response submitted', {
            sessionId,
            roundType: currentRoundType,
            roundNumber: session.currentRound
        });

        let aiResponse: string | null = null;

        // Generate AI response (except for closing round)
        if (currentRoundType !== 'closing') {
            try {
                let aiResult;
                
                if (currentRoundType === 'constructive') {
                    // Round 1: AI gives its own constructive argument (independent of user's response)
                    const aiSide = session.userSide === 'pro' ? 'con' : 'pro';
                    aiResult = await geminiService.generateConstructiveArgument(
                        session.refinedTopic,
                        aiSide,
                        180
                    );
                } else if (currentRoundType === 'cross-ex') {
                    // Round 2: AI responds to cross-examination based on user's questions
                    aiResult = await geminiService.generateCounterArgument(
                        session.refinedTopic,
                        session.userSide,
                        response,
                        180
                    );
                } else {
                    // Round 3+: AI gives rebuttals/responses
                    aiResult = await geminiService.generateCounterArgument(
                        session.refinedTopic,
                        session.userSide,
                        response,
                        180
                    );
                }

                if (aiResult.success && aiResult.argument && userResult.round) {
                    const aiAddResult = debateManager.addAIResponse(sessionId, userResult.round.id, aiResult.argument);
                    if (aiAddResult.success) {
                        aiResponse = aiResult.argument;
                        logger.log('INFO', 'backend', 'AI response generated and added', {
                            sessionId,
                            roundType: currentRoundType
                        });
                    }
                }
            } catch (error) {
                logger.logError('backend', error as Error, { 
                    context: 'ai-response-generation',
                    sessionId,
                    roundType: currentRoundType
                });
            }
        }

        // Advance to next round or complete debate
        const advanceResult = debateManager.advanceRound(sessionId);
        const updatedSession = debateManager.getSession(sessionId);

        // If debate is complete, generate final grading for all rounds
        let finalGrading: any = null;
        if (updatedSession?.isComplete) {
            try {
                logger.log('INFO', 'backend', 'Debate complete, generating final grading', {
                    sessionId
                });

                // Grade all rounds at once
                for (const round of updatedSession.rounds) {
                    if (round.userResponse) {
                        const roundGrading = await geminiService.gradeResponse(
                            round.type,
                            updatedSession.refinedTopic,
                            updatedSession.userSide,
                            round.userResponse,
                            round.aiResponse || undefined
                        );

                        if (roundGrading.success && roundGrading.grading) {
                            debateManager.addGrading(sessionId, round.id, roundGrading.grading);
                        }
                    }
                }

                // Get updated session with all grading
                const finalSession = debateManager.getSession(sessionId);
                finalGrading = finalSession?.finalGrading || null;

                logger.log('INFO', 'backend', 'Final grading completed', {
                    sessionId,
                    finalScore: finalGrading?.finalScore || 0
                });
            } catch (error) {
                logger.logError('backend', error as Error, { 
                    context: 'final-grading-generation',
                    sessionId
                });
            }
        }

        res.json({
            success: true,
            message: 'Response submitted successfully',
            round: {
                type: currentRoundType,
                userResponse: response,
                aiResponse,
                grading: null // No individual round grading
            },
            session: updatedSession,
            nextRound: advanceResult.newRound,
            isComplete: updatedSession?.isComplete || false,
            finalGrading: finalGrading
        });

    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'submit-debate-response',
            sessionId: req.params.sessionId 
        });
        
        res.status(500).json({
            success: false,
            message: 'Server error processing response'
        });
    }
});

// Get debate session details
app.get('/api/debate/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = debateManager.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Debate session not found'
            });
        }

        res.json({
            success: true,
            session
        });
        
    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'get-debate-session',
            sessionId: req.params.sessionId 
        });
        
        res.status(500).json({
            success: false,
            message: 'Server error retrieving session'
        });
    }
});

// Legacy debate submission endpoint with AI counter-argument
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

// Frontend-compatible endpoints
// Start debate endpoint (frontend expects this)
app.post('/api/start-debate', async (req, res) => {
    try {
        const { topic, position, startingPlayer } = req.body;
        
        if (!topic) {
            return res.status(400).json({
                success: false,
                message: 'Topic is required'
            });
        }

        // Convert position to userSide
        const userSide = position === 'for' ? 'pro' : 'con';
        
        // Create session with refined topic (use original topic for now)
        const session = debateManager.createSession(topic, topic, userSide);
        
        logger.log('INFO', 'backend', 'New debate session created via start-debate endpoint', {
            sessionId: session.id,
            topic: topic.substring(0, 50) + '...',
            userSide,
            startingPlayer
        });

        res.json({
            success: true,
            session
        });

    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'start-debate-endpoint' 
        });
        
        res.status(500).json({
            success: false,
            message: 'Server error creating debate session'
        });
    }
});

// Submit argument endpoint (frontend expects this)
app.post('/api/submit-argument', async (req, res) => {
    try {
        const { sessionId, argument } = req.body;
        
        if (!sessionId || !argument) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and argument are required'
            });
        }

        const session = debateManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Determine round type
        const roundTypes = ['constructive', 'cross-ex', 'rebuttal', 'closing'] as const;
        const currentRoundType = roundTypes[session.currentRound - 1];

        logger.log('INFO', 'backend', 'Submitting user response via submit-argument endpoint', {
            sessionId,
            currentRound: session.currentRound,
            roundType: currentRoundType
        });

        // Add user response to current round
        const userResult = debateManager.submitUserResponse(sessionId, argument, currentRoundType);
        
        if (!userResult.success) {
            return res.status(400).json(userResult);
        }

        let aiResponse: string | null = null;

        // Generate AI response (except for closing round)
        if (currentRoundType !== 'closing') {
            try {
                let aiResult;
                
                if (currentRoundType === 'constructive') {
                    // Round 1: AI gives its own constructive argument
                    const aiSide = session.userSide === 'pro' ? 'con' : 'pro';
                    aiResult = await geminiService.generateConstructiveArgument(
                        session.refinedTopic,
                        aiSide,
                        180
                    );
                } else {
                    // Round 2+: AI gives responses/rebuttals
                    aiResult = await geminiService.generateCounterArgument(
                        session.refinedTopic,
                        session.userSide,
                        argument,
                        180
                    );
                }

                if (aiResult.success && aiResult.argument && userResult.round) {
                    const aiAddResult = debateManager.addAIResponse(sessionId, userResult.round.id, aiResult.argument);
                    if (aiAddResult.success) {
                        aiResponse = aiResult.argument;
                    }
                }
            } catch (error) {
                logger.logError('backend', error as Error, { 
                    context: 'ai-response-generation-submit-argument',
                    sessionId
                });
            }
        }

        // Advance to next round or complete debate
        debateManager.advanceRound(sessionId);
        const updatedSession = debateManager.getSession(sessionId);

        res.json({
            success: true,
            session: updatedSession
        });

    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'submit-argument-endpoint' 
        });
        
        res.status(500).json({
            success: false,
            message: 'Server error submitting argument'
        });
    }
});

// AI response endpoint (frontend expects this)
app.post('/api/ai-response', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const session = debateManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Return the current session (AI response should already be generated)
        res.json({
            success: true,
            session
        });

    } catch (error) {
        logger.logError('backend', error as Error, { 
            context: 'ai-response-endpoint' 
        });
        
        res.status(500).json({
            success: false,
            message: 'Server error getting AI response'
        });
    }
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
