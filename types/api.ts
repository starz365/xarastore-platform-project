export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  validationErrors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  hasMore?: boolean;
  cursor?: string;
  filters?: Record<string, any>;
  sort?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  meta: {
    cursor: string;
    hasMore: boolean;
    count: number;
  };
}

export interface ApiRequest<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: T;
  headers?: Record<string, string>;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    location: 'path' | 'query' | 'body';
  }>;
  responses: Array<{
    status: number;
    description: string;
    schema?: any;
  }>;
  security?: Array<{
    type: string;
    scopes?: string[];
  }>;
}

export interface ApiRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  window: string;
}

export interface ApiUsage {
  userId?: string;
  endpoint: string;
  method: string;
  timestamp: string;
  duration: number;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload<T = any> {
  id: string;
  event: string;
  data: T;
  timestamp: string;
  signature?: string;
  attempt: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  responseCode?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
  deliveredAt?: string;
  createdAt: string;
}

export interface ApiHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
  }>;
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    requestCount: number;
  };
}

export interface ApiCache {
  key: string;
  value: any;
  ttl: number;
  createdAt: string;
  expiresAt: string;
  hits: number;
  lastHit?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  userId?: string;
  scopes: string[];
  rateLimit?: number;
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, {
    old: any;
    new: any;
  }>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ApiValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}
