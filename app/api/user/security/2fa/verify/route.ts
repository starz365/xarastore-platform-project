import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticator } from 'otplib';
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
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and code are required' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA for user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_temp_secret: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('2FA enable error:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    // Log security event
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: '2fa_enabled',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
