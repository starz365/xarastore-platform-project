import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
	const supabase = await createClient();
    const { id } = await params;
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

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get invoice items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    return NextResponse.json({
      id: invoice.id,
      number: invoice.invoice_number,
      date: invoice.created_at,
      dueDate: invoice.due_date,
      amount: parseFloat(invoice.amount),
      status: invoice.status,
      pdfUrl: invoice.pdf_url,
      items: items || [],
      subtotal: parseFloat(invoice.subtotal || invoice.amount),
      tax: parseFloat(invoice.tax || 0),
      total: parseFloat(invoice.total || invoice.amount),
      currency: invoice.currency || 'KES',
      billingAddress: invoice.billing_address,
      paymentMethod: invoice.payment_method,
      paidAt: invoice.paid_at,
      notes: invoice.notes,
    });
  } catch (error: any) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
