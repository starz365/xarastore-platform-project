import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

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

    // Get API keys
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('API keys fetch error:', keysError);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    // Mask keys
    const maskedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      prefix: key.key.substring(0, 8),
      createdAt: key.created_at,
      lastUsed: key.last_used_at,
      expiresAt: key.expires_at,
    }));

    return NextResponse.json(maskedKeys);
  } catch (error: any) {
    console.error('API keys API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { name } = body;

    // Generate API key
    const apiKey = `xa_${randomBytes(32).toString('hex')}`;
    
    // Hash the key for storage (never store raw key)
    const hashedKey = createHash('sha256').update(apiKey).digest('hex');

    // Store key in database
    const { data: keyRecord, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name || 'API Key',
        key: hashedKey,
        prefix: apiKey.substring(0, 8),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      })
      .select()
      .single();

    if (insertError) {
      console.error('API key insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Log security event
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'api_key_created',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      id: keyRecord.id,
      key: apiKey, // Only returned once
      name: keyRecord.name,
      prefix: keyRecord.prefix,
      createdAt: keyRecord.created_at,
      expiresAt: keyRecord.expires_at,
    });
  } catch (error: any) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url);
    const keyId = url.pathname.split('/').pop();

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      );
    }

    // Delete key
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('API key delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    // Log security event
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'api_key_revoked',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
