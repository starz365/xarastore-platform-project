import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const siteSettingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  site_tagline: z.string().max(200).optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  favicon_url: z.string().url().optional().or(z.literal('')),
  contact_email: z.string().email().optional().or(z.literal('')),
  support_phone: z.string().optional(),
  business_address: z.string().max(500).optional(),
  currency: z.string().length(3),
  currency_symbol: z.string().max(10),
  tax_rate: z.number().min(0).max(1),
  shipping_free_threshold: z.number().min(0),
  shipping_standard_price: z.number().min(0),
  shipping_express_price: z.number().min(0),
  return_window_days: z.number().int().min(0),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  seo_keywords: z.string().max(500).optional(),
  social_facebook: z.string().url().optional().or(z.literal('')),
  social_twitter: z.string().url().optional().or(z.literal('')),
  social_instagram: z.string().url().optional().or(z.literal('')),
  social_tiktok: z.string().url().optional().or(z.literal('')),
  google_analytics_id: z.string().optional(),
  facebook_pixel_id: z.string().optional(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: isAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch all settings
    const [
      { data: siteSettings },
      { data: paymentSettings },
      { data: emailSettings },
      { data: notificationSettings },
      { data: featureFlags },
    ] = await Promise.all([
      supabase.from('site_settings').select('*').single(),
      supabase.from('payment_settings').select('*').single(),
      supabase.from('email_settings').select('*').single(),
      supabase.from('notification_settings').select('*').single(),
      supabase.from('feature_flags').select('*'),
    ]);

    return NextResponse.json({
      site_settings: siteSettings,
      payment_settings: paymentSettings,
      email_settings: emailSettings,
      notification_settings: notificationSettings,
      feature_flags: featureFlags || [],
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
        },
      }
    );

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: isAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'site_settings':
        const validatedSiteData = siteSettingsSchema.parse(data);
        result = await supabase
          .from('site_settings')
          .upsert(validatedSiteData)
          .select()
          .single();
        break;

      case 'payment_settings':
        result = await supabase
          .from('payment_settings')
          .upsert(data)
          .select()
          .single();
        break;

      case 'email_settings':
        result = await supabase
          .from('email_settings')
          .upsert(data)
          .select()
          .single();
        break;

      case 'notification_settings':
        result = await supabase
          .from('notification_settings')
          .upsert(data)
          .select()
          .single();
        break;

      case 'feature_flags':
        // Update multiple feature flags
        const updates = data.map((flag: any) =>
          supabase
            .from('feature_flags')
            .update({ enabled: flag.enabled })
            .eq('name', flag.name)
        );
        await Promise.all(updates);
        result = { data: data };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid settings type' },
          { status: 400 }
        );
    }

    if (result.error) {
      throw result.error;
    }

    // Invalidate cache
    const cacheKeys = ['site_settings', 'payment_settings', 'email_settings', 'notification_settings'];
    for (const key of cacheKeys) {
      await supabase.channel('settings-update').send({
        type: 'broadcast',
        event: 'invalidate',
        payload: { key },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.data,
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update settings', details: error.message },
      { status: 500 }
    );
  }
}
