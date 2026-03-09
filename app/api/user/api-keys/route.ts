import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id,email,full_name,avatar_url,role,email_verified,two_factor_enabled,created_at,last_login_at,last_login_ip,last_login_user_agent')
      .eq('id', user.id)
      .single();

    if (profileError) return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });

    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('created_at,ip_address,user_agent')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastSession = sessions?.[0];

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      emailVerified: profile.email_verified,
      twoFactorEnabled: profile.two_factor_enabled,
      createdAt: profile.created_at,
      lastLoginAt: lastSession?.created_at || profile.last_login_at,
      lastLoginIp: lastSession?.ip_address || profile.last_login_ip,
      lastLoginUserAgent: lastSession?.user_agent || profile.last_login_user_agent,
    });
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const avatar = formData.get('avatar') as File | null;

    const validation = profileUpdateSchema.safeParse({ fullName, email });
    if (!validation.success) return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });

    let avatarUrl: string | null = null;
    if (avatar && avatar.size > 0) {
      const fileExt = avatar.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('user-content').upload(filePath, avatar, { cacheControl: '3600', upsert: false });
      if (uploadError) return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });

      const { data: { publicUrl } } = supabase.storage.from('user-content').getPublicUrl(filePath);
      avatarUrl = publicUrl;
    }

    if (email && email !== user.email) {
      const { error: updateError } = await supabase.auth.updateUser({ email });
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const updates: any = {};
    if (fullName) updates.full_name = fullName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);
      if (updateError) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    return NextResponse.json({ success: true, user: { id: profile.id, email: profile.email, fullName: profile.full_name, avatarUrl: profile.avatar_url, role: profile.role, emailVerified: profile.email_verified, twoFactorEnabled: profile.two_factor_enabled, createdAt: profile.created_at } });
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
