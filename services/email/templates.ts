interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

class EmailService {
  private static instance: EmailService;
  private provider: 'resend' | 'sendgrid' | 'nodemailer' | 'console';

  private constructor() {
    this.provider = process.env.EMAIL_PROVIDER as any || 'console';
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async send(options: EmailOptions): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'resend':
          return await this.sendViaResend(options);
        case 'sendgrid':
          return await this.sendViaSendGrid(options);
        case 'nodemailer':
          return await this.sendViaNodemailer(options);
        case 'console':
        default:
          console.log('Email (console):', {
            to: options.to,
            subject: options.subject,
            html: options.html.substring(0, 200) + '...',
          });
          return true;
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  private async sendViaResend(options: EmailOptions): Promise<boolean> {
    // Implementation for Resend.com
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new (await import('resend')).Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'Xarastore <noreply@xarastore.com>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    });

    if (error) {
      throw error;
    }

    console.log('Email sent via Resend:', data);
    return true;
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<boolean> {
    // Implementation for SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);

    const msg = {
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || 'noreply@xarastore.com',
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    await sgMail.send(msg);
    return true;
  }

  private async sendViaNodemailer(options: EmailOptions): Promise<boolean> {
    // Implementation for Nodemailer (SMTP)
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: options.from || process.env.EMAIL_FROM || 'noreply@xarastore.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent via Nodemailer:', info.messageId);
    return true;
  }

  // Template methods
  async sendWelcomeEmail(email: string, name?: string) {
    const html = this.generateWelcomeEmail(name);
    
    return await this.send({
      to: email,
      subject: 'Welcome to Xarastore!',
      html,
      text: this.generateWelcomeEmailText(name),
    });
  }

  async sendOrderConfirmation(orderId: string, customerEmail: string, orderDetails: any) {
    const html = this.generateOrderConfirmationEmail(orderDetails);
    
    return await this.send({
      to: customerEmail,
      subject: `Order Confirmation #${orderId}`,
      html,
      text: this.generateOrderConfirmationEmailText(orderDetails),
    });
  }

  async sendPasswordReset(email: string, resetLink: string) {
    const html = this.generatePasswordResetEmail(resetLink);
    
    return await this.send({
      to: email,
      subject: 'Reset Your Xarastore Password',
      html,
      text: this.generatePasswordResetEmailText(resetLink),
    });
  }

  async sendNewsletterWelcome(email: string, name?: string) {
    const html = this.generateNewsletterWelcomeEmail(name);
    
    return await this.send({
      to: email,
      subject: 'Welcome to Xarastore Newsletter!',
      html,
      text: this.generateNewsletterWelcomeEmailText(name),
    });
  }

  async sendContactConfirmation(email: string, name: string, subject: string, contactId: string) {
    const html = this.generateContactConfirmationEmail(name, subject, contactId);
    
    return await this.send({
      to: email,
      subject: `We've received your message: ${subject}`,
      html,
      text: this.generateContactConfirmationEmailText(name, subject, contactId),
    });
  }

  // Template generators
  private generateWelcomeEmail(name?: string): string {
    const greeting = name ? `Hello ${name},` : 'Hello,';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to Xarastore</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
            }
            .header {
              background: linear-gradient(to right, #dc2626, #991b1b);
              padding: 40px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px;
            }
            .button {
              display: inline-block;
              background-color: #dc2626;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .feature {
              display: flex;
              align-items: center;
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .feature-icon {
              font-size: 24px;
              margin-right: 15px;
            }
            .footer {
              background-color: #f5f5f5;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media (max-width: 600px) {
              .content {
                padding: 20px;
              }
              .header {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Xarastore</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">it's a deal</p>
            </div>
            
            <div class="content">
              <h2 style="color: #dc2626; margin-top: 0;">${greeting}</h2>
              
              <p>Welcome to Xarastore! We're excited to have you join our community of savvy shoppers.</p>
              
              <p>Your account has been successfully created. Now you can:</p>
              
              <div class="feature">
                <div class="feature-icon">🛍️</div>
                <div>
                  <h3 style="margin: 0;">Shop Amazing Deals</h3>
                  <p style="margin: 5px 0 0 0;">Browse thousands of products at unbeatable prices</p>
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">⚡</div>
                <div>
                  <h3 style="margin: 0;">Fast Checkout</h3>
                  <p style="margin: 5px 0 0 0;">Save your details for quicker purchases</p>
                </div>
              </div>
              
              <div class="feature">
                <div class="feature-icon">📦</div>
                <div>
                  <h3 style="margin: 0;">Track Orders</h3>
                  <p style="margin: 5px 0 0 0;">Monitor your deliveries in real-time</p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop" class="button">
                  Start Shopping Now
                </a>
              </div>
              
              <p><strong>Need help?</strong> Check out our <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #dc2626;">Help Center</a> or contact our support team.</p>
            </div>
            
            <div class="footer">
              <p>Xarastore · Nairobi, Kenya</p>
              <p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/legal/privacy" style="color: #666; margin: 0 10px;">Privacy Policy</a> |
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/legal/terms" style="color: #666; margin: 0 10px;">Terms of Service</a> |
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #666; margin: 0 10px;">Help Center</a>
              </p>
              <p>This email was sent to ${name ? name + ' ' : ''}&lt;${this.maskEmail(email)}&gt;</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(name?: string): string {
    return `
Welcome to Xarastore!

${name ? `Hello ${name},` : 'Hello,'}

Thank you for creating an account with Xarastore! We're excited to have you join our community.

With your new account, you can:
- Shop thousands of amazing deals
- Save items to your wishlist
- Track your orders in real-time
- Enjoy faster checkout

Get started: ${process.env.NEXT_PUBLIC_APP_URL}/shop

Need help? Visit our Help Center: ${process.env.NEXT_PUBLIC_APP_URL}/help

Best regards,
The Xarastore Team

---
Xarastore · Nairobi, Kenya
Privacy Policy: ${process.env.NEXT_PUBLIC_APP_URL}/legal/privacy
Terms of Service: ${process.env.NEXT_PUBLIC_APP_URL}/legal/terms
Unsubscribe from marketing emails: ${process.env.NEXT_PUBLIC_APP_URL}/account/preferences
    `;
  }

  private generateOrderConfirmationEmail(orderDetails: any): string {
    const { orderId, items, total, shippingAddress, estimatedDelivery } = orderDetails;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Order Confirmation #${orderId}</title>
          <style>
            /* Same styles as welcome email, optimized for order confirmation */
          </style>
        </head>
        <body>
          <!-- Order confirmation HTML template -->
        </body>
      </html>
    `;
  }

  private generateOrderConfirmationEmailText(orderDetails: any): string {
    const { orderId, items, total, shippingAddress, estimatedDelivery } = orderDetails;
    
    return `
Order Confirmation #${orderId}

Thank you for your order! We're getting it ready to be shipped.

Order Details:
${items.map((item: any, index: number) => 
  `${index + 1}. ${item.name} - ${item.quantity} × KES ${item.price}`
).join('\n')}

Total: KES ${total}

Shipping to:
${shippingAddress.name}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state}
${shippingAddress.postal_code}

Estimated Delivery: ${estimatedDelivery}

Track your order: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${orderId}

Need help with your order?
Contact support: ${process.env.SUPPORT_EMAIL}
Call us: +254 700 123 456

Thank you for shopping with Xarastore!
    `;
  }

  private generatePasswordResetEmail(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Reset Your Password</title>
          <style>
            /* Password reset email styles */
          </style>
        </head>
        <body>
          <!-- Password reset HTML template -->
        </body>
      </html>
    `;
  }

  private generatePasswordResetEmailText(resetLink: string): string {
    return `
Reset Your Xarastore Password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

For security reasons, never share this link with anyone.

Need help? Contact our support team.

Best regards,
The Xarastore Team
    `;
  }

  private generateNewsletterWelcomeEmail(name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to Xarastore Newsletter</title>
          <style>
            /* Newsletter welcome email styles */
          </style>
        </head>
        <body>
          <!-- Newsletter welcome HTML template -->
        </body>
      </html>
    `;
  }

  private generateNewsletterWelcomeEmailText(name?: string): string {
    return `
Welcome to Xarastore Newsletter!

${name ? `Hello ${name},` : 'Hello,'}

Thank you for subscribing to the Xarastore newsletter! You'll now be among the first to know about:

🔥 Hot deals and flash sales
🆕 New product arrivals
💡 Shopping tips and guides
🎉 Exclusive member-only offers

Your first newsletter will arrive soon. In the meantime, check out our latest deals:

${process.env.NEXT_PUBLIC_APP_URL}/deals

To update your preferences or unsubscribe, visit:
${process.env.NEXT_PUBLIC_APP_URL}/account/newsletter-preferences

Happy shopping!
The Xarastore Team
    `;
  }

  private generateContactConfirmationEmail(name: string, subject: string, contactId: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Message Received</title>
          <style>
            /* Contact confirmation email styles */
          </style>
        </head>
        <body>
          <!-- Contact confirmation HTML template -->
        </body>
      </html>
    `;
  }

  private generateContactConfirmationEmailText(name: string, subject: string, contactId: string): string {
    return `
Message Received

Hello ${name},

Thank you for contacting Xarastore. We've received your message and our team will get back to you within 24-48 hours.

Message Details:
Reference ID: ${contactId}
Subject: ${subject}
Submitted: ${new Date().toLocaleString('en-KE')}

What happens next?
1. Our support team will review your message
2. You'll receive a response via email
3. If needed, we may follow up for more details

In the meantime, you can:
- Check our Help Center: ${process.env.NEXT_PUBLIC_APP_URL}/help
- Browse latest deals: ${process.env.NEXT_PUBLIC_APP_URL}/shop
- Track existing orders: ${process.env.NEXT_PUBLIC_APP_URL}/account/orders

Need urgent assistance?
Call us at +254 700 123 456 (Mon-Fri, 8AM-6PM EAT)

This is an automated message. Please do not reply to this email.

Best regards,
The Xarastore Team
    `;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();

// Helper function to send specific email types
export async function sendWelcomeEmail(email: string, name?: string) {
  return await emailService.sendWelcomeEmail(email, name);
}

export async function sendOrderConfirmation(orderId: string, customerEmail: string, orderDetails: any) {
  return await emailService.sendOrderConfirmation(orderId, customerEmail, orderDetails);
}

export async function sendContactEmail(to: string, subject: string, html: string) {
  return await emailService.send({
    to,
    subject,
    html,
  });
}

export async function sendContactConfirmation(email: string, name: string, subject: string, contactId: string) {
  return await emailService.sendContactConfirmation(email, name, subject, contactId);
}
