import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (webhookError || !webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    const testPayload = { event: 'test', timestamp: Date.now(), data: { message: 'This is a test webhook from Xarastore' } };
    const timestamp = Date.now().toString();
    const payload = JSON.stringify(testPayload);
    const signature = createHmac('sha256', webhook.secret).update(payload).digest('hex');

    const response = await fetch(webhook.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Timestamp': timestamp, 'User-Agent': 'Xarastore-Webhook/1.0' }, body: payload });
    const responseBody = await response.text();

    await supabase.from('webhook_deliveries').insert({
      webhook_id: id,
      event: 'test',
      payload: testPayload,
      response_status: response.status,
      response_body: responseBody,
      success: response.ok,
      duration_ms: 0,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: response.ok, status: response.status, body: responseBody });
  } catch (error: any) {
    console.error('Webhook test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
