import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const supabase = createClient();

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Cannot revoke current session
    if (session.id === token.value) {
      return NextResponse.json(
        { error: 'Cannot revoke current session' },
        { status: 400 }
      );
    }

    // Delete session
    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Session delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 }
      );
    }

    // Revoke the Supabase auth session
    await supabase.auth.admin.deleteUser(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
