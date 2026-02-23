import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function dealsMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Cache deals pages aggressively
  if (pathname.startsWith('/deals')) {
    const response = NextResponse.next();
    
    // Cache for 5 minutes, stale while revalidate for 1 hour
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    );
    
    return response;
  }
  
  return NextResponse.next();
}
