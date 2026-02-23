export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: string;
  data?: any;
  error?: Error;
  traceId?: string;
  userId?: string;
  sessionId?: string;
}

export class Logger {
  private context: string;
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor(context: string, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      context: this.context,
    };

    if (data) entry.data = data;
    if (error) entry.error = error;

    // Add trace ID for distributed tracing
    if (typeof window !== 'undefined') {
      entry.traceId = window.sessionStorage.getItem('xarastore-trace-id');
      entry.sessionId = window.sessionStorage.getItem('xarastore-session-id');
    }

    return entry;
  }

  private logToConsole(entry: LogEntry): void {
    const { level, message, context, data, error } = entry;
    const style = this.getLogStyle(level);
    
    const args: any[] = [
      `%c[${entry.timestamp}] %c${level.toUpperCase()} %c[${context}] %c${message}`,
      'color: gray',
      style.color,
      'color: blue',
      'color: inherit',
    ];

    if (data) {
      args.push('\n', data);
    }

    if (error) {
      args.push('\n', error);
      if (error.stack) {
        args.push('\n', error.stack);
      }
    }

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(...args);
        break;
    }
  }

  private getLogStyle(level: LogLevel): { color: string; background: string } {
    switch (level) {
      case LogLevel.DEBUG:
        return { color: 'color: gray', background: 'background: #f0f0f0' };
      case LogLevel.INFO:
        return { color: 'color: #1890ff', background: 'background: #e6f7ff' };
      case LogLevel.WARN:
        return { color: 'color: #faad14', background: 'background: #fffbe6' };
      case LogLevel.ERROR:
        return { color: 'color: #f5222d', background: 'background: #fff1f0' };
      case LogLevel.FATAL:
        return { color: 'color: #cf1322', background: 'background: #fff1f0' };
      default:
        return { color: 'color: inherit', background: 'background: inherit' };
    }
  }

  private async sendToServer(entry: LogEntry): Promise<void> {
    try {
      if (this.isProduction) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });
      }
    } catch (error) {
      // Don't log logging errors to avoid infinite loops
      console.error('Failed to send log to server:', error);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatMessage(LogLevel.DEBUG, message, data);
      this.logToConsole(entry);
      if (this.isProduction) {
        this.sendToServer(entry);
      }
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatMessage(LogLevel.INFO, message, data);
      this.logToConsole(entry);
      if (this.isProduction) {
        this.sendToServer(entry);
      }
    }
  }

  warn(message: string, data?: any, error?: Error): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatMessage(LogLevel.WARN, message, data, error);
      this.logToConsole(entry);
      if (this.isProduction) {
        this.sendToServer(entry);
      }
    }
  }

  error(message: string, data?: any, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatMessage(LogLevel.ERROR, message, data, error);
      this.logToConsole(entry);
      if (this.isProduction) {
        this.sendToServer(entry);
      }
    }
  }

  fatal(message: string, data?: any, error?: Error): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      const entry = this.formatMessage(LogLevel.FATAL, message, data, error);
      this.logToConsole(entry);
      if (this.isProduction) {
        this.sendToServer(entry);
      }
    }
  }

  // Performance logging
  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    this.debug(`Starting operation: ${operation}`);
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.info(`Operation completed: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.error(`Operation failed: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        success: false,
      }, error instanceof Error ? error : new Error(String(error)));
      
      throw error;
    }
  }

  // Business event logging
  logEvent(event: string, data?: any): void {
    this.info(`Event: ${event}`, {
      event,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // User action logging
  logUserAction(userId: string, action: string, details?: any): void {
    this.info(`User Action: ${action}`, {
      userId,
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // API request logging
  logApiRequest(method: string, url: string, status: number, duration: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    
    const entry = this.formatMessage(level, `API ${method} ${url}`, {
      method,
      url,
      status,
      duration: `${duration}ms`,
      ...data,
    });

    this.logToConsole(entry);
    
    if (this.isProduction) {
      this.sendToServer(entry);
    }
  }

  // Set trace ID for distributed tracing
  setTraceId(traceId: string): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('xarastore-trace-id', traceId);
    }
  }

  // Set session ID
  setSessionId(sessionId: string): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('xarastore-session-id', sessionId);
    }
  }

  // Create child logger with additional context
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.minLevel);
  }
}

// Singleton instance for global use
export const logger = new Logger('Xarastore', 
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);

// Helper functions for common logging patterns
export const Loggers = {
  api: logger.child('API'),
  auth: logger.child('Auth'),
  database: logger.child('Database'),
  cache: logger.child('Cache'),
  payment: logger.child('Payment'),
  analytics: logger.child('Analytics'),
  performance: logger.child('Performance'),
  security: logger.child('Security'),
  email: logger.child('Email'),
};
