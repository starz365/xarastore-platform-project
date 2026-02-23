import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { ratelimit } from '@/lib/redis/ratelimit';
import { sendWelcomeEmail } from '@/services/email/templates';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  preferences: z.array(z.enum(['deals', 'new_arrivals', 'tips', 'events'])).optional().default(['deals']),
  source: z.string().optional(),
  accept_marketing: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown';
    const { success } = await ratelimit.limit(`newsletter:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = subscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, name, preferences, source, accept_marketing } = validation.data;

    // Check if email already exists
    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return NextResponse.json(
          { error: 'This email is already subscribed' },
          { status: 409 }
        );
      } else if (existingSubscriber.status === 'unsubscribed') {
        // Reactivate unsubscribed user
        await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'active',
            preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscriber.id);

        await sendWelcomeEmail(email, name);
        
        return NextResponse.json({
          success: true,
          message: 'Successfully re-subscribed to newsletter',
          reactivated: true,
        });
      }
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create subscriber
    const { data: subscriber, error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name?.trim(),
        preferences,
        status: 'pending',
        verification_token: verificationToken,
        token_expires_at: tokenExpires.toISOString(),
        source: source || 'website',
        accept_marketing,
        ip_address: ip,
        user_agent: request.headers.get('user-agent')?.substring(0, 500) || 'unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Newsletter subscription error:', insertError);
      throw insertError;
    }

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);

    // Track subscription event
    await supabase.from('analytics_events').insert({
      type: 'newsletter_subscription',
      data: {
        email: email.toLowerCase(),
        source,
        preferences,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm your subscription',
      requires_verification: true,
    });
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    
    return NextResponse.json(
      {
        error: 'Subscription failed',
        message: 'Please try again later or contact support',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      );
    }

    // Verify token
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_token', token)
      .single();

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(subscriber.token_expires_at) < new Date()) {
      // Generate new token
      const newToken = generateVerificationToken();
      const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await supabase
        .from('newsletter_subscribers')
        .update({
          verification_token: newToken,
          token_expires_at: newExpires.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriber.id);

      // Send new verification email
      await sendVerificationEmail(subscriber.email, subscriber.name, newToken);

      return NextResponse.json({
        success: false,
        message: 'Verification link expired. A new link has been sent to your email.',
        requires_new_verification: true,
      });
    }

    // Activate subscriber
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        verified_at: new Date().toISOString(),
        verification_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    // Send welcome email
    await sendWelcomeEmail(subscriber.email, subscriber.name);

    // Track verification
    await supabase.from('analytics_events').insert({
      type: 'newsletter_verification',
      data: { email: subscriber.email },
      created_at: new Date().toISOString(),
    });

    // Redirect to success page or return success response
    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter!',
      email: subscriber.email,
    });
  } catch (error: any) {
    console.error('Newsletter verification error:', error);
    
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: 'Please try again or contact support',
      },
      { status: 500 }
    );
  }
}

function generateVerificationToken(): string {
  return Buffer.from(
    Math.random().toString(36).substring(2) + 
    Date.now().toString(36)
  ).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

async function sendVerificationEmail(email: string, name: string | undefined, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${token}&email=${encodeURIComponent(email)}`;
  
  // In production, use email service like Resend, SendGrid, etc.
  const emailData = {
    to: email,
    subject: 'Confirm your Xarastore newsletter subscription',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Confirm Your Subscription</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Xarastore</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">it's a deal</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #dc2626; margin-top: 0;">Confirm Your Subscription</h2>
              
              <p>Hello ${name || 'there'},</p>
              
              <p>Thank you for subscribing to the Xarastore newsletter! To start receiving our latest deals, new arrivals, and exclusive offers, please confirm your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Confirm Subscription
                </a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px;">
                ${verificationUrl}
              </p>
              
              <p>This link will expire in 24 hours. If you didn't request this subscription, please ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #666;">
                You're receiving this email because someone (hopefully you) signed up for the Xarastore newsletter with this email address.
              </p>
              
              <p style="font-size: 14px; color: #666;">
                Xarastore · Nairobi, Kenya · 
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/newsletter/unsubscribe" style="color: #dc2626;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  // Send email using your email service
  console.log('Sending verification email to:', email);
  
  // Example with Resend (uncomment in production):
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send(emailData);
  */
}
