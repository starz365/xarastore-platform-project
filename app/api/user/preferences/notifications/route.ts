import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const notificationsSchema = z.object({
  marketing: z.boolean(),
  security: z.boolean(),
  billing: z.boolean(),
  updates: z.boolean(),
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
    const validation = notificationsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const notifications = validation.data;

    // Get current preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Upsert notifications preference
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        notifications,
        theme: preferences?.theme || 'light',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Notifications update error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Update user's email notification settings in auth (if applicable)
    if (notifications.security || notifications.billing) {
      await supabase.auth.updateUser({
        data: {
          email_notifications: notifications,
        },
      });
    }

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error('Notifications update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
