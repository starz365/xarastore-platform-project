import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const timezoneSchema = z.object({
  timezone: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  try {
	const supabase = await createClient();
    const cookieStore = await cookies();
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
    const validation = timezoneSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { timezone } = validation.data;

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid timezone' },
        { status: 400 }
      );
    }

    // Get current preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Upsert timezone preference
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        timezone,
        theme: preferences?.theme || 'light',
        notifications: preferences?.notifications || {
          marketing: true,
          security: true,
          billing: true,
          updates: false,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Timezone update error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update timezone preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timezone,
    });
  } catch (error: any) {
    console.error('Timezone update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
