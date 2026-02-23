import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/utils/settings';

export async function settingsMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Skip maintenance check for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/static')
  ) {
    return response;
  }

  try {
    const settings = await settingsManager.getSiteSettings();
    
    // Check maintenance mode
    if (settings.maintenance_mode && !request.nextUrl.pathname.startsWith('/maintenance')) {
      // Allow admin access even during maintenance
      const token = request.cookies.get('sb-access-token');
      if (!token) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }

    // Add settings headers for client-side use
    response.headers.set('x-site-name', settings.site_name);
    response.headers.set('x-currency', settings.currency);
    
    // Add CSP header with dynamic settings
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co ${settings.google_analytics_id ? 'www.googletagmanager.com' : ''};
      style-src 'self' 'unsafe-inline' fonts.googleapis.com;
      img-src 'self' blob: data: *.supabase.co *.unsplash.com *.cloudinary.com ${settings.logo_url ? new URL(settings.logo_url).hostname : ''};
      font-src 'self' fonts.gstatic.com;
      connect-src 'self' *.supabase.co;
      frame-src 'self' ${settings.social_facebook ? 'www.facebook.com' : ''};
      base-uri 'self';
      form-action 'self';
      object-src 'none';
    `.replace(/\s+/g, ' ');

    response.headers.set('Content-Security-Policy', cspHeader);

  } catch (error) {
    console.error('Settings middleware error:', error);
  }

  return response;
}
