export class DebateManager {
    private wordCap: number;
    private arguments: { sideA: string[]; sideB: string[] };

    constructor(wordCap: number) {
        this.wordCap = wordCap;
        this.arguments = {
            sideA: [],
            sideB: []
        };
    }

    public submitArgument(side: 'sideA' | 'sideB', argument: string): { success: boolean; message: string } {
        const validation = this.validateWordCount(argument);
        if (!validation.success) {
            return validation;
        }

        this.arguments[side].push(argument);
        return { success: true, message: 'Argument submitted successfully.' };
    }

    public validateWordCount(argument: string): { success: boolean; message: string } {
        const wordCount = argument.split(' ').length;
        if (wordCount > this.wordCap) {
            return { success: false, message: `Argument exceeds word cap of ${this.wordCap}.` };
        }
        return { success: true, message: 'Argument is within the word limit.' };
    }

    public getArguments(): { sideA: string[]; sideB: string[] } {
        return this.arguments;
    }
}