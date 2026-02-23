import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { ratelimit } from '@/lib/redis/ratelimit';
import { sendContactEmail } from '@/services/email/templates';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  phone: z.string().optional(),
  category: z.enum(['general', 'sales', 'support', 'technical', 'billing', 'other']).default('general'),
  order_id: z.string().optional(),
  attachment_url: z.string().url().optional(),
  consent: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and privacy policy',
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown';
    const { success } = await ratelimit.limit(`contact:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many contact attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message, phone, category, order_id, attachment_url, consent } = validation.data;
    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Save contact message to database
    const { data: contact, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        phone: phone?.trim(),
        category,
        order_id,
        attachment_url,
        ip_address: ip,
        user_agent: userAgent.substring(0, 500),
        status: 'new',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Contact message save error:', insertError);
      throw insertError;
    }

    // Send notification emails
    await Promise.all([
      // Send to customer (confirmation)
      sendContactConfirmation(email, name, subject, contact.id),
      // Send to support team
      sendContactToSupport(contact),
    ]);

    // Track contact event
    await supabase.from('analytics_events').insert({
      type: 'contact_form_submission',
      data: {
        category,
        has_order_id: !!order_id,
        contact_id: contact.id,
      },
      created_at: timestamp,
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully. We\'ll get back to you soon!',
      contact_id: contact.id,
      estimated_response: '24-48 hours',
    });
  } catch (error: any) {
    console.error('Contact API error:', error);
    
    // Log error
    await supabase.from('contact_errors').insert({
      error: error.message,
      endpoint: '/api/contact',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Message sending failed',
        message: 'Please try again later or email us directly at support@xarastore.com',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only allow authenticated admin users to view messages
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify admin token (in production, use JWT verification)
    const isAdmin = await verifyAdminToken(token);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'new';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: messages, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0),
      },
    });
  } catch (error: any) {
    console.error('Contact GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // In production, verify JWT token with your auth service
    // This is a simplified implementation
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

    // Check if user has admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return userRole?.role === 'admin';
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

async function sendContactConfirmation(email: string, name: string, subject: string, contactId: string) {
  const confirmationData = {
    to: email,
    subject: `We've received your message: ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Message Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Xarastore</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">it's a deal</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #dc2626; margin-top: 0;">Message Received</h2>
              
              <p>Hello ${name},</p>
              
              <p>Thank you for contacting Xarastore. We've received your message and our team will get back to you within 24-48 hours.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">Message Details:</p>
                <p style="margin: 5px 0;"><strong>Reference ID:</strong> ${contactId}</p>
                <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-KE')}</p>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ol>
                <li>Our support team will review your message</li>
                <li>You'll receive a response via email</li>
                <li>If needed, we may follow up for more details</li>
              </ol>
              
              <p>In the meantime, you can:</p>
              <ul>
                <li>Check our <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #dc2626;">Help Center</a> for quick answers</li>
                <li>Browse our <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop" style="color: #dc2626;">latest deals</a></li>
                <li>Track your <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders" style="color: #dc2626;">existing orders</a></li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #666;">
                <strong>Need urgent assistance?</strong><br>
                Call us at +254 700 123 456 (Mon-Fri, 8AM-6PM EAT)
              </p>
              
              <p style="font-size: 14px; color: #666;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  // Send email using your email service
  console.log('Sending contact confirmation to:', email);
  
  // Example with Resend:
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send(confirmationData);
  */
}

async function sendContactToSupport(contact: any) {
  const supportData = {
    to: process.env.SUPPORT_EMAIL || 'support@xarastore.com',
    subject: `New Contact Message: ${contact.subject} [${contact.id}]`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Message</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Message</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Contact ID</p>
                  <p style="margin: 0; font-weight: bold; font-size: 16px;">${contact.id}</p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Category</p>
                  <p style="margin: 0; font-weight: bold; font-size: 16px; text-transform: capitalize;">${contact.category}</p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Status</p>
                  <p style="margin: 0; font-weight: bold; font-size: 16px; color: #dc2626; text-transform: capitalize;">${contact.status}</p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Received</p>
                  <p style="margin: 0; font-weight: bold; font-size: 16px;">${new Date(contact.created_at).toLocaleString('en-KE')}</p>
                </div>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h3 style="color: #dc2626; margin-bottom: 15px;">Customer Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 150px;"><strong>Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${contact.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                      <a href="mailto:${contact.email}" style="color: #dc2626;">${contact.email}</a>
                    </td>
                  </tr>
                  ${contact.phone ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                      <a href="tel:${contact.phone}" style="color: #dc2626;">${contact.phone}</a>
                    </td>
                  </tr>
                  ` : ''}
                  ${contact.order_id ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Order ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                      <a href="${process.env.NEXT_PUBLIC_ADMIN_URL}/orders/${contact.order_id}" style="color: #dc2626;">${contact.order_id}</a>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h3 style="color: #dc2626; margin-bottom: 15px;">Message</h3>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #dc2626;">
                  <h4 style="margin-top: 0; color: #333;">${contact.subject}</h4>
                  <p style="margin: 0; white-space: pre-wrap;">${contact.message}</p>
                </div>
              </div>
              
              ${contact.attachment_url ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: #dc2626; margin-bottom: 15px;">Attachment</h3>
                <a href="${contact.attachment_url}" style="color: #dc2626; text-decoration: none; padding: 10px 15px; background-color: #f5f5f5; border-radius: 5px; display: inline-block;">
                  📎 Download Attachment
                </a>
              </div>
              ` : ''}
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 5px; border: 1px solid #bae6fd;">
                <h4 style="margin-top: 0; color: #0369a1;">Technical Details</h4>
                <table style="width: 100%; font-size: 12px;">
                  <tr>
                    <td style="padding: 5px;"><strong>IP Address:</strong> ${contact.ip_address}</td>
                    <td style="padding: 5px;"><strong>User Agent:</strong> ${contact.user_agent.substring(0, 50)}...</td>
                  </tr>
                </table>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_ADMIN_URL}/contacts/${contact.id}" 
                   style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View in Admin Panel
                </a>
                <p style="margin-top: 15px; font-size: 12px; color: #666;">
                  This message was automatically generated from the contact form.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  // Send to support team
  console.log('Sending contact alert to support team');
  
  // Example with Resend:
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send(supportData);
  */
}
