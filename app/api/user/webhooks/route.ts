import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { randomBytes, createHmac } from 'crypto';

const webhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (webhooksError) return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });

    const maskedWebhooks = webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      enabled: w.enabled,
      createdAt: w.created_at,
      lastTriggeredAt: w.last_triggered_at,
      secret: w.secret ? '••••••••' + w.secret.slice(-4) : null,
    }));

    return NextResponse.json(maskedWebhooks);
  } catch (error: any) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validation = webhookSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });

    const { url, events } = validation.data;
    const secret = randomBytes(32).toString('hex');

    const testResult = await testWebhook(url, secret);
    if (!testResult.success) return NextResponse.json({ error: 'Webhook URL validation failed', details: testResult.error }, { status: 400 });

    const { data: webhook, error: createError } = await supabase
      .from('webhooks')
      .insert({ user_id: user.id, url, events, secret, enabled: true, created_at: new Date().toISOString() })
      .select()
      .single();

    if (createError) return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });

    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'webhook_created',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      metadata: { webhook_id: webhook.id },
    });

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      enabled: webhook.enabled,
      createdAt: webhook.created_at,
    });
  } catch (error: any) {
    console.error('Webhooks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const webhookId = url.pathname.split('/').pop();
    if (!webhookId) return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });

    const { data: existingWebhook } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single();

    if (!existingWebhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    const body = await request.json();
    const updates: any = { updated_at: new Date().toISOString() };
    if (body.url) updates.url = body.url;
    if (body.events) updates.events = body.events;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    const { data: webhook, error: updateError } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      updatedAt: webhook.updated_at,
    });
  } catch (error: any) {
    console.error('Webhooks PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const webhookId = url.pathname.split('/').pop();
    if (!webhookId) return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });

    const { error: deleteError } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', user.id);

    if (deleteError) return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });

    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'webhook_deleted',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      metadata: { webhook_id: webhookId },
    });

    return NextResponse.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error: any) {
    console.error('Webhooks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function testWebhook(url: string, secret: string): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = Date.now().toString();
    const payload = JSON.stringify({ test: true, timestamp });
    const signature = createHmac('sha256', secret).update(payload).digest('hex');

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Timestamp': timestamp }, body: payload });

    if (!response.ok) return { success: false, error: `Webhook returned status ${response.status}` };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reach webhook URL' };
  }
}
