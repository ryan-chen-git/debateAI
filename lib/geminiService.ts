import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

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

    async validateTopic(topic: string): Promise<{ valid: boolean; reason: string; usedFallback?: boolean }> {
        logger.log('INFO', 'backend', 'Validating topic with Gemini', { topic: topic.substring(0, 50) + '...' });

        // Fallback if no Gemini API
        if (!this.genAI || !this.model) {
            return this.generateFallbackTopicValidation(topic);
        }

        try {
            const prompt = `You are a debate topic validator. Analyze this topic and determine if it's suitable for a structured debate.

Topic: "${topic}"

A good debate topic should:
- Be controversial with valid arguments on both sides
- Be specific enough to debate meaningfully
- Not be a simple factual question
- Be appropriate for civil discussion
- Have clear pro/con positions

Reply with ONLY a JSON object in this exact format:
{"valid": true/false, "reason": "explanation of why it is or isn't a good debate topic"}`;

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
                
                // Validate the response structure
                if (typeof parsedResult.valid === 'boolean' && typeof parsedResult.reason === 'string') {
                    return {
                        valid: parsedResult.valid,
                        reason: parsedResult.reason
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
            const prompt = `You are participating in a structured debate about: "${topic}"

The human participant is ${userPosition} this topic and just made this argument:
"${userArgument}"

You must now provide a ${aiPosition} argument (counter-argument) that:
1. Directly addresses and challenges the human's points
2. Is exactly ${wordLimit} words or fewer
3. Is well-reasoned and persuasive
4. Maintains a respectful, academic debate tone
5. Does not repeat the human's points - only counter them

Provide ONLY the counter-argument text, no additional commentary or formatting.`;

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
        
        const fallbackArguments = {
            pro: [
                `While there are valid concerns raised, the benefits of ${topic.toLowerCase().replace('should ', '')} significantly outweigh the drawbacks. This approach would lead to positive outcomes for society, economy, and individual well-being when implemented thoughtfully with proper safeguards.`,
                `The argument presented overlooks several key advantages. Supporting this position would create opportunities for innovation, improve efficiency, and address current systemic issues that need urgent attention.`,
                `Though the opposing view has merit, evidence suggests that ${topic.toLowerCase().replace('should ', '')} represents progress and necessary change. The long-term benefits justify short-term challenges.`
            ],
            con: [
                `While the supporting argument raises interesting points, the potential risks and unintended consequences of ${topic.toLowerCase().replace('should ', '')} are too significant to ignore. The current system, though imperfect, provides stability and proven results.`,
                `The argument fails to adequately address the practical challenges and costs involved. Alternative solutions could achieve similar benefits without the associated risks and disruptions.`,
                `Despite good intentions, this approach could create more problems than it solves. Historical precedent shows that such changes often have unforeseen negative impacts on affected communities and institutions.`
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
}
