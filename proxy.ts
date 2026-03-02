import { settingsMiddleware } from './middleware/settings';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Constants ────────────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';

/**
 * Sliding-window, in-memory rate limiter.
 *
 * NOTE: This is a single-instance store — correct for a single Node.js process
 * or a Vercel Edge function (requests are region-pinned).
 * For multi-region / multi-pod deployments, swap for a Redis/Upstash counter.
 */
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000;                           // 1 minute
const RATE_LIMIT_PAGE_MAX  = IS_PRODUCTION ? 120 : 500;        // page requests / window
const RATE_LIMIT_API_MAX   = IS_PRODUCTION ?  60 : 200;        // API requests  / window

/** Static asset extensions matched for aggressive caching. */
const STATIC_ASSET_RE = /\.(jpg|jpeg|png|gif|ico|svg|webp|avif|css|js|woff2?|ttf|eot)$/i;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Resolve the real client IP across common proxy / CDN headers. */
function getRealIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??                      // Cloudflare
    req.headers.get('x-real-ip') ??                             // Nginx / ALB
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? // Generic proxy
    req.ip ??
    'unknown'
  );
}

/**
 * Sliding-window rate limiter.
 * Returns `true` when the request is within limits, `false` when exceeded.
 */
function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/** Periodically prune expired entries to prevent unbounded memory growth. */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 5);

// ─── Content Security Policy ──────────────────────────────────────────────────

function buildCsp(nonce: string): string {
  const directives: Array<[string, string[]]> = [
    ['default-src',      ["'self'"]],
    ['script-src',       ["'self'", `'nonce-${nonce}'`, ...(IS_PRODUCTION ? [] : ["'unsafe-eval'"]), '*.supabase.co']],
    ['style-src',        ["'self'", "'unsafe-inline'", 'fonts.googleapis.com']],
    ['img-src',          ["'self'", 'blob:', 'data:', '*.supabase.co', '*.unsplash.com', '*.cloudinary.com']],
    ['font-src',         ["'self'", 'fonts.gstatic.com']],
    ['connect-src',      ["'self'", '*.supabase.co', ...(IS_PRODUCTION ? [] : ['ws://localhost:*'])]],
    ['media-src',        ["'self'"]],
    ['frame-src',        ["'none'"]],
    ['object-src',       ["'none'"]],
    ['base-uri',         ["'self'"]],
    ['form-action',      ["'self'"]],
    ['frame-ancestors',  ["'none'"]],
  ];

  if (IS_PRODUCTION) {
    directives.push(['upgrade-insecure-requests', []]);
  }

  return directives
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

// ─── Header Helpers ───────────────────────────────────────────────────────────

function applySecurityHeaders(response: NextResponse, csp: string): void {
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  if (IS_PRODUCTION) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

function applyCacheHeaders(pathname: string, response: NextResponse): void {
  if (pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  if (STATIC_ASSET_RE.test(pathname)) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );
    return;
  }

  if (pathname.startsWith('/api/')) {
    // Individual API routes are responsible for their own caching headers.
    response.headers.set('Cache-Control', 'no-store');
    return;
  }

  // HTML pages: never serve stale, but allow revalidation.
  response.headers.set('Cache-Control', 'no-cache, must-revalidate');
}

// ─── Rate-limit Response ──────────────────────────────────────────────────────

function tooManyRequestsResponse(ip: string, max: number): NextResponse {
  const retryAfterSec = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  const res = NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit of ${max} requests per minute exceeded. Retry after ${retryAfterSec}s.`,
      retryAfter: retryAfterSec,
    },
    { status: 429 }
  );
  res.headers.set('Retry-After', String(retryAfterSec));
  res.headers.set('X-RateLimit-Limit', String(max));
  res.headers.set('X-RateLimit-Reset', String(Date.now() + RATE_LIMIT_WINDOW_MS));
  console.warn(
    JSON.stringify({
      level: 'warn',
      type: 'rate_limit_exceeded',
      ip,
      timestamp: new Date().toISOString(),
    })
  );
  return res;
}

// ─── Structured Logger ────────────────────────────────────────────────────────

function logRequest(params: {
  requestId: string;
  method: string;
  pathname: string;
  ip: string;
  status?: number;
  durationMs: number;
  userAgent: string;
}): void {
  console.log(
    JSON.stringify({
      level: 'info',
      type: 'request',
      ...params,
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      env: process.env.NODE_ENV,
    })
  );
}

// ─── Proxy Function (Next.js 16+) ─────────────────────────────────────────────

/**
 * Named `proxy` export — required by Next.js 16.
 * This replaces the deprecated `middleware` export convention.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const ip = getRealIp(request);
  const requestId = crypto.randomUUID();
  const method = request.method;
  const userAgent = request.headers.get('user-agent') ?? '-';
  const isApiRoute = pathname.startsWith('/api/');

  // ── 1. Settings gate ─────────────────────────────────────────────────────
  try {
    const settingsResponse = await settingsMiddleware(request);
    if (settingsResponse.status !== 200) {
      return settingsResponse;
    }
  } catch (err) {
    // Non-fatal: log and continue serving.
    console.error(
      JSON.stringify({
        level: 'error',
        type: 'settings_middleware_error',
        requestId,
        path: pathname,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      })
    );
  }

  // ── 2. Rate limiting ──────────────────────────────────────────────────────
  const rateMax = isApiRoute ? RATE_LIMIT_API_MAX : RATE_LIMIT_PAGE_MAX;
  const rateLimitKey = `${ip}:${isApiRoute ? 'api' : 'page'}`;

  if (!checkRateLimit(rateLimitKey, rateMax)) {
    return tooManyRequestsResponse(ip, rateMax);
  }

  // ── 3. CSP nonce ──────────────────────────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // ── 4. Construct downstream response ─────────────────────────────────────
  //    Forward the nonce and request-id to server components via headers.
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-nonce': nonce,
        'x-request-id': requestId,
      }),
    },
  });

  // ── 5. Apply headers ──────────────────────────────────────────────────────
  applySecurityHeaders(response, csp);
  applyCacheHeaders(pathname, response);

  response.headers.set('X-Request-Id', requestId);
  response.headers.set('X-App-Version', APP_VERSION);

  // ── 6. Structured request logging (all routes) ───────────────────────────
  logRequest({
    requestId,
    method,
    pathname,
    ip,
    durationMs: Date.now() - startTime,
    userAgent,
  });

  return response;
}

// ─── Route Matcher ────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run the proxy on every path EXCEPT:
     *  - Next.js internals  (_next/*, _static/*, _vercel/*)
     *  - Webhook endpoints  (api/webhooks/*)
     *  - Well-known files   (favicon.ico, robots.txt, sitemap.xml, manifest.json)
     *
     * Keeping the matcher tight minimises unnecessary proxy overhead and cold
     * starts on serverless / edge deployments.
     */
    '/((?!api/webhooks|_next|_static|_vercel|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json).*)',
  ],
};
