import { logger } from '../../../shared/logger';

// Capture and redirect console logs to our logger
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

// Override console methods to redirect to file
console.log = (...args) => logger.log('INFO', 'frontend', args.join(' '));
console.error = (...args) => logger.log('ERROR', 'frontend', args.join(' '));
console.warn = (...args) => logger.log('WARN', 'frontend', args.join(' '));
console.info = (...args) => logger.log('INFO', 'frontend', args.join(' '));

// Higher-order function to catch and log frontend errors
export const withErrorLogging = (fn: Function) => {
    return async (...args: any[]) => {
        try {
            return await fn(...args);
        } catch (error) {
            logger.logError('frontend', error as Error);
            throw error;
        }
    };
};

// Utility functions for frontend logging
export const logInfo = (message: string, data?: any) => {
    logger.log('INFO', 'frontend', message, data);
};

export const logError = (error: Error, context?: any) => {
    logger.logError('frontend', error, context);
};

export const logWarning = (message: string, data?: any) => {
    logger.log('WARN', 'frontend', message, data);
};

export const logDebug = (message: string, data?: any) => {
    logger.log('DEBUG', 'frontend', message, data);
};

export const logApiRequest = (method: string, url: string, data?: any) => {
    logger.logRequest('frontend', method, url, data);
};
