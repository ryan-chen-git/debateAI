// Debate Judging Rubric Types
export type DebateCategory =
    | 'argumentQuality'
    | 'evidenceSupport'
    | 'responsiveness'
    | 'structureAdherence'
    | 'styleClarity';

export interface CategoryScore {
    category: DebateCategory;
    score: number; // 0-10
    comments?: string;
}

export interface RoundScore {
    round: number;
    scores: CategoryScore[];
    total: number;
}

export interface JudgeResult {
    sideScores: {
        [side: string]: {
            rounds: RoundScore[];
            total: number;
            justification: string;
        };
    };
    winner: string; // 'A' or 'B'
    rubric: {
        [category in DebateCategory]: number; // weight (e.g. 0.3)
    };
}

// Canonical Debate Transcript
export interface DebateTranscript {
    topic: string;
    sideMap: { [side: string]: 'pro' | 'con' };
    rounds: {
        round: number;
        A: string;
        B: string;
    }[];
    caps: { r1: number; r2: number; r3: number };
    rules: { no_new_claims_in_r3: boolean };
}