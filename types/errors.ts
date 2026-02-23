export interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  isOperational: boolean;
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  isOperational = true;
  
  constructor(
    message: string,
    public details?: Record<string, any>,
    public validationErrors?: Array<{
      field: string;
      message: string;
      code?: string;
    }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string = 'Authentication required', public details?: Record<string, any>) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'Not authorized', public details?: Record<string, any>) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  code = 'NOT_FOUND_ERROR';
  statusCode = 404;
  isOperational = true;
  
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with ID ${id} not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  code = 'CONFLICT_ERROR';
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  code = 'RATE_LIMIT_ERROR';
  statusCode = 429;
  isOperational = true;
  
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number,
    public limit?: number,
    public remaining?: number,
    public reset?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
  isOperational = true;
  
  constructor(service: string, message?: string, public details?: Record<string, any>) {
    super(message || `${service} service unavailable`);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error implements AppError {
  code = 'DATABASE_ERROR';
  statusCode = 500;
  isOperational = true;
  
  constructor(message: string, public query?: string, public parameters?: any[]) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class PaymentError extends Error implements AppError {
  code = 'PAYMENT_ERROR';
  statusCode = 402;
  isOperational = true;
  
  constructor(
    message: string,
    public provider?: string,
    public transactionId?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR';
  statusCode = 503;
  isOperational = true;
  
  constructor(message: string = 'Network connection failed', public details?: Record<string, any>) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class MaintenanceError extends Error implements AppError {
  code = 'MAINTENANCE_ERROR';
  statusCode = 503;
  isOperational = true;
  
  constructor(message: string = 'Service under maintenance', public estimatedRestoration?: string) {
    super(message);
    this.name = 'MaintenanceError';
  }
}

export class StorageError extends Error implements AppError {
  code = 'STORAGE_ERROR';
  statusCode = 500;
  isOperational = true;
  
  constructor(message: string, public bucket?: string, public file?: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class CacheError extends Error implements AppError {
  code = 'CACHE_ERROR';
  statusCode = 500;
  isOperational = true;
  
  constructor(message: string, public key?: string, public operation?: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export class WebhookError extends Error implements AppError {
  code = 'WEBHOOK_ERROR';
  statusCode = 500;
  isOperational = true;
  
  constructor(
    message: string,
    public webhookId?: string,
    public event?: string,
    public attempts?: number
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

export interface ErrorReport {
  error: AppError;
  timestamp: string;
  userId?: string;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    params?: any;
    query?: any;
  };
  environment: {
    nodeEnv: string;
    version: string;
    platform: string;
  };
  stack?: string;
  context?: Record<string, any>;
}
