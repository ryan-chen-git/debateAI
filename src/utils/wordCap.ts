export function enforceWordCap(input: string, maxWords: number): { truncated: string; violations: number } {
    const words = input.split(/\s+/);
    const wordCount = words.length;

    if (wordCount <= maxWords) {
        return { truncated: input, violations: 0 };
    }

    const truncated = words.slice(0, maxWords).join(' ');
    const violations = wordCount - maxWords;

    return { truncated, violations };
}