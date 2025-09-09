import fs from 'fs';
import path from 'path';

class Logger {
    private logFile: string;

    constructor() {
        this.logFile = path.join(__dirname, '..', 'logs', 'debug.log');
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    public log(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', source: string, message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] [${source}] ${message}\n`;
        const detailedMessage = data ? `Data: ${JSON.stringify(data, null, 2)}\n` : '';
        const separator = '-'.repeat(80) + '\n';

        console.log(`[${level}] [${source}] ${message}`, data || '');
        fs.appendFileSync(this.logFile, logMessage + detailedMessage + separator);
    }

    public logError(source: string, error: Error, context?: any): void {
        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context
        };
        this.log('ERROR', source, 'Error occurred', errorData);
    }

    public clearLogs(): void {
        this.ensureLogDirectory();
        fs.writeFileSync(this.logFile, '');
        this.log('INFO', 'server', 'Log file cleared');
    }
}

export const logger = new Logger();
