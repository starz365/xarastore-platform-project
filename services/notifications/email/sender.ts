import { supabase } from '@/lib/supabase/client';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  replyTo?: string;
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface EmailProvider {
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class EmailService {
  private providers: EmailProvider[] = [];
  private defaultProvider: EmailProvider | null = null;
  private isInitialized = false;
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    // Load configured providers from database
    const { data: providers } = await supabase
      .from('email_providers')
      .select('*')
      .eq('enabled', true)
      .order('priority');

    if (providers && providers.length > 0) {
      for (const providerConfig of providers) {
        const provider = this.createProvider(providerConfig);
        if (provider) {
          this.providers.push(provider);
          if (providerConfig.is_default) {
            this.defaultProvider = provider;
          }
        }
      }
    }

    // Fallback to environment-configured provider
    if (this.providers.length === 0) {
      const fallbackProvider = this.createFallbackProvider();
      if (fallbackProvider) {
        this.providers.push(fallbackProvider);
        this.defaultProvider = fallbackProvider;
      }
    }

    this.isInitialized = true;
  }

  private createProvider(config: any): EmailProvider | null {
    switch (config.type) {
      case 'resend':
        return new ResendProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'smtp':
        return new SMTPProvider(config);
      default:
        return null;
    }
  }

  private createFallbackProvider(): EmailProvider | null {
    if (process.env.RESEND_API_KEY) {
      return new ResendProvider({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM || 'Xarastore <noreply@xarastore.com>',
      });
    }

    if (process.env.SENDGRID_API_KEY) {
      return new SendGridProvider({
        apiKey: process.env.SENDGRID_API_KEY,
        from: process.env.EMAIL_FROM || 'noreply@xarastore.com',
      });
    }

    if (process.env.SMTP_HOST) {
      return new SMTPProvider({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        from: process.env.EMAIL_FROM || 'noreply@xarastore.com',
      });
    }

    return null;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
    await this.initialize();

    if (this.providers.length === 0) {
      throw new Error('No email providers configured');
    }

    // Validate email addresses
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const email of recipients) {
      if (!this.validateEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Prepare email data
    const emailData = {
      ...options,
      to: recipients,
      from: process.env.EMAIL_FROM || 'Xarastore <noreply@xarastore.com>',
      subject: options.subject.trim(),
      data: options.data || {},
    };

    // Try providers in order
    let lastError: string | undefined;
    const providersToTry = this.defaultProvider ? [this.defaultProvider, ...this.providers.filter(p => p !== this.defaultProvider)] : this.providers;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      for (const provider of providersToTry) {
        try {
          const result = await provider.send(emailData);
          
          if (result.success) {
            // Log successful email
            await this.logEmail({
              to: emailData.to,
              subject: emailData.subject,
              template: emailData.template,
              provider: provider.constructor.name,
              messageId: result.messageId,
              status: 'sent',
            });

            return {
              success: true,
              messageId: result.messageId,
              provider: provider.constructor.name,
            };
          } else {
            lastError = result.error;
          }
        } catch (error: any) {
          lastError = error.message;
        }

        // Wait before retrying with next provider
        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    // Log failed email
    await this.logEmail({
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      provider: 'unknown',
      status: 'failed',
      error: lastError,
    });

    return {
      success: false,
      error: lastError || 'All email providers failed',
    };
  }

  async sendBulk(emails: EmailOptions[]): Promise<Array<{ success: boolean; email: string; messageId?: string; error?: string }>> {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push({
          success: result.success,
          email: Array.isArray(email.to) ? email.to.join(',') : email.to,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          success: false,
          email: Array.isArray(email.to) ? email.to.join(',') : email.to,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getTemplate(name: string): Promise<string | null> {
    const { data: template } = await supabase
      .from('email_templates')
      .select('content')
      .eq('name', name)
      .eq('enabled', true)
      .single();

    return template?.content || null;
  }

  async renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    // Simple template rendering
    let rendered = template;
    
    // Replace variables {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // Replace if conditions {% if condition %}...{% endif %}
    const ifRegex = /{%\s*if\s*(.+?)\s*%}([\s\S]*?){%\s*endif\s*%}/g;
    rendered = rendered.replace(ifRegex, (match, condition, content) => {
      // Simple condition evaluation
      const value = this.evaluateCondition(condition, data);
      return value ? content : '';
    });

    // Replace loops {% for item in items %}...{% endfor %}
    const forRegex = /{%\s*for\s*(\w+)\s+in\s+(\w+)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;
    rendered = rendered.replace(forRegex, (match, itemVar, arrayVar, content) => {
      const array = data[arrayVar] || [];
      return array.map((item: any) => {
        let itemContent = content;
        const itemRegex = new RegExp(`{{${itemVar}\\.(\\w+)}}`, 'g');
        itemContent = itemContent.replace(itemRegex, (match, prop) => {
          return item[prop] || '';
        });
        return itemContent;
      }).join('');
    });

    return rendered;
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Simple condition parser
    const operators = ['==', '!=', '>', '<', '>=', '<=', 'in'];
    
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        
        let leftValue = data[left];
        let rightValue = right;
        
        // Check if right is a string literal
        if (right.startsWith("'") && right.endsWith("'")) {
          rightValue = right.slice(1, -1);
        } else if (right.startsWith('"') && right.endsWith('"')) {
          rightValue = right.slice(1, -1);
        } else {
          rightValue = data[right];
        }

        switch (op) {
          case '==': return leftValue == rightValue;
          case '!=': return leftValue != rightValue;
          case '>': return leftValue > rightValue;
          case '<': return leftValue < rightValue;
          case '>=': return leftValue >= rightValue;
          case '<=': return leftValue <= rightValue;
          case 'in': return Array.isArray(rightValue) && rightValue.includes(leftValue);
        }
      }
    }

    // If no operator, check truthiness
    return !!data[condition];
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async logEmail(email: {
    to: string | string[];
    subject: string;
    template: string;
    provider: string;
    messageId?: string;
    status: 'sent' | 'failed';
    error?: string;
  }) {
    try {
      await supabase.from('email_logs').insert({
        recipient: Array.isArray(email.to) ? email.to.join(',') : email.to,
        subject: email.subject,
        template: email.template,
        provider: email.provider,
        message_id: email.messageId,
        status: email.status,
        error: email.error,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{ status: string; deliveredAt?: string; openedAt?: string; clickedAt?: string }> {
    const { data: log } = await supabase
      .from('email_logs')
      .select('status, delivered_at, opened_at, clicked_at')
      .eq('message_id', messageId)
      .single();

    if (!log) {
      throw new Error('Email not found');
    }

    return {
      status: log.status,
      deliveredAt: log.delivered_at,
      openedAt: log.opened_at,
      clickedAt: log.clicked_at,
    };
  }

  async getStats(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('email_logs')
      .select('status, template, sent_at')
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      sent: data.filter(d => d.status === 'sent').length,
      failed: data.filter(d => d.status === 'failed').length,
      byTemplate: data.reduce((acc: Record<string, number>, log) => {
        acc[log.template] = (acc[log.template] || 0) + 1;
        return acc;
      }, {}),
      byDay: data.reduce((acc: Record<string, number>, log) => {
        const date = new Date(log.sent_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),
    };

    return stats;
  }
}

class ResendProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(config: { apiKey: string; from: string }) {
    this.apiKey = config.apiKey;
    this.from = config.from;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: await this.renderTemplate(options.template, options.data),
          reply_to: options.replyTo,
          bcc: options.bcc,
          attachments: options.attachments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send email via Resend',
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    const emailService = new EmailService();
    const templateContent = await emailService.getTemplate(template);
    if (!templateContent) {
      throw new Error(`Template not found: ${template}`);
    }
    return emailService.renderTemplate(templateContent, data);
  }
}

class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(config: { apiKey: string; from: string }) {
    this.apiKey = config.apiKey;
    this.from = config.from;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: Array.isArray(options.to) ? options.to.map(email => ({ email })) : [{ email: options.to }],
            bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.map(email => ({ email })) : [{ email: options.bcc }]) : undefined,
          }],
          from: { email: this.from },
          subject: options.subject,
          content: [{
            type: 'text/html',
            value: await this.renderTemplate(options.template, options.data),
          }],
          attachments: options.attachments?.map(att => ({
            content: att.content.toString('base64'),
            filename: att.filename,
            type: att.contentType,
            disposition: 'attachment',
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: error || 'Failed to send email via SendGrid',
        };
      }

      const messageId = response.headers.get('x-message-id');

      return {
        success: true,
        messageId: messageId || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    const emailService = new EmailService();
    const templateContent = await emailService.getTemplate(template);
    if (!templateContent) {
      throw new Error(`Template not found: ${template}`);
    }
    return emailService.renderTemplate(templateContent, data);
  }
}

class SMTPProvider implements EmailProvider {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // In production, you would use a real SMTP library like nodemailer
    // This is a simplified implementation
    try {
      // Simulate SMTP sending
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate a mock message ID
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const emailService = new EmailService();
