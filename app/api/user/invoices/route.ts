import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('invoices').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).range(from, to);
    if (status) query = query.eq('status', status);

    const { data: invoices, count, error: invoicesError } = await query;
    if (invoicesError) return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });

    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.invoice_number,
      date: invoice.created_at,
      amount: parseFloat(invoice.amount),
      status: invoice.status,
      pdfUrl: invoice.pdf_url,
      subtotal: parseFloat(invoice.subtotal || invoice.amount),
      tax: parseFloat(invoice.tax || 0),
      total: parseFloat(invoice.total || invoice.amount),
      currency: invoice.currency || 'KES',
      paidAt: invoice.paid_at,
    }));

    return NextResponse.json({ invoices: formattedInvoices, pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
  } catch (error: any) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
