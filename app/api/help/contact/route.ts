import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message } = validation.data;

    // In production, this would:
    // 1. Save to database
    // 2. Send email notification
    // 3. Trigger support ticket creation
    
    // For now, simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log the contact request (in production, save to database)
    console.log('Contact form submission:', {
      name,
      email,
      phone,
      subject,
      message,
      timestamp: new Date().toISOString(),
      ip: request.ip,
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been received. We will respond within 24 hours.',
      reference: `SUP-${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process contact form',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
