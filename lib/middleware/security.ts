import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rate-limit';
import { detectBot } from './bot-detection';
import { validateRequest } from './request-validation';

export interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableRateLimiting: boolean;
  enableBotProtection: boolean;
  enableInputValidation: boolean;
  enableClickjackingProtection: boolean;
  enableMimeSniffingProtection: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
  blockedIPs: string[];
  blockedUserAgents: string[];
  maxRequestBodySize: number;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableCSP: true,
      enableHSTS: true,
      enableRateLimiting: true,
      enableBotProtection: true,
      enableInputValidation: true,
      enableClickjackingProtection: true,
      enableMimeSniffingProtection: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      allowedOrigins: [
        process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com',
        'https://www.xarastore.com',
        'http://localhost:3000',
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      blockedIPs: [],
      blockedUserAgents: [],
      maxRequestBodySize: 1024 * 1024 * 10, // 10MB
      ...config,
    };
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // 1. Block malicious IPs
    if (this.isBlockedIP(clientIP)) {
      return this.blockRequest(request, 'Blocked IP address');
    }

    // 2. Block malicious user agents
    if (this.isBlockedUserAgent(userAgent)) {
      return this.blockRequest(request, 'Blocked user agent');
    }

    // 3. Validate request method
    if (!this.isAllowedMethod(request.method)) {
      return new NextResponse('Method Not Allowed', { status: 405 });
    }

    // 4. Validate request origin
    if (!this.isAllowedOrigin(request)) {
      return this.blockRequest(request, 'Invalid origin');
    }

    // 5. Rate limiting
    if (this.config.enableRateLimiting) {
      const rateLimitResult = await rateLimit(clientIP, request.nextUrl.pathname);
      if (!rateLimitResult.success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          },
        });
      }
    }

    // 6. Bot detection and handling
    if (this.config.enableBotProtection) {
      const botDetection = detectBot(request);
      if (botDetection.isBot) {
        if (botDetection.isMalicious) {
          return this.blockRequest(request, 'Malicious bot detected');
        }
        // Apply special rules for legitimate bots
        this.applyBotRules(response, botDetection);
      }
    }

    // 7. Request body size validation
    if (request.body && this.config.maxRequestBodySize) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.config.maxRequestBodySize) {
        return new NextResponse('Request Entity Too Large', { status: 413 });
      }
    }

    // 8. Input validation for POST/PUT requests
    if (this.config.enableInputValidation && 
        (request.method === 'POST' || request.method === 'PUT')) {
      const validationResult = await validateRequest(request);
      if (!validationResult.valid) {
        return new NextResponse(validationResult.error, { status: 400 });
      }
    }

    // 9. Apply security headers
    this.applySecurityHeaders(response);

    // 10. Add security monitoring headers
    this.addMonitoringHeaders(response, clientIP);

    // 11. Log security event
    this.logSecurityEvent(request, clientIP, 'request_processed');

    return response;
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  private isBlockedIP(ip: string): boolean {
    // Check against blocked IPs list
    if (this.config.blockedIPs.includes(ip)) {
      return true;
    }

    // Check IP ranges (e.g., known malicious ranges)
    const blockedRanges = [
      '192.0.2.0/24', // Example range
      '198.51.100.0/24',
      '203.0.113.0/24',
    ];

    return blockedRanges.some(range => this.ipInRange(ip, range));
  }

  private isBlockedUserAgent(userAgent: string): boolean {
    const blockedPatterns = [
      // Malicious scanners
      /sqlmap/i,
      /nikto/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
      
      // Spam bots
      /spambot/i,
      /masscan/i,
      /zgrab/i,
      
      // Vulnerability scanners
      /wpscan/i,
      /joomscan/i,
      /drupal-scan/i,
      
      // Aggressive scrapers
      /scrapy/i,
      /screaming/i,
      /curl/i,
      /wget/i,
      
      // Add custom blocked agents from config
      ...this.config.blockedUserAgents.map(pattern => new RegExp(pattern, 'i')),
    ];

    return blockedPatterns.some(pattern => pattern.test(userAgent));
  }

  private isAllowedMethod(method: string): boolean {
    return this.config.allowedMethods.includes(method);
  }

  private isAllowedOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return true; // Same-origin requests

    return this.config.allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.startsWith(allowedOrigin.replace('https://', 'http://'))
    );
  }

  private ipInRange(ip: string, range: string): boolean {
    // Simplified IP range check - in production, use a proper IP library
    const [rangeIp, mask] = range.split('/');
    return ip === rangeIp; // Simplified check
  }

  private blockRequest(request: NextRequest, reason: string): NextResponse {
    this.logSecurityEvent(request, this.getClientIP(request), 'request_blocked', { reason });
    
    // Return a generic error to avoid information leakage
    return new NextResponse('Access Denied', { 
      status: 403,
      headers: {
        'X-Blocked-Reason': 'security-policy-violation',
      },
    });
  }

  private applyBotRules(response: NextResponse, botDetection: any) {
    // Apply stricter rate limits for bots
    response.headers.set('X-Bot-Detected', 'true');
    
    if (botDetection.botType === 'search_engine') {
      // Allow search engines but with some restrictions
      response.headers.set('X-Robots-Tag', 'index, follow');
    } else {
      // Block non-search engine bots from certain actions
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
  }

  private applySecurityHeaders(response: NextResponse) {
    // Content Security Policy
    if (this.config.enableCSP) {
      const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co *.google-analytics.com *.googletagmanager.com;
        style-src 'self' 'unsafe-inline' fonts.googleapis.com;
        img-src 'self' data: blob: *.supabase.co *.unsplash.com *.cloudinary.com *.google-analytics.com;
        font-src 'self' fonts.gstatic.com;
        connect-src 'self' *.supabase.co *.google-analytics.com;
        frame-src 'self';
        media-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
      `.replace(/\s+/g, ' ').trim();

      response.headers.set('Content-Security-Policy', cspHeader);
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Frame-Options (Clickjacking protection)
    if (this.config.enableClickjackingProtection) {
      response.headers.set('X-Frame-Options', 'DENY');
    }

    // X-Content-Type-Options (MIME sniffing protection)
    if (this.config.enableMimeSniffingProtection) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
      );
    }

    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // X-Powered-By (Remove server information)
    response.headers.set('X-Powered-By', 'Xarastore Platform');

    // Cache control for sensitive pages
    const sensitivePaths = ['/account', '/checkout', '/admin'];
    const path = response.headers.get('x-middleware-path') || '';
    
    if (sensitivePaths.some(p => path.startsWith(p))) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  }

  private addMonitoringHeaders(response: NextResponse, clientIP: string) {
    // Add request ID for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    response.headers.set('X-Request-ID', requestId);

    // Add security version
    response.headers.set('X-Security-Version', '1.0');

    // Add rate limit information
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99');
    response.headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + 3600).toString());
  }

  private logSecurityEvent(
    request: NextRequest,
    clientIP: string,
    eventType: string,
    metadata: any = {}
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: eventType,
      ip: clientIP,
      method: request.method,
      url: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ...metadata,
    };

    // In production, send to security monitoring system
    console.log('[SECURITY]', logEntry);

    // Send to security analytics endpoint
    fetch('/api/security/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // Silently fail if logging endpoint is unavailable
    });
  }

  // Public method to manually block an IP
  blockIP(ip: string, reason: string) {
    if (!this.config.blockedIPs.includes(ip)) {
      this.config.blockedIPs.push(ip);
      this.logSecurityEvent(
        {} as NextRequest,
        ip,
        'ip_blocked_manually',
        { reason }
      );
    }
  }

  // Public method to unblock an IP
  unblockIP(ip: string) {
    this.config.blockedIPs = this.config.blockedIPs.filter(bip => bip !== ip);
  }

  // Get current security configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance
let securityMiddleware: SecurityMiddleware | null = null;

export function getSecurityMiddleware(): SecurityMiddleware {
  if (!securityMiddleware) {
    securityMiddleware = new SecurityMiddleware();
  }
  return securityMiddleware;
}
