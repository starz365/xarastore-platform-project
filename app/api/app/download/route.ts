import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  // Detect device type
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  // Get app store URLs from environment variables
  const iosUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/app/xarastore';
  const androidUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || 'https://play.google.com/store/apps/details?id=com.xarastore';

  // Redirect to appropriate store
  if (isIOS) {
    return NextResponse.redirect(iosUrl);
  } else if (isAndroid) {
    return NextResponse.redirect(androidUrl);
  }

  // If desktop or unknown, show choice page or redirect to website
  return NextResponse.redirect('/app');
}
