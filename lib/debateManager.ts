import { DebateSession, DebateRound, GradingData } from './types';
import { v4 as uuidv4 } from 'uuid';

export class DebateManager {
    private wordCap: number;
    private sessions: Map<string, DebateSession> = new Map();

    constructor(wordCap: number = 180) {
        this.wordCap = wordCap;
    }

    public createSession(topic: string, refinedTopic: string, userSide: 'pro' | 'con'): DebateSession {
        const session: DebateSession = {
            id: uuidv4(),
            topic,
            refinedTopic,
            userSide,
            currentRound: 1,
            rounds: [],
            isComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.sessions.set(session.id, session);
        return session;
    }

    public getSession(sessionId: string): DebateSession | null {
        return this.sessions.get(sessionId) || null;
    }

    public addRound(sessionId: string, round: DebateRound): { success: boolean; message: string } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        session.rounds.push(round);
        session.updatedAt = new Date().toISOString();
        return { success: true, message: 'Round added successfully' };
    }

    public submitUserResponse(
        sessionId: string, 
        response: string, 
        roundType: DebateRound['type']
    ): { success: boolean; message: string; round?: DebateRound } {
        const validation = this.validateWordCount(response);
        if (!validation.success) {
            return validation;
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        const round: DebateRound = {
            id: uuidv4(),
            type: roundType,
            userResponse: response,
            timestamp: new Date().toISOString()
        };

        session.rounds.push(round);
        session.updatedAt = new Date().toISOString();

        return { 
            success: true, 
            message: 'Response submitted successfully',
            round 
        };
    }

    public addAIResponse(sessionId: string, roundId: string, aiResponse: string): { success: boolean; message: string } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        const round = session.rounds.find(r => r.id === roundId);
        if (!round) {
            return { success: false, message: 'Round not found' };
        }

        round.aiResponse = aiResponse;
        session.updatedAt = new Date().toISOString();

        return { success: true, message: 'AI response added successfully' };
    }

    public advanceRound(sessionId: string): { success: boolean; message: string; newRound?: number } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        if (session.currentRound >= 4) {
            session.isComplete = true;
            session.updatedAt = new Date().toISOString();
            return { success: true, message: 'Debate completed', newRound: 4 };
        }

        session.currentRound++;
        session.updatedAt = new Date().toISOString();
        
        return { 
            success: true, 
            message: `Advanced to round ${session.currentRound}`,
            newRound: session.currentRound 
        };
    }

    public addGrading(sessionId: string, roundId: string, grading: Partial<GradingData>): { success: boolean; message: string } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        const round = session.rounds.find(r => r.id === roundId);
        if (!round) {
            return { success: false, message: 'Round not found' };
        }

        round.grading = grading;
        session.updatedAt = new Date().toISOString();

        return { success: true, message: 'Grading added successfully' };
    }

    public setFinalGrading(sessionId: string, finalGrading: GradingData): { success: boolean; message: string } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: 'Session not found' };
        }

        session.finalGrading = finalGrading;
        session.isComplete = true;
        session.updatedAt = new Date().toISOString();

        return { success: true, message: 'Final grading set successfully' };
    }

    public validateWordCount(argument: string): { success: boolean; message: string } {
        const wordCount = this.getWordCount(argument);
        if (wordCount > this.wordCap) {
            return { 
                success: false, 
                message: `Response exceeds word cap of ${this.wordCap} words. Current: ${wordCount} words.` 
            };
        }
        return { success: true, message: 'Response is within the word limit.' };
    }

    public getWordCount(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    public getAllSessions(): DebateSession[] {
        return Array.from(this.sessions.values());
    }

    public getCurrentRoundType(roundNumber: number): DebateRound['type'] {
        switch (roundNumber) {
            case 1: return 'constructive';
            case 2: return 'cross-ex';
            case 3: return 'rebuttal';
            case 4: return 'closing';
            default: return 'constructive';
        }
    }

    // Legacy methods for backward compatibility
    public submitArgument(side: 'sideA' | 'sideB', argument: string): { success: boolean; message: string } {
        const validation = this.validateWordCount(argument);
        if (!validation.success) {
            return validation;
        }
        return { success: true, message: 'Argument submitted successfully.' };
    }

    public getArguments(): { sideA: string[]; sideB: string[] } {
        // Return empty arrays for backward compatibility
        return { sideA: [], sideB: [] };
    }
}
