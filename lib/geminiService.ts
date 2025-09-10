import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import { GradingData, DebateRound, RUBRICS } from './types';

export class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        logger.log('DEBUG', 'backend', 'Gemini constructor called', { 
            hasApiKey: !!apiKey,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 15) + '...' : 'none'
        });
        
        if (apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(apiKey);
                this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                logger.log('INFO', 'backend', 'Gemini AI initialized successfully', {
                    modelName: 'gemini-1.5-flash'
                });
            } catch (error) {
                logger.logError('backend', error as Error, { context: 'gemini-initialization' });
                logger.log('ERROR', 'backend', 'Failed to initialize Gemini - will use fallback');
                this.genAI = null;
                this.model = null;
            }
        } else {
            logger.log('WARN', 'backend', 'No Gemini API key found - counter-arguments will use fallback');
        }
    }

    async validateTopic(topic: string): Promise<{ 
        valid: boolean; 
        reason: string; 
        refinedTopic?: string; 
        suggestedRewrite?: string; 
        usedFallback?: boolean 
    }> {
        logger.log('INFO', 'backend', 'Validating topic with Gemini', { topic: topic.substring(0, 50) + '...' });

        // Fallback if no Gemini API
        if (!this.genAI || !this.model) {
            return this.generateFallbackTopicValidation(topic);
        }

        try {
            const prompt = `You are a debate topic validator and refiner. Given USER_INPUT, return JSON.

### Rules
Valid if:
1. Declarative sentence (no "?").
2. Arguable as pro/con.
3. Fits one of:
   A. Actor + SHOULD + Action
   B. Concept1 + IS [comparative] + Concept2
   C. "On balance ..." harm/benefit claim
   D. Starts with "This House believes that"
4. Optional: may start with "Resolved:".

Invalid if:
- It is a question.
- It is a fragment.
- Too vague or not a claim.
- Multiple unrelated claims.

### Output JSON
{
  "is_valid": true|false,
  "detected_structure": "actor-should-action" | "value-comparison" | "harm-vs-good" | "this-house-believes" | "unknown",
  "explanation": "short reason if invalid, empty if valid",
  "refined_version": "if valid, refined topic with spelling/grammar fixes and better phrasing; empty if invalid",
  "suggested_rewrite": "if invalid, suggested proper version; empty if valid"
}

### Examples
USER_INPUT: "Resolved: schools should requir uniforms"
{
  "is_valid": true,
  "detected_structure": "actor-should-action",
  "explanation": "",
  "refined_version": "Schools should require uniforms.",
  "suggested_rewrite": ""
}

USER_INPUT: "Should schools ban homework?"
{
  "is_valid": false,
  "detected_structure": "unknown",
  "explanation": "It is phrased as a question, not a statement.",
  "refined_version": "",
  "suggested_rewrite": "Schools should ban homework."
}

USER_INPUT: "${topic}"
`;

            logger.log('DEBUG', 'backend', 'Calling Gemini API for topic validation');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const aiContent = response.text().trim();

            logger.log('INFO', 'backend', 'Gemini topic validation response received', { 
                responseLength: aiContent.length,
                responsePreview: aiContent.substring(0, 100) + '...'
            });

            try {
                // Clean the response - remove markdown code blocks if present
                let cleanedContent = aiContent;
                if (cleanedContent.includes('```json')) {
                    cleanedContent = cleanedContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
                }
                if (cleanedContent.includes('```')) {
                    cleanedContent = cleanedContent.replace(/```\s*/, '').replace(/\s*```$/, '');
                }
                const parsedResult = JSON.parse(cleanedContent);
                // Map new response to frontend format
                if (typeof parsedResult.is_valid === 'boolean') {
                    return {
                        valid: parsedResult.is_valid,
                        reason: parsedResult.explanation || (parsedResult.is_valid ? 'Valid debate topic!' : 'Invalid topic.'),
                        refinedTopic: parsedResult.refined_version || '',
                        suggestedRewrite: parsedResult.suggested_rewrite || '',
                        usedFallback: false
                    };
                } else {
                    throw new Error('Invalid response structure from Gemini');
                }
            } catch (parseError) {
                logger.log('ERROR', 'backend', 'Failed to parse Gemini topic validation response', { 
                    aiContent,
                    parseError: (parseError as Error).message 
                });
                // Fallback on parse error
                return this.generateFallbackTopicValidation(topic);
            }

        } catch (error: any) {
            logger.logError('backend', error as Error, { 
                context: 'gemini-topic-validation',
                topic: topic.substring(0, 50) + '...'
            });

            // Fallback on error
            return this.generateFallbackTopicValidation(topic);
        }
    }

    async generateCounterArgument(
        topic: string,
        userSide: 'pro' | 'con',
        userArgument: string,
        wordLimit: number = 180
    ): Promise<{ success: boolean; argument?: string; error?: string }> {
        
        // Determine the AI's opposing side
        const aiSide = userSide === 'pro' ? 'con' : 'pro';
        const aiPosition = aiSide === 'pro' ? 'supporting' : 'opposing';
        const userPosition = userSide === 'pro' ? 'supporting' : 'opposing';

        logger.log('INFO', 'backend', 'Generating counter-argument', {
            topic,
            userSide,
            aiSide,
            userArgumentLength: userArgument.length
        });

        // Fallback if no Gemini API
        if (!this.genAI || !this.model) {
            return this.generateFallbackCounterArgument(topic, aiSide, userArgument, wordLimit);
        }

        try {
            const prompt = `You are a high school student in a debate about: "${topic}"

The other student is ${userPosition} this topic and just said:
"${userArgument}"

Now it's your turn to argue ${aiPosition} this topic. You need to counter their points, but write like a smart high schooler would - casual but still making good arguments.

IMPORTANT: If their response is complete gibberish, nonsense, off-topic, or just random words/characters, call them out on it! Say something like "Uh... that makes no sense at all" or "Did you even read the topic?" or "That's just word salad, dude."

Your response should:
1. If their argument is coherent: Challenge what they just said with your own points
2. If their argument is gibberish: Call them out and maybe make a real argument anyway
3. Be around ${wordLimit} words or less
4. Sound like a confident high school debater - casual, maybe a bit sassy, but still logical
5. Use phrases like "Actually..." "But here's the thing..." "That's not really true because..." etc.
6. Don't be too formal or academic - keep it real

Just write your counter-argument, nothing else.`;

            logger.log('DEBUG', 'backend', 'Calling Gemini for counter-argument generation');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const counterArgument = response.text().trim();
            
            logger.log('DEBUG', 'backend', 'Gemini counter-argument raw response', {
                responseLength: counterArgument.length,
                responsePreview: counterArgument.substring(0, 100) + '...'
            });

            // Validate word count
            const wordCount = this.getWordCount(counterArgument);
            if (wordCount > wordLimit) {
                logger.log('WARN', 'backend', 'Gemini response exceeds word limit', { 
                    wordCount, 
                    wordLimit 
                });
                
                // Try to truncate intelligently
                const truncated = this.truncateToWordLimit(counterArgument, wordLimit);
                logger.log('INFO', 'backend', 'Truncated Gemini response to fit word limit');
                
                return {
                    success: true,
                    argument: truncated
                };
            }

            logger.log('INFO', 'backend', 'Counter-argument generated successfully', {
                wordCount,
                wordLimit
            });

            return {
                success: true,
                argument: counterArgument
            };

        } catch (error: any) {
            logger.logError('backend', error as Error, { 
                context: 'gemini-counter-argument',
                topic,
                userSide 
            });

            // Fallback on error
            return this.generateFallbackCounterArgument(topic, aiSide, userArgument, wordLimit);
        }
    }

    private generateFallbackTopicValidation(topic: string): { valid: boolean; reason: string; usedFallback: boolean } {
        // Basic validation rules
        const isValidLength = topic.length >= 15 && topic.length <= 200;
        const hasMultipleWords = topic.trim().split(/\s+/).length >= 3;
        const isQuestion = topic.includes('?') || topic.toLowerCase().startsWith('should') || 
                          topic.toLowerCase().startsWith('is') || topic.toLowerCase().startsWith('do');
        const hasControversialKeywords = /\b(should|ought|must|better|worse|right|wrong|good|bad|allow|ban|require)\b/i.test(topic);

        const valid = isValidLength && hasMultipleWords && (isQuestion || hasControversialKeywords);

        let reason;
        if (!isValidLength) {
            reason = topic.length < 15 
                ? "Topic is too short. Please provide more detail for a meaningful debate."
                : "Topic is too long. Please keep it concise for focused debate.";
        } else if (!hasMultipleWords) {
            reason = "Topic needs more detail. Please provide a complete question or statement.";
        } else if (!isQuestion && !hasControversialKeywords) {
            reason = "Topic should be debatable. Try framing it as a question or using words like 'should', 'ought', etc.";
        } else {
            reason = `"${topic}" appears to be a suitable debate topic.`;
        }

        logger.log('INFO', 'backend', 'Generated fallback topic validation', { 
            topic: topic.substring(0, 50) + '...',
            valid,
            reason: reason.substring(0, 100) + '...'
        });

        return {
            valid,
            reason,
            usedFallback: true
        };
    }

    private generateFallbackCounterArgument(
        topic: string,
        aiSide: 'pro' | 'con',
        userArgument: string,
        wordLimit: number
    ): { success: boolean; argument: string; error?: string } {
        
        const position = aiSide === 'pro' ? 'supporting' : 'opposing';
        
        // Check if user argument is gibberish (very basic check)
        const isGibberish = this.isArgumentGibberish(userArgument);
        
        const fallbackArguments = {
            pro: isGibberish ? [
                `Uh... that makes absolutely no sense at all. Did you even read the topic? Anyway, I'm still gonna argue for ${topic.toLowerCase().replace('should ', '')} because it actually makes sense unlike whatever that was. This policy would create real benefits and solve actual problems.`,
                `That's just word salad, dude. But hey, at least I can make a real argument for ${topic.toLowerCase().replace('should ', '')}. The evidence clearly shows this approach works when you actually think about it logically.`,
                `I have no idea what you just said, but I'm gonna make a coherent argument anyway. Supporting ${topic.toLowerCase().replace('should ', '')} is the smart move because it addresses real issues with practical solutions.`
            ] : [
                `Actually, you're missing some key points here. The benefits of ${topic.toLowerCase().replace('should ', '')} way outweigh what you mentioned. This approach would create real positive change when we do it right.`,
                `But here's the thing - your argument overlooks the bigger picture. Supporting this makes total sense because it fixes problems we're actually facing and gives people better opportunities.`,
                `That's not really true though. The evidence shows that ${topic.toLowerCase().replace('should ', '')} works when you look at places that tried it. The benefits are obvious if you think about it.`
            ],
            con: isGibberish ? [
                `Okay, that was complete nonsense, but I'll still argue against ${topic.toLowerCase().replace('should ', '')} with actual logic. This policy would create way more problems than it solves and cost too much money.`,
                `Did you hit your head or something? That made zero sense. But whatever, I'm against ${topic.toLowerCase().replace('should ', '')} because it's a bad idea that would mess things up for everyone.`,
                `I literally have no clue what you just said, but I'm still gonna explain why ${topic.toLowerCase().replace('should ', '')} is wrong. It would cause more harm than good and there are better solutions.`
            ] : [
                `Nah, you're not seeing the whole picture. ${topic.toLowerCase().replace('should ', '')} would actually cause more problems than it fixes. The costs and risks just aren't worth it.`,
                `But that's exactly the problem - you're ignoring all the negative consequences. This policy would hurt the people it's supposed to help and create a bunch of new issues.`,
                `Actually, the evidence shows the opposite. ${topic.toLowerCase().replace('should ', '')} sounds good in theory but when you try to actually do it, things get messy and expensive fast.`
            ]
        };

        const randomIndex = Math.floor(Math.random() * fallbackArguments[aiSide].length);
        const fallbackArgument = fallbackArguments[aiSide][randomIndex];

        logger.log('INFO', 'backend', 'Generated fallback counter-argument', { 
            aiSide,
            wordCount: this.getWordCount(fallbackArgument)
        });

        return {
            success: true,
            argument: fallbackArgument,
            error: 'Used fallback - Gemini API unavailable'
        };
    }

    private getWordCount(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    private isArgumentGibberish(text: string): boolean {
        // Basic checks for gibberish
        const trimmed = text.trim();
        
        // Too short
        if (trimmed.length < 10) return true;
        
        // Too many repeated characters
        if (/(.)\1{4,}/.test(trimmed)) return true;
        
        // Too many non-alphabetic characters
        const alphaRatio = (trimmed.match(/[a-zA-Z]/g) || []).length / trimmed.length;
        if (alphaRatio < 0.6) return true;
        
        // Random keyboard mashing patterns
        if (/[qwerty]{5,}|[asdfgh]{5,}|[zxcvbn]{5,}/i.test(trimmed)) return true;
        
        // Very few actual words
        const words = trimmed.split(/\s+/).filter(w => w.length > 2);
        if (words.length < 3) return true;
        
        return false;
    }

    private truncateToWordLimit(text: string, wordLimit: number): string {
        const words = text.trim().split(/\s+/);
        if (words.length <= wordLimit) {
            return text;
        }
        
        const truncated = words.slice(0, wordLimit).join(' ');
        
        // Try to end on a complete sentence
        const lastPeriod = truncated.lastIndexOf('.');
        if (lastPeriod > truncated.length * 0.8) { // If period is in last 20%
            return truncated.substring(0, lastPeriod + 1);
        }
        
        return truncated + '...';
    }

    async generateConstructiveArgument(
        topic: string,
        aiSide: 'pro' | 'con',
        wordLimit: number = 180
    ): Promise<{ success: boolean; argument?: string; error?: string }> {
        
        const aiPosition = aiSide === 'pro' ? 'supporting' : 'opposing';

        logger.log('INFO', 'backend', 'Generating AI constructive argument', {
            topic,
            aiSide,
            aiPosition
        });

        // Fallback if no Gemini API
        if (!this.genAI || !this.model) {
            return this.generateFallbackConstructiveArgument(topic, aiSide, wordLimit);
        }

        try {
            const prompt = `You are a high school student in a debate about: "${topic}"

You're arguing ${aiPosition} this topic. This is your opening argument where you build your case from scratch.

Write your constructive argument like a smart, confident high schooler would:
1. Start strong with your main point
2. Give 2-3 solid reasons why you're right  
3. Use examples that make sense to teenagers
4. Keep it around ${wordLimit} words
5. Sound casual but smart - like "Okay, here's why this makes total sense..." or "Look, the main issue is..."
6. Don't be super formal - just be convincing and relatable

This isn't responding to anyone else - you're making your own case. Just write your argument, nothing else.`;

            logger.log('DEBUG', 'backend', 'Calling Gemini for constructive argument generation');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const constructiveArgument = response.text().trim();
            
            logger.log('DEBUG', 'backend', 'Gemini constructive argument raw response', {
                responseLength: constructiveArgument.length,
                responsePreview: constructiveArgument.substring(0, 100) + '...'
            });

            // Validate word count
            const wordCount = this.getWordCount(constructiveArgument);
            if (wordCount > wordLimit) {
                logger.log('WARN', 'backend', 'Gemini constructive response exceeds word limit', { 
                    wordCount, 
                    wordLimit 
                });
                
                // Try to truncate intelligently
                const truncated = this.truncateToWordLimit(constructiveArgument, wordLimit);
                logger.log('INFO', 'backend', 'Truncated Gemini constructive response to fit word limit');
                
                return {
                    success: true,
                    argument: truncated
                };
            }

            logger.log('INFO', 'backend', 'Constructive argument generated successfully', {
                wordCount,
                wordLimit
            });

            return {
                success: true,
                argument: constructiveArgument
            };

        } catch (error: any) {
            logger.logError('backend', error as Error, { 
                context: 'gemini-constructive-argument',
                topic,
                aiSide 
            });

            // Fallback on error
            return this.generateFallbackConstructiveArgument(topic, aiSide, wordLimit);
        }
    }

    private generateFallbackConstructiveArgument(
        topic: string,
        aiSide: 'pro' | 'con',
        wordLimit: number
    ): { success: boolean; argument: string; error?: string } {
        
        const position = aiSide === 'pro' ? 'supporting' : 'opposing';
        
        const fallbackConstructiveArguments = {
            pro: [
                `Okay, so I'm totally for ${topic.toLowerCase().replace('should ', '')} and here's why. First off, this actually solves real problems that people are dealing with right now. Like, when you look at other places that tried this, it actually worked pretty well. Second, it's just the right thing to do - it makes things more fair and helps people who really need it. And honestly, the benefits way outweigh any downsides. Plus, it's not like we're asking for anything crazy here - this is totally doable if we just put in the effort and plan it right.`,
                `So here's my take on ${topic.toLowerCase().replace('should ', '')} - it's actually a really smart move. Three main reasons: First, it saves money in the long run and makes everything more efficient. Second, it helps level the playing field and gives everyone a better shot. And third, we actually know how to do this because other people have done it successfully. The research backs this up, and it's not just theory - there are real examples of this working. We'd be crazy not to try it when the evidence is this clear.`,
                `Look, ${topic.toLowerCase().replace('should ', '')} just makes sense. The current way of doing things isn't working for a lot of people, and this would actually fix those problems. We have proof that this approach works - it's not some random experiment. The benefits are obvious: better outcomes, more fairness, and it actually gets stuff done. We have the ability to make this happen, and honestly, we kind of have a responsibility to do it. It's the right move.`
            ],
            con: [
                `Actually, I'm against ${topic.toLowerCase().replace('should ', '')} for some pretty good reasons. First, this would probably cause more problems than it solves - like, we've seen this backfire before in other places. It sounds good in theory but when you actually try to do it, things get messy and expensive. Second, what we have now isn't perfect but at least it works and people know what to expect. Why mess with that? There are better ways to fix problems without taking this big of a risk.`,
                `Nah, ${topic.toLowerCase().replace('should ', '')} is actually a bad idea. Here's why: It costs way too much money and doesn't actually work that well. It would hurt the people it's supposed to help and take away choices from everyone else. And honestly, trying to make this happen would be a nightmare - like, who's gonna enforce it and pay for it? There are way better solutions that don't have all these problems.`,
                `I'm gonna have to disagree with ${topic.toLowerCase().replace('should ', '')}. This would mess up systems that are actually working pretty well right now. It creates new problems instead of solving the old ones, and it's just not worth the hassle and cost. Research shows that other approaches work better and don't have all the negative side effects. We should stick with what we know works instead of trying something this risky.`
            ]
        };

        const randomIndex = Math.floor(Math.random() * fallbackConstructiveArguments[aiSide].length);
        const fallbackArgument = fallbackConstructiveArguments[aiSide][randomIndex];

        logger.log('INFO', 'backend', 'Generated fallback constructive argument', { 
            aiSide,
            wordCount: this.getWordCount(fallbackArgument)
        });

        return {
            success: true,
            argument: fallbackArgument,
            error: 'Used fallback - Gemini API unavailable'
        };
    }

    async gradeResponse(
        roundType: DebateRound['type'],
        topic: string,
        userSide: 'pro' | 'con',
        userResponse: string,
        aiResponse?: string
    ): Promise<{ success: boolean; grading?: Partial<GradingData>; error?: string }> {
        
        logger.log('INFO', 'backend', 'Grading user response', {
            roundType,
            topic: topic.substring(0, 50) + '...',
            userSide,
            responseLength: userResponse.length
        });

        // Fallback if no Gemini API
        if (!this.genAI || !this.model) {
            return this.generateFallbackGrading(roundType);
        }

        try {
            const rubric = RUBRICS[roundType];
            const prompt = this.buildGradingPrompt(roundType, topic, userSide, userResponse, aiResponse, rubric);

            logger.log('DEBUG', 'backend', 'Calling Gemini for grading');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const aiContent = response.text().trim();

            logger.log('INFO', 'backend', 'Gemini grading response received', { 
                responseLength: aiContent.length,
                responsePreview: aiContent.substring(0, 100) + '...'
            });

            try {
                // Clean the response - remove markdown code blocks if present
                let cleanedContent = aiContent;
                if (cleanedContent.includes('```json')) {
                    cleanedContent = cleanedContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
                }
                if (cleanedContent.includes('```')) {
                    cleanedContent = cleanedContent.replace(/```\s*/, '').replace(/\s*```$/, '');
                }
                
                const parsedResult = JSON.parse(cleanedContent);
                const grading = this.formatGradingResult(roundType, parsedResult);
                
                return {
                    success: true,
                    grading
                };
                
            } catch (parseError) {
                logger.log('ERROR', 'backend', 'Failed to parse Gemini grading response', { 
                    aiContent,
                    parseError: (parseError as Error).message 
                });
                // Fallback on parse error
                return this.generateFallbackGrading(roundType);
            }

        } catch (error: any) {
            logger.logError('backend', error as Error, { 
                context: 'gemini-grading',
                roundType,
                topic: topic.substring(0, 50) + '...'
            });

            // Fallback on error
            return this.generateFallbackGrading(roundType);
        }
    }

    private buildGradingPrompt(
        roundType: DebateRound['type'],
        topic: string,
        userSide: 'pro' | 'con',
        userResponse: string,
        aiResponse: string | undefined,
        rubric: any
    ): string {
        const position = userSide === 'pro' ? 'supporting' : 'opposing';
        
        return `You are an expert debate judge evaluating a ${rubric.title} speech in an academic debate.

DEBATE TOPIC: "${topic}"
USER POSITION: ${position} this topic
ROUND TYPE: ${rubric.title} (${rubric.description})

USER'S ${rubric.title.toUpperCase()} RESPONSE:
"${userResponse}"

${aiResponse ? `AI OPPONENT'S PREVIOUS RESPONSE:\n"${aiResponse}"\n` : ''}

EVALUATION CRITERIA:
${rubric.criteria.map((c: any, i: number) => 
    `${i + 1}. ${c.name} (Weight: ${c.weight}/5)
   - ${c.description}
   - Examples: ${c.examples.join(', ')}`
).join('\n\n')}

SCORING INSTRUCTIONS:
- Rate each criterion on a scale of 0-5 points
- 5 = Exceptional (far exceeds expectations)
- 4 = Proficient (meets and slightly exceeds expectations)  
- 3 = Adequate (meets basic expectations)
- 2 = Developing (partially meets expectations)
- 1 = Inadequate (does not meet expectations)
- 0 = No evidence (criterion not addressed)

Consider the context of this being a ${roundType} round and evaluate accordingly.

REQUIRED JSON OUTPUT FORMAT:
{
  "scores": {
    "${rubric.criteria[0]?.name.toLowerCase().replace(/[^a-z]/g, '')}": <score_0_to_5>,
    ${rubric.criteria.slice(1).map((c: any) => 
        `"${c.name.toLowerCase().replace(/[^a-z]/g, '')}": <score_0_to_5>`
    ).join(',\n    ')}
  },
  "subtotal": <calculated_weighted_total>,
  "feedback": {
    "strengths": ["specific strength 1", "specific strength 2"],
    "improvements": ["specific improvement 1", "specific improvement 2"],
    "overall": "brief overall assessment"
  }
}

Provide detailed, specific feedback that helps the debater improve their performance.`;
    }

    private formatGradingResult(roundType: DebateRound['type'], parsedResult: any): Partial<GradingData> {
        const scores = parsedResult.scores || {};
        const rubric = RUBRICS[roundType];
        
        // Calculate subtotal based on weights
        let subtotal = 0;
        const criteria = rubric.criteria;
        
        switch (roundType) {
            case 'constructive':
                const clarityStructure = scores.claritystructure || scores.clarity || 3;
                const evidenceReasoning = scores.evidencereasoning || scores.evidence || 3;
                const framing = scores.framing || 3;
                
                subtotal = (clarityStructure * 2) + (evidenceReasoning * 2) + (framing * 1);
                return {
                    constructive: {
                        clarityStructure,
                        evidenceReasoning,
                        framing,
                        subtotal: Math.round(subtotal * (30 / 15)) // Scale to 30 points
                    }
                };
                
            case 'cross-ex':
                const responsiveness = scores.responsiveness || 3;
                const control = scores.control || 3;
                
                subtotal = responsiveness + control;
                return {
                    crossEx: {
                        responsiveness,
                        control,
                        subtotal: Math.round(subtotal * (10 / 10)) // Scale to 10 points
                    }
                };
                
            case 'rebuttal':
                const refutation = scores.refutation || 3;
                const defense = scores.defense || 3;
                const efficiencyFocus = scores.efficiencyfocus || scores.efficiency || 3;
                
                subtotal = (refutation * 2) + (defense * 2) + (efficiencyFocus * 1);
                return {
                    rebuttal: {
                        refutation,
                        defense,
                        efficiencyFocus,
                        subtotal: Math.round(subtotal * (35 / 15)) // Scale to 35 points
                    }
                };
                
            case 'closing':
                const crystallization = scores.crystallization || 3;
                const comparativeWeighing = scores.comparativeweighing || scores.weighing || 3;
                const delivery = scores.delivery || 3;
                
                subtotal = (crystallization * 2) + (comparativeWeighing * 2) + (delivery * 1);
                return {
                    closing: {
                        crystallization,
                        comparativeWeighing,
                        delivery,
                        subtotal: Math.round(subtotal * (25 / 15)) // Scale to 25 points
                    }
                };
                
            default:
                return {};
        }
    }

    private generateFallbackGrading(roundType: DebateRound['type']): { success: boolean; grading: Partial<GradingData>; error: string } {
        logger.log('INFO', 'backend', 'Generated fallback grading', { roundType });
        
        // Generate reasonable fallback scores (3/5 = adequate performance)
        switch (roundType) {
            case 'constructive':
                return {
                    success: true,
                    grading: {
                        constructive: {
                            clarityStructure: 3,
                            evidenceReasoning: 3,
                            framing: 3,
                            subtotal: 18 // 3*2 + 3*2 + 3*1 = 9, scaled to 30 = 18
                        }
                    },
                    error: 'Used fallback grading - Gemini API unavailable'
                };
                
            case 'cross-ex':
                return {
                    success: true,
                    grading: {
                        crossEx: {
                            responsiveness: 3,
                            control: 3,
                            subtotal: 6 // 3 + 3 = 6, scaled to 10 = 6
                        }
                    },
                    error: 'Used fallback grading - Gemini API unavailable'
                };
                
            case 'rebuttal':
                return {
                    success: true,
                    grading: {
                        rebuttal: {
                            refutation: 3,
                            defense: 3,
                            efficiencyFocus: 3,
                            subtotal: 21 // 3*2 + 3*2 + 3*1 = 9, scaled to 35 = 21
                        }
                    },
                    error: 'Used fallback grading - Gemini API unavailable'
                };
                
            case 'closing':
                return {
                    success: true,
                    grading: {
                        closing: {
                            crystallization: 3,
                            comparativeWeighing: 3,
                            delivery: 3,
                            subtotal: 15 // 3*2 + 3*2 + 3*1 = 9, scaled to 25 = 15
                        }
                    },
                    error: 'Used fallback grading - Gemini API unavailable'
                };
                
            default:
                return {
                    success: false,
                    grading: {},
                    error: 'Unknown round type'
                };
        }
    }
}
