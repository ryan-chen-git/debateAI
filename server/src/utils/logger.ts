import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

class Logger {
    private logFile: string;
    private static instance: Logger;

    private constructor() {
        this.logFile = path.join(__dirname, '../../logs/debug.log');
        this.ensureLogDirectory();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
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
        this.log('INFO', 'Log file cleared');
    }

    public log(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            logMessage += '\nData: ' + JSON.stringify(data, null, 2);
        }
        
        logMessage += '\n' + '-'.repeat(80) + '\n';
        
        fs.appendFileSync(this.logFile, logMessage);
        
        // Also log to console for development
        console.log(logMessage);
    }

    public logRequest(req: Request, res: Response, duration: number): void {
        const logData = {
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query,
            body: req.body,
            headers: req.headers,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        };

        this.log('INFO', 'API Request', logData);
    }

    public logError(error: Error, req?: Request): void {
        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            request: req ? {
                method: req.method,
                url: req.url,
                params: req.params,
                query: req.query,
                body: req.body,
                headers: req.headers
            } : undefined
        };

        this.log('ERROR', 'Error occurred', errorData);
    }
}

export const logger = Logger.getInstance();
