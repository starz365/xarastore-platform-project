xarastore/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, fullName, phone } = validation.data;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (authError) {
      throw authError;
    }

    // Create user profile in database
    if (authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        phone: phone,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dc2626&color=fff`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Send welcome email (in production, use email service)
    await sendWelcomeEmail(email, fullName);

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      userId: authData.user?.id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    return NextResponse.json(
      {
        error: 'Registration failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function sendWelcomeEmail(email: string, name: string) {
  // In production, integrate with email service like SendGrid, Resend, etc.
  console.log(`Welcome email sent to ${email} for ${name}`);
  
  // Example with Resend (uncomment and configure in production):
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'Xarastore <welcome@xarastore.com>',
    to: email,
    subject: 'Welcome to Xarastore!',
    html: `
      <h1>Welcome to Xarastore, ${name}!</h1>
      <p>Thank you for registering. Your account has been created successfully.</p>
      <p>Start exploring amazing deals on <a href="https://xarastore.com">Xarastore</a>.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    `,
  });
  */
}
