// services/email/EmailService.ts
import 'server-only';


import nodemailer from 'nodemailer';
import { settingsManager, EmailSettings } from '@/lib/utils/settings';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private settings: EmailSettings | null = null;

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.settings = await settingsManager.getEmailSettings();
      
      if (!this.settings?.smtp_host || !this.settings.smtp_username) {
        console.warn('Email settings not configured');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: this.settings.smtp_host,
        port: this.settings.smtp_port,
        secure: this.settings.smtp_encryption === 'ssl',
        auth: {
          user: this.settings.smtp_username,
          pass: this.settings.smtp_password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.settings) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const from = options.from || `${this.settings.from_name} <${this.settings.from_email}>`;
      
      const mailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendOrderConfirmation(order: any, customer: any): Promise<boolean> {
    if (!this.settings?.order_confirmation_enabled) {
      return false;
    }

    const html = this.generateOrderConfirmationTemplate(order, customer);
    
    return this.sendEmail({
      to: customer.email,
      subject: `Order Confirmation - ${order.order_number}`,
      html,
    });
  }

  async sendOrderShippedNotification(order: any, customer: any, trackingInfo: any): Promise<boolean> {
    if (!this.settings?.order_shipped_enabled) {
      return false;
    }

    const html = this.generateOrderShippedTemplate(order, customer, trackingInfo);
    
    return this.sendEmail({
      to: customer.email,
      subject: `Your Order Has Shipped - ${order.order_number}`,
      html,
    });
  }

  async sendOrderDeliveredNotification(order: any, customer: any): Promise<boolean> {
    if (!this.settings?.order_delivered_enabled) {
      return false;
    }

    const html = this.generateOrderDeliveredTemplate(order, customer);
    
    return this.sendEmail({
      to: customer.email,
      subject: `Your Order Has Been Delivered - ${order.order_number}`,
      html,
    });
  }

  async sendWelcomeEmail(user: any): Promise<boolean> {
    if (!this.settings?.welcome_email_enabled) {
      return false;
    }

    const html = this.generateWelcomeTemplate(user);
    
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Xarastore!',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    if (!this.settings?.password_reset_enabled) {
      return false;
    }

    const html = this.generatePasswordResetTemplate(resetLink);
    
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
    });
  }

  async sendNewsletter(subscribers: string[], subject: string, content: string): Promise<boolean> {
    if (!this.settings?.newsletter_enabled) {
      return false;
    }

    const html = this.generateNewsletterTemplate(content);
    const from = `${this.settings.newsletter_from_name} <${this.settings.newsletter_from_email}>`;
    
    // Send in batches to avoid rate limiting
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      batches.push(batch);
    }

    let successCount = 0;
    
    for (const batch of batches) {
      const success = await this.sendEmail({
        to: batch,
        from,
        subject,
        html,
      });
      
      if (success) successCount += batch.length;
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return successCount === subscribers.length;
  }

  private generateOrderConfirmationTemplate(order: any, customer: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Thank You for Your Order!</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p>Hello ${customer.full_name || customer.email},</p>
            
            <p>Your order <strong>${order.order_number}</strong> has been confirmed and is being processed.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #dc2626;">Order Summary</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order Date:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;"><strong>KES ${order.total.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>
            
            <h3 style="color: #dc2626;">Order Items</h3>
            ${order.items.map((item: any) => `
              <div style="display: flex; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <div style="flex: 1;">
                  <strong>${item.name}</strong>
                  ${item.variant ? `<br><small>Variant: ${item.variant}</small>` : ''}
                </div>
                <div style="text-align: right;">
                  <div>KES ${item.price.toLocaleString()} × ${item.quantity}</div>
                  <strong>KES ${(item.price * item.quantity).toLocaleString()}</strong>
                </div>
              </div>
            `).join('')}
            
            <div style="margin-top: 20px; padding: 15px; background-color: #f0f7ff; border-radius: 5px;">
              <h4 style="margin-top: 0; color: #1e40af;">Next Steps</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Your order is being processed</li>
                <li>You will receive a shipping notification when your order is dispatched</li>
                <li>Track your order from your account dashboard</li>
              </ol>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${order.id}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order Details
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions about your order, please contact our support team at 
              <a href="mailto:support@xarastore.com" style="color: #dc2626;">support@xarastore.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateOrderShippedTemplate(order: any, customer: any, trackingInfo: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Shipped</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Your Order Has Shipped! 🚚</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p>Hello ${customer.full_name || customer.email},</p>
            
            <p>Great news! Your order <strong>${order.order_number}</strong> has been shipped and is on its way to you.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #10b981;">Tracking Information</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tracking Number:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
                    <strong>${trackingInfo.tracking_number}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Carrier:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
                    ${trackingInfo.carrier}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Estimated Delivery:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${new Date(trackingInfo.estimated_delivery).toLocaleDateString()}
                  </td>
                </tr>
              </table>
            </div>
            
            ${trackingInfo.tracking_url ? `
              <div style="margin-top: 20px; text-align: center;">
                <a href="${trackingInfo.tracking_url}" 
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Track Your Package
                </a>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f0f7ff; border-radius: 5px;">
              <h4 style="margin-top: 0; color: #1e40af;">What to Expect Next</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>The carrier will attempt delivery at your shipping address</li>
                <li>You may receive delivery notifications from the carrier</li>
                <li>Please ensure someone is available to receive the package</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions about your shipment, please contact our support team at 
              <a href="mailto:support@xarastore.com" style="color: #10b981;">support@xarastore.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateOrderDeliveredTemplate(order: any, customer: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Delivered</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Your Order Has Been Delivered! 🎉</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p>Hello ${customer.full_name || customer.email},</p>
            
            <p>We're excited to let you know that your order <strong>${order.order_number}</strong> has been successfully delivered!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #dbeafe; color: #1e40af; padding: 20px; border-radius: 50%; display: inline-block; width: 100px; height: 100px; line-height: 60px;">
                <span style="font-size: 48px;">✓</span>
              </div>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #3b82f6;">Delivery Confirmation</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Delivered On:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date().toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Delivered To:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${order.shipping_address.street}, ${order.shipping_address.city}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f0fdf4; border-radius: 5px; border: 1px solid #bbf7d0;">
              <h4 style="margin-top: 0; color: #16a34a;">We'd Love Your Feedback!</h4>
              <p>Your experience is important to us. Please take a moment to review your products and help other shoppers make informed decisions.</p>
              
              <div style="text-align: center; margin-top: 15px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${order.id}/review" 
                   style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Write a Review
                </a>
              </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Continue Shopping
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any issues with your delivery or need to return an item, please contact our support team at 
              <a href="mailto:support@xarastore.com" style="color: #3b82f6;">support@xarastore.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeTemplate(user: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Xarastore</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Welcome to Xarastore! 👋</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p>Hello ${user.full_name || user.email},</p>
            
            <p>Welcome to Xarastore! We're thrilled to have you join our community of smart shoppers.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #fee2e2; color: #dc2626; padding: 20px; border-radius: 10px; display: inline-block;">
                <span style="font-size: 36px; display: block;">🎉</span>
                <strong style="display: block; margin-top: 10px;">Your Account is Ready</strong>
              </div>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #dc2626;">Get Started</h3>
              
              <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="background-color: #fee2e2; color: #dc2626; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
                  1
                </div>
                <div>
                  <strong>Complete Your Profile</strong>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Add your shipping addresses and preferences</p>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="background-color: #fee2e2; color: #dc2626; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
                  2
                </div>
                <div>
                  <strong>Explore Amazing Deals</strong>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Browse thousands of products at unbeatable prices</p>
                </div>
              </div>
              
              <div style="display: flex; align-items: center;">
                <div style="background-color: #fee2e2; color: #dc2626; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
                  3
                </div>
                <div>
                  <strong>Save Your Favorites</strong>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Create wishlists and get notified about price drops</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Start Shopping Now
              </a>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f0f7ff; border-radius: 5px;">
              <h4 style="margin-top: 0; color: #1e40af;">Need Help?</h4>
              <p style="margin: 10px 0;">Our customer support team is here to help you with any questions:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Email: <a href="mailto:support@xarastore.com" style="color: #dc2626;">support@xarastore.com</a></li>
                <li>Phone: <a href="tel:+254XXXXXXXXX" style="color: #dc2626;">+254 XXX XXX XXX</a></li>
                <li>Live Chat: Available on our website</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
              Happy shopping!<br>
              <strong>The Xarastore Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Reset Your Password</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p>We received a request to reset your Xarastore account password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #fee2e2; color: #dc2626; padding: 20px; border-radius: 10px; display: inline-block;">
                <span style="font-size: 36px; display: block;">🔐</span>
              </div>
            </div>
            
            <p>Click the button below to create a new password. This link will expire in 1 hour for security reasons.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
            </p>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #fef2f2; border-radius: 5px; border: 1px solid #fecaca;">
              <h4 style="margin-top: 0; color: #dc2626;">Important Security Information</h4>
              <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px;">
                <li>This link expires in 1 hour</li>
                <li>If you didn't request a password reset, you can safely ignore this email</li>
                <li>Never share your password or this link with anyone</li>
                <li>Our support team will never ask for your password</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please contact our support team at 
              <a href="mailto:support@xarastore.com" style="color: #dc2626;">support@xarastore.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateNewsletterTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xarastore Newsletter</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Xarastore Newsletter</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Exclusive deals just for you</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            ${content}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
              <p style="color: #666; font-size: 14px;">
                You're receiving this email because you subscribed to Xarastore newsletters.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/preferences" style="color: #dc2626;">Unsubscribe or manage preferences</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Xarastore. All rights reserved.</p>
            <p>Nairobi, Kenya</p>
          </div>
        </body>
      </html>
    `;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const emailService = EmailService.getInstance();
