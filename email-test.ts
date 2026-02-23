// app/api/email/test/route.ts
import { emailService } from '@/services/email/EmailService';
import { NextResponse } from 'next/server';

export async function POST() {
  await emailService.initialize();

  await emailService.sendEmail({
    to: 'test@example.com',
    subject: 'Test Email',
    html: '<h1>It works</h1>',
  });

  return NextResponse.json({ success: true });
}

