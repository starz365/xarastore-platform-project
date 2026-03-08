import * as Sentry from '@sentry/nextjs';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

const getSentryConfig = (): SentryConfig => ({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export function initializeSentry() {
  if (typeof window === 'undefined') {
    // Server-side initialization
    Sentry.init({
      ...getSentryConfig(),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Postgres(),
        new Sentry.Integrations.Prisma(),
      ],
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Filter out sensitive breadcrumbs
        if (breadcrumb.category === 'fetch' && breadcrumb.data?.url) {
          const url = new URL(breadcrumb.data.url);
          if (url.pathname.includes('/api/payment')) {
            return null; // Don't track payment API calls
          }
        }
        return breadcrumb;
      },
    });
  } else {
    // Client-side initialization
    Sentry.init({
      ...getSentryConfig(),
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/xarastore\.com/],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: getSentryConfig().tracesSampleRate,
      replaysSessionSampleRate: getSentryConfig().replaysSessionSampleRate,
      replaysOnErrorSampleRate: getSentryConfig().replaysOnErrorSampleRate,
    });
  }
}

export function captureException(
  error: Error | string,
  context?: {
    level?: 'error' | 'warning' | 'info' | 'debug';
    tags?: Record<string, string | number | boolean>;
    extra?: Record<string, any>;
    user?: { id: string; email?: string; username?: string };
    request?: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: any;
    };
  }
) {
  const sentryContext: Sentry.ScopeContext = {};

  if (context?.level) {
    sentryContext.level = context.level;
  }

  if (context?.tags) {
    sentryContext.tags = context.tags;
  }

  if (context?.extra) {
    sentryContext.extra = context.extra;
  }

  if (context?.user) {
    sentryContext.user = context.user;
  }

  if (context?.request) {
    sentryContext.request = context.request;
  }

  if (error instanceof Error) {
    Sentry.captureException(error, sentryContext);
  } else {
    Sentry.captureException(new Error(error), sentryContext);
  }
}

export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string | number | boolean>;
    extra?: Record<string, any>;
    user?: { id: string; email?: string; username?: string };
  }
) {
  const sentryContext: Sentry.ScopeContext = { level };

  if (context?.tags) {
    sentryContext.tags = context.tags;
  }

  if (context?.extra) {
    sentryContext.extra = context.extra;
  }

  if (context?.user) {
    sentryContext.user = context.user;
  }

  Sentry.captureMessage(message, sentryContext);
}

export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(
  message: string,
  category?: string,
  level?: 'error' | 'warning' | 'info' | 'debug',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}

export function captureCheckIn(
  monitorSlug: string,
  status: 'in_progress' | 'ok' | 'error',
  duration?: number
) {
  return Sentry.captureCheckIn({
    monitorSlug,
    status,
    duration,
  });
}

export function withSentry<T>(
  fn: () => Promise<T>,
  options?: {
    name?: string;
    tags?: Record<string, string | number | boolean>;
    extra?: Record<string, any>;
  }
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'function',
      name: options?.name || fn.name || 'anonymous',
      tags: options?.tags,
      data: options?.extra,
    },
    async () => {
      try {
        return await fn();
      } catch (error) {
        captureException(error as Error, {
          tags: options?.tags,
          extra: options?.extra,
        });
        throw error;
      }
    }
  );
}

export function createSentryMiddleware() {
  return async function sentryMiddleware(
    req: Request,
    res: Response,
    next: () => void
  ) {
    const transaction = Sentry.startTransaction({
      name: `${req.method} ${new URL(req.url).pathname}`,
      op: 'http.server',
    });

    Sentry.getCurrentScope().setSpan(transaction);

    try {
      await next();
    } catch (error) {
      captureException(error as Error, {
        request: {
          method: req.method,
          url: req.url,
          headers: Object.fromEntries(req.headers),
        },
      });
      throw error;
    } finally {
      transaction.end();
    }
  };
}

export function getSentryDSN(): string {
  return process.env.SENTRY_DSN || '';
}

export function isSentryEnabled(): boolean {
  return !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production';
}

export function flushSentry(timeout?: number): Promise<boolean> {
  return Sentry.flush(timeout);
}

export function closeSentry(timeout?: number): Promise<boolean> {
  return Sentry.close(timeout);
}

// Performance monitoring utilities
export function measurePerformance(name: string, fn: () => any): any {
  const transaction = Sentry.startTransaction({ name, op: 'performance' });
  try {
    return fn();
  } finally {
    transaction.end();
  }
}

export async function measurePerformanceAsync(name: string, fn: () => Promise<any>): Promise<any> {
  const transaction = Sentry.startTransaction({ name, op: 'performance' });
  try {
    return await fn();
  } finally {
    transaction.end();
  }
}

// Error boundary component helper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <Sentry.ErrorBoundary fallback={fallback || <div>Something went wrong</div>}>
        <Component {...props} />
      </Sentry.ErrorBoundary>
    );
  };
}

// API error tracking
export function trackAPIError(
  error: Error,
  req: Request,
  context?: Record<string, any>
) {
  captureException(error, {
    tags: {
      type: 'api_error',
      method: req.method,
      path: new URL(req.url).pathname,
    },
    extra: {
      ...context,
      headers: Object.fromEntries(req.headers),
      url: req.url,
    },
  });
}

// Database query performance tracking
export function trackDatabaseQuery(query: string, duration: number, success: boolean) {
  if (duration > 1000) { // Log slow queries (>1s)
    captureMessage('Slow database query', 'warning', {
      tags: {
        type: 'slow_query',
        success: String(success),
      },
      extra: {
        query: query.substring(0, 500),
        duration_ms: duration,
      },
    });
  }
}

// Third-party API call tracking
export function trackExternalAPI(
  service: string,
  endpoint: string,
  duration: number,
  status: number,
  error?: Error
) {
  if (error || status >= 400) {
    captureException(error || new Error(`External API error: ${status}`), {
      tags: {
        type: 'external_api_error',
        service,
        endpoint,
        status: String(status),
      },
      extra: {
        duration_ms: duration,
      },
    });
  } else if (duration > 5000) { // Log slow external calls (>5s)
    captureMessage('Slow external API call', 'warning', {
      tags: {
        type: 'slow_external_api',
        service,
        endpoint,
      },
      extra: {
        duration_ms: duration,
      },
    });
  }
}
