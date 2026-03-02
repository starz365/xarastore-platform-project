import { settingsMiddleware } from './middleware/settings';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Apply settings middleware first
  const settingsResponse = await settingsMiddleware(request);
  if (settingsResponse.status !== 200) {
    return settingsResponse;
  }

  // Continue normal request
  const response = NextResponse.next();

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co;
    style-src 'self' 'unsafe-inline' fonts.googleapis.com;
    img-src 'self' blob: data: *.supabase.co *.unsplash.com *.cloudinary.com;
    font-src 'self' fonts.gstatic.com;
    connect-src 'self' *.supabase.co;
    frame-src 'self';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
  `.replace(/\s+/g, ' ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Performance headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Cache Next static assets
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  // Cache public assets
  if (request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|css|js)$/)) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );
  }

  // API logging / rate-limit hook
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? 'unknown';
    console.log(`API request from ${ip}: ${request.nextUrl.pathname}`);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api/webhooks|_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
