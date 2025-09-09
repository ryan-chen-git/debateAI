import fs from 'fs';
import path from 'path';

interface LogData {
    timestamp: string;
    level: string;
    source: 'frontend' | 'backend';
    message: string;
    data?: any;
}

class SharedLogger {
    private logFile: string;
    private static instance: SharedLogger;

    private constructor() {
        // Store logs in the root directory
        this.logFile = path.join(process.cwd(), 'logs/debug.log');
        this.ensureLogDirectory();
    }

    public static getInstance(): SharedLogger {
        if (!SharedLogger.instance) {
            SharedLogger.instance = new SharedLogger();
        }
        return SharedLogger.instance;
    }

    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    public clearLogs(): void {
        this.ensureLogDirectory();
        fs.writeFileSync(this.logFile, '');
        this.log('INFO', 'backend', 'Log file cleared');
    }

    public log(
        level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG',
        source: 'frontend' | 'backend',
        message: string,
        data?: any
    ): void {
        const logEntry: LogData = {
            timestamp: new Date().toISOString(),
            level,
            source,
            message,
            data
        };

        const logMessage = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.source}] ${logEntry.message}\n`;
        const detailedMessage = data ? `Data: ${JSON.stringify(data, null, 2)}\n` : '';
        const separator = '-'.repeat(80) + '\n';

        fs.appendFileSync(this.logFile, logMessage + detailedMessage + separator);
    }

    public logRequest(
        source: 'frontend' | 'backend',
        method: string,
        url: string,
        data?: any,
        duration?: number
    ): void {
        const logData = {
            method,
            url,
            data,
            duration: duration ? `${duration}ms` : undefined,
            timestamp: new Date().toISOString()
        };

        this.log('INFO', source, `${method} ${url}`, logData);
    }

    public logError(
        source: 'frontend' | 'backend',
        error: Error,
        context?: any
    ): void {
        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context
        };

        this.log('ERROR', source, 'Error occurred', errorData);
    }
}

// For frontend usage via import
export const logger = SharedLogger.getInstance();

// For backend usage via require
module.exports = {
    logger: SharedLogger.getInstance()
};
