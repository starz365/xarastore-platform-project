import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const themeSchema = z.object({
  theme: z.enum(['light', 'dark']),
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
    const validation = themeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { theme } = validation.data;

    // Upsert theme preference
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        theme,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Theme update error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update theme preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      theme,
    });
  } catch (error: any) {
    console.error('Theme update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
