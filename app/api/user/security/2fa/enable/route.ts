import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { cookies } from 'next/headers';

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

    // Check if 2FA is already enabled
    const { data: profile } = await supabase
      .from('users')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', user.id)
      .single();

    if (profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();
    
    // Generate otpauth URL
    const service = 'Xarastore';
    const otpauth = authenticator.keyuri(user.email!, service, secret);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (will be verified before enabling)
    await supabase
      .from('users')
      .update({
        two_factor_secret: secret,
        two_factor_temp_secret: secret,
      })
      .eq('id', user.id);

    return NextResponse.json({
      secret,
      qrCode,
    });
  } catch (error: any) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
