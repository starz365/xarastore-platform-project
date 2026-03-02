type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      sessionId: this.sessionId,
    };
  }

  private async sendToServer(entry: LogEntry) {
    if (typeof window === 'undefined') return; // Don't send from server

    try {
      // Send to your logging endpoint
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true, // Important for logs during page unload
      });
    } catch (error) {
      // Silently fail - don't create infinite loops
      if (this.isDevelopment) {
        console.error('Failed to send log to server:', error);
      }
    }
  }

  debug(message: string, data?: any) {
    const entry = this.formatMessage('debug', message, data);
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
    this.sendToServer(entry);
  }

  info(message: string, data?: any) {
    const entry = this.formatMessage('info', message, data);
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, data || '');
    }
    this.sendToServer(entry);
  }

  warn(message: string, data?: any) {
    const entry = this.formatMessage('warn', message, data);
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    this.sendToServer(entry);
  }

  error(message: string, data?: any) {
    const entry = this.formatMessage('error', message, data);
    
    // Always log errors to console in development
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, data || '');
    }

    // Send to server for production monitoring
    this.sendToServer(entry);
  }

  // Create a child logger with additional context
  child(context: Record<string, any>) {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  private addContext(data?: any) {
    return {
      ...this.context,
      ...data,
    };
  }

  debug(message: string, data?: any) {
    this.parent.debug(message, this.addContext(data));
  }

  info(message: string, data?: any) {
    this.parent.info(message, this.addContext(data));
  }

  warn(message: string, data?: any) {
    this.parent.warn(message, this.addContext(data));
  }

  error(message: string, data?: any) {
    this.parent.error(message, this.addContext(data));
  }
}

export const logger = Logger.getInstance();
