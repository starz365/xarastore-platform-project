import { supabase } from '@/lib/supabase/client';
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/currency';

interface SMSOptions {
  to: string | string[];
  message: string;
  template?: string;
  data?: Record<string, any>;
  from?: string;
  type?: 'transactional' | 'promotional' | 'alert';
  priority?: 'high' | 'normal' | 'low';
}

interface SMSProvider {
  send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class SMSService {
  private providers: SMSProvider[] = [];
  private defaultProvider: SMSProvider | null = null;
  private isInitialized = false;
  private readonly retryAttempts = 2;
  private readonly retryDelay = 1000;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    // Load configured providers from database
    const { data: providers } = await supabase
      .from('sms_providers')
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

  private createProvider(config: any): SMSProvider | null {
    switch (config.type) {
      case 'africastalking':
        return new AfricasTalkingProvider(config);
      case 'twilio':
        return new TwilioProvider(config);
      case 'smpp':
        return new SMPPProvider(config);
      default:
        return null;
    }
  }

  private createFallbackProvider(): SMSProvider | null {
    if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
      return new AfricasTalkingProvider({
        apiKey: process.env.AFRICASTALKING_API_KEY,
        username: process.env.AFRICASTALKING_USERNAME,
        from: process.env.SMS_FROM || 'Xarastore',
      });
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return new TwilioProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.SMS_FROM || '+1234567890',
      });
    }

    return null;
  }

  async send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
    await this.initialize();

    if (this.providers.length === 0) {
      throw new Error('No SMS providers configured');
    }

    // Validate and format phone numbers
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const formattedRecipients: string[] = [];

    for (const phone of recipients) {
      if (!validatePhoneNumber(phone)) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
      formattedRecipients.push(formatPhoneNumber(phone));
    }

    // Prepare message
    let message = options.message;
    if (options.template && options.data) {
      message = await this.renderTemplate(options.template, options.data);
    }

    // Validate message length
    if (message.length > 1600) {
      throw new Error('SMS message too long (max 1600 characters)');
    }

    // Prepare SMS data
    const smsData = {
      to: formattedRecipients,
      message: message.trim(),
      from: options.from || process.env.SMS_FROM || 'Xarastore',
      type: options.type || 'transactional',
      priority: options.priority || 'normal',
    };

    // Try providers in order
    let lastError: string | undefined;
    const providersToTry = this.defaultProvider ? [this.defaultProvider, ...this.providers.filter(p => p !== this.defaultProvider)] : this.providers;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      for (const provider of providersToTry) {
        try {
          const result = await provider.send(smsData);
          
          if (result.success) {
            // Log successful SMS
            await this.logSMS({
              to: smsData.to,
              message: smsData.message,
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

    // Log failed SMS
    await this.logSMS({
      to: smsData.to,
      message: smsData.message,
      provider: 'unknown',
      status: 'failed',
      error: lastError,
    });

    return {
      success: false,
      error: lastError || 'All SMS providers failed',
    };
  }

  async sendBulk(smsList: SMSOptions[]): Promise<Array<{ success: boolean; phone: string; messageId?: string; error?: string }>> {
    const results = [];

    for (const sms of smsList) {
      try {
        const result = await this.send(sms);
        results.push({
          success: result.success,
          phone: Array.isArray(sms.to) ? sms.to.join(',') : sms.to,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          success: false,
          phone: Array.isArray(sms.to) ? sms.to.join(',') : sms.to,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getTemplate(name: string): Promise<string | null> {
    const { data: template } = await supabase
      .from('sms_templates')
      .select('content')
      .eq('name', name)
      .eq('enabled', true)
      .single();

    return template?.content || null;
  }

  async renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    let rendered = template;
    
    // Replace variables {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // Remove any remaining template tags
    rendered = rendered.replace(/{{.*?}}/g, '');

    return rendered;
  }

  private async logSMS(sms: {
    to: string | string[];
    message: string;
    provider: string;
    messageId?: string;
    status: 'sent' | 'failed';
    error?: string;
  }) {
    try {
      await supabase.from('sms_logs').insert({
        recipient: Array.isArray(sms.to) ? sms.to.join(',') : sms.to,
        message: sms.message.substring(0, 500), // Limit length
        provider: sms.provider,
        message_id: sms.messageId,
        status: sms.status,
        error: sms.error,
        sent_at: new Date().toISOString(),
        cost: this.calculateCost(sms.message, Array.isArray(sms.to) ? sms.to.length : 1),
      });
    } catch (error) {
      console.error('Failed to log SMS:', error);
    }
  }

  private calculateCost(message: string, recipientCount: number): number {
    // Calculate cost based on message segments
    const segments = Math.ceil(message.length / 160);
    const costPerSegment = 1.5; // KES per segment
    return segments * recipientCount * costPerSegment;
  }

  async getDeliveryStatus(messageId: string): Promise<{ status: string; deliveredAt?: string }> {
    const { data: log } = await supabase
      .from('sms_logs')
      .select('status, delivered_at')
      .eq('message_id', messageId)
      .single();

    if (!log) {
      throw new Error('SMS not found');
    }

    return {
      status: log.status,
      deliveredAt: log.delivered_at,
    };
  }

  async getStats(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('status, sent_at, cost')
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      sent: data.filter(d => d.status === 'sent').length,
      failed: data.filter(d => d.status === 'failed').length,
      totalCost: data.reduce((sum, log) => sum + (log.cost || 0), 0),
      byDay: data.reduce((acc: Record<string, { count: number; cost: number }>, log) => {
        const date = new Date(log.sent_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, cost: 0 };
        }
        acc[date].count += 1;
        acc[date].cost += log.cost || 0;
        return acc;
      }, {}),
      averageCostPerMessage: 0,
    };

    if (stats.total > 0) {
      stats.averageCostPerMessage = stats.totalCost / stats.total;
    }

    return stats;
  }

  async getBalance(): Promise<{ provider: string; balance: number; currency: string }[]> {
    const balances = [];

    for (const provider of this.providers) {
      if ('getBalance' in provider) {
        try {
          const balance = await (provider as any).getBalance();
          balances.push({
            provider: provider.constructor.name,
            ...balance,
          });
        } catch (error) {
          console.error(`Failed to get balance for ${provider.constructor.name}:`, error);
        }
      }
    }

    return balances;
  }
}

class AfricasTalkingProvider implements SMSProvider {
  private apiKey: string;
  private username: string;
  private from: string;

  constructor(config: { apiKey: string; username: string; from: string }) {
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.from = config.from;
  }

  async send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'apiKey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: this.username,
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          message: options.message,
          from: this.from,
        }),
      });

      const data = await response.json();

      if (data.SMSMessageData.Recipients[0].statusCode !== 101) {
        return {
          success: false,
          error: data.SMSMessageData.Recipients[0].status || 'Failed to send SMS',
        };
      }

      return {
        success: true,
        messageId: data.SMSMessageData.Recipients[0].messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const response = await fetch('https://api.africastalking.com/version1/user', {
        headers: {
          'apiKey': this.apiKey,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      return {
        balance: parseFloat(data.UserData.balance),
        currency: 'KES',
      };
    } catch (error) {
      throw new Error('Failed to get balance');
    }
  }
}

class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor(config: { accountSid: string; authToken: string; from: string }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.from = config.from;
  }

  async send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const results = [];

      for (const to of recipients) {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: to,
              From: this.from,
              Body: options.message,
            }),
          }
        );

        const data = await response.json();

        if (response.status !== 201) {
          return {
            success: false,
            error: data.message || 'Failed to send SMS',
          };
        }

        results.push(data.sid);
      }

      return {
        success: true,
        messageId: results[0],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

class SMPPProvider implements SMSProvider {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // SMPP implementation would go here
    // This is a simplified mock implementation
    try {
      // Simulate SMPP sending
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate a mock message ID
      const messageId = `smpp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
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

export const smsService = new SMSService();
