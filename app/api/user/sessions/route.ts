import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import UAParser from 'ua-parser-js';

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

    // Get all active sessions for user
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Format sessions
    const formattedSessions = sessions.map(session => {
      const parser = new UAParser(session.user_agent);
      const device = parser.getDevice();
      const browser = parser.getBrowser();
      const os = parser.getOS();

      return {
        id: session.id,
        device: device.type === 'mobile' ? 'Mobile' : device.type === 'tablet' ? 'Tablet' : 'Desktop',
        browser: browser.name || 'Unknown',
        os: os.name || 'Unknown',
        ip: session.ip_address,
        location: session.location || 'Unknown',
        lastActive: session.last_active_at || session.created_at,
        isCurrent: session.id === token.value,
      };
    });

    return NextResponse.json(formattedSessions);
  } catch (error: any) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
