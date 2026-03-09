import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import JSZip from 'jszip';
import { format } from 'date-fns';

const supabase = createClient();

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sb-access-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token.value);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all user data
    const [
      profileData,
      ordersData,
      apiKeysData,
      sessionsData,
      addressesData,
      wishlistData,
      reviewsData,
      securityEventsData,
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('orders').select('*').eq('user_id', user.id),
      supabase.from('api_keys').select('*').eq('user_id', user.id),
      supabase.from('user_sessions').select('*').eq('user_id', user.id),
      supabase.from('user_addresses').select('*').eq('user_id', user.id),
      supabase.from('wishlist').select('*, products(*)').eq('user_id', user.id),
      supabase.from('reviews').select('*').eq('user_id', user.id),
      supabase.from('security_events').select('*').eq('user_id', user.id),
    ]);

    // Create zip file
    const zip = new JSZip();

    // Add JSON files
    zip.file('profile.json', JSON.stringify(profileData.data, null, 2));
    zip.file('orders.json', JSON.stringify(ordersData.data, null, 2));
    zip.file('api_keys.json', JSON.stringify(apiKeysData.data, null, 2));
    zip.file('sessions.json', JSON.stringify(sessionsData.data, null, 2));
    zip.file('addresses.json', JSON.stringify(addressesData.data, null, 2));
    zip.file('wishlist.json', JSON.stringify(wishlistData.data, null, 2));
    zip.file('reviews.json', JSON.stringify(reviewsData.data, null, 2));
    zip.file('security_events.json', JSON.stringify(securityEventsData.data, null, 2));

    // Generate README
    const readme = `# Xarastore Data Export
Generated on: ${format(new Date(), 'PPP p')}
User ID: ${user.id}
Email: ${user.email}

This archive contains your personal data from Xarastore in accordance with GDPR Article 20 (right to data portability).

## Files included:
- profile.json: Your profile information
- orders.json: Your order history
- api_keys.json: Your API keys (masked)
- sessions.json: Your login sessions
- addresses.json: Your saved addresses
- wishlist.json: Your wishlist items
- reviews.json: Your product reviews
- security_events.json: Security-related events

For questions or support, contact privacy@xarastore.com
`;

    zip.file('README.txt', readme);

    // Generate zip
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Log export event
    await supabase.from('data_exports').insert({
      user_id: user.id,
      exported_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
    });

    // Return zip file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="xarastore-data-${format(new Date(), 'yyyy-MM-dd')}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
