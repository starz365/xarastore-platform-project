'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';

// Replace with your company logo path or base64
const COMPANY_LOGO_URL = 'https://yourdomain.com/logo.png';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch invoice + items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Optional: fetch user profile
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = height - margin;

    // Embed logo
    try {
      const logoBytes = await fetch(COMPANY_LOGO_URL).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.5);
      page.drawImage(logoImage, {
        x: margin,
        y: y - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.warn('Logo embed failed, skipping.');
    }

    // Header text
    y -= 50;
    page.drawText('INVOICE', { x: width - 150, y, size: 24, font: boldFont });
    y -= 30;

    page.drawText(`Invoice #: ${invoice.invoice_number}`, { x: margin, y, size: 12, font });
    y -= 15;
    page.drawText(`Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`, { x: margin, y, size: 12, font });
    y -= 15;
    page.drawText(`Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'N/A'}`, { x: margin, y, size: 12, font });

    // Bill To
    y -= 40;
    page.drawText('Bill To:', { x: width - 250, y, size: 12, font: boldFont });
    page.drawText(profile?.full_name || user.email, { x: width - 250, y - 15, size: 12, font });
    if (invoice.billing_address) {
      page.drawText(invoice.billing_address.street || '', { x: width - 250, y: y - 30, size: 12, font });
      page.drawText(`${invoice.billing_address.city || ''}, ${invoice.billing_address.state || ''} ${invoice.billing_address.postal_code || ''}`, { x: width - 250, y: y - 45, size: 12, font });
    }

    y -= 80;

    // Table header
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount'];
    const tableX = [margin, margin + 250, margin + 320, margin + 400];
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    y -= 15;
    tableHeaders.forEach((header, i) => {
      page.drawText(header, { x: tableX[i], y, size: 12, font: boldFont });
    });
    y -= 10;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

    // Table rows with automatic page breaks
    const items = invoice.invoice_items || [];
    for (const item of items) {
      if (y < 100) {
        page.addPage([595.28, 841.89]);
        y = height - margin;
        page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
        y -= 15;
        tableHeaders.forEach((header, i) => page.drawText(header, { x: tableX[i], y, size: 12, font: boldFont }));
        y -= 10;
        page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
      }

      page.drawText(item.description, { x: tableX[0], y, size: 12, font });
      page.drawText(item.quantity.toString(), { x: tableX[1], y, size: 12, font });
      page.drawText(`${invoice.currency || 'KES'} ${item.unit_price.toFixed(2)}`, { x: tableX[2], y, size: 12, font });
      page.drawText(`${invoice.currency || 'KES'} ${(item.quantity * item.unit_price).toFixed(2)}`, { x: tableX[3], y, size: 12, font });
      y -= 20;
    }

    // Totals
    y -= 10;
    const totalsX = tableX[2];
    page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    y -= 15;
    page.drawText('Subtotal:', { x: totalsX, y, size: 12, font: boldFont });
    page.drawText(`${invoice.currency || 'KES'} ${invoice.subtotal?.toFixed(2) || invoice.amount.toFixed(2)}`, { x: tableX[3], y, size: 12, font: boldFont });
    y -= 15;
    page.drawText('Tax:', { x: totalsX, y, size: 12, font: boldFont });
    page.drawText(`${invoice.currency || 'KES'} ${invoice.tax?.toFixed(2) || '0.00'}`, { x: tableX[3], y, size: 12, font: boldFont });
    y -= 15;
    page.drawText('Total:', { x: totalsX, y, size: 14, font: boldFont });
    page.drawText(`${invoice.currency || 'KES'} ${invoice.total?.toFixed(2) || invoice.amount.toFixed(2)}`, { x: tableX[3], y, size: 14, font: boldFont });

    // Footer
    page.drawText('Thank you for your business!', { x: margin, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('For questions, contact billing@xarastore.com', { x: margin, y: 35, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // Log download
    await supabase.from('invoice_downloads').insert({
      invoice_id: id,
      user_id: user.id,
      downloaded_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
    });

    // Return PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Invoice download error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
