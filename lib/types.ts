
export interface GradingData {
  constructive: {
    clarityStructure: number;    // 0-5 points - Clear arguments with proper signposting
    evidenceReasoning: number;   // 0-5 points - Claims backed with support and reasoning
    framing: number;            // 0-5 points - Definitions, standards, framework
    subtotal: number;           // calculated total /30 (weight: 30%)
  };
  crossEx: {
    responsiveness: number;     // 0-5 points - Direct, clear responses
    control: number;           // 0-5 points - Purposeful questions, focused responses
    subtotal: number;          // calculated total /10 (weight: 10%)
  };
  rebuttal: {
    refutation: number;        // 0-5 points - Address opponent's arguments directly
    defense: number;          // 0-5 points - Protect own arguments from attacks
    efficiencyFocus: number;  // 0-5 points - Prioritize important clashes
    subtotal: number;         // calculated total /35 (weight: 35%)
  };
  closing: {
    crystallization: number;   // 0-5 points - Narrow to key voting issues
    comparativeWeighing: number; // 0-5 points - Explain why your side wins
    delivery: number;         // 0-5 points - Clear, persuasive writing
    subtotal: number;         // calculated total /25 (weight: 25%)
  };
  finalScore: number;         // total out of 100
}

export interface DebateRound {
  id: string;
  type: 'constructive' | 'cross-ex' | 'rebuttal' | 'closing';
  userResponse?: string;
  aiResponse?: string;
  grading?: Partial<GradingData>;
  timestamp: string;
}

export interface DebateSession {
  id: string;
  topic: string;
  refinedTopic: string;
  userSide: 'pro' | 'con';
  currentRound: number; // 1-4
  rounds: DebateRound[];
  isComplete: boolean;
  finalGrading?: GradingData;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriteria {
  name: string;
  description: string;
  weight: number; // 0-5 scale weight
  examples: string[];
}

export interface RoundRubric {
  title: string;
  description: string;
  totalPoints: number;
  criteria: RubricCriteria[];
  weight: number; // percentage of final grade
}

export const RUBRICS: Record<DebateRound['type'], RoundRubric> = {
  constructive: {
    title: "Constructive",
    description: "Build the case and set up the round",
    totalPoints: 30,
    weight: 30,
    criteria: [
      {
        name: "Clarity & Structure",
        description: "Are arguments presented in a clear, organized way with proper signposting? Does the speech flow logically from claim to reasoning to conclusion?",
        weight: 2,
        examples: [
          "Clear thesis statement",
          "Logical argument progression", 
          "Proper signposting (First, Second, etc.)",
          "Organized structure"
        ]
      },
      {
        name: "Evidence & Reasoning",
        description: "Are claims backed up with relevant support (facts, logic, or examples)? Is the reasoning chain clear (claim → support → impact)? Are impacts explained rather than just asserted?",
        weight: 2,
        examples: [
          "Concrete evidence provided",
          "Clear reasoning chain",
          "Explained impacts",
          "Credible sources"
        ]
      },
      {
        name: "Framing",
        description: "Are key terms or concepts defined clearly? Is there a standard or framework given for how the judge should evaluate the round? Does the speaker explain why their side's impacts matter most?",
        weight: 1,
        examples: [
          "Clear definitions",
          "Evaluation framework",
          "Impact prioritization",
          "Judge instruction"
        ]
      }
    ]
  },
  'cross-ex': {
    title: "Cross-Examination", 
    description: "Expose weaknesses and clarify arguments",
    totalPoints: 10,
    weight: 10,
    criteria: [
      {
        name: "Responsiveness",
        description: "Are questions answered directly and clearly? Do responses address the substance of the question rather than avoiding it?",
        weight: 1,
        examples: [
          "Direct answers",
          "Addresses question substance",
          "No evasion",
          "Clear responses"
        ]
      },
      {
        name: "Control",
        description: "Are the questions purposeful, targeting weaknesses or clarifications? Do responses maintain focus and avoid unnecessary digression?",
        weight: 1,
        examples: [
          "Strategic questions",
          "Target weaknesses",
          "Maintain focus",
          "Purposeful direction"
        ]
      }
    ]
  },
  rebuttal: {
    title: "Rebuttal",
    description: "Engage in clash — dismantle the opponent's points while defending one's own",
    totalPoints: 35,
    weight: 35,
    criteria: [
      {
        name: "Refutation",
        description: "Are the opponent's main arguments addressed directly? Are counter-arguments logical and clearly explained? Are weaknesses or contradictions in the opponent's case exposed?",
        weight: 2,
        examples: [
          "Direct address of opponent's arguments",
          "Logical counter-arguments",
          "Expose contradictions",
          "Clear explanations"
        ]
      },
      {
        name: "Defense",
        description: "Are the debater's own arguments protected against attacks? Are points rebuilt or reinforced when challenged? Are dropped points minimized?",
        weight: 2,
        examples: [
          "Protect own arguments",
          "Rebuild challenged points",
          "Address attacks",
          "Minimize dropped arguments"
        ]
      },
      {
        name: "Efficiency & Focus",
        description: "Does the debater prioritize the most important clashes? Do they avoid wasting effort on minor or irrelevant details? Is time used to strengthen the strongest arguments?",
        weight: 1,
        examples: [
          "Prioritize key clashes",
          "Avoid minor details",
          "Strategic time use",
          "Strengthen strong arguments"
        ]
      }
    ]
  },
  closing: {
    title: "Closing",
    description: "Narrow, weigh, and persuade — provide the judge with a clear reason to vote",
    totalPoints: 25,
    weight: 25,
    criteria: [
      {
        name: "Crystallization",
        description: "Are the key issues of the round reduced to one or two decisive voting points? Is it clear how these issues decide the outcome?",
        weight: 2,
        examples: [
          "Key voting issues identified",
          "Clear decision points",
          "Reduced complexity",
          "Outcome clarity"
        ]
      },
      {
        name: "Comparative Weighing",
        description: "Are the debater's arguments explicitly compared to the opponent's? Is it explained why their side's impacts are more important, more likely, or come first in time? Is it clear why their side should win even if the opponent has some remaining strengths?",
        weight: 2,
        examples: [
          "Direct comparison",
          "Impact weighing",
          "Probability analysis",
          "Win condition clarity"
        ]
      },
      {
        name: "Delivery (text-based)",
        description: "Is the closing written clearly and persuasively? Is the argumentation easy to follow and free of confusing language? Are no new arguments improperly introduced at this stage?",
        weight: 1,
        examples: [
          "Clear writing",
          "Persuasive style",
          "Easy to follow",
          "No new arguments"
        ]
      }
    ]
  }
};
