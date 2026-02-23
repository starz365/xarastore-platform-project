import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

interface ValidatedWebhook {
  isValid: boolean;
  subscriptionId?: string;
  eventType: string;
  payload: any;
  signature?: string;
  timestamp: string;
  error?: string;
}

interface ValidationRules {
  requireSignature: boolean;
  maxAge: number; // in seconds
  allowedEvents: string[];
  requiredFields: string[];
  payloadSizeLimit: number; // in bytes
}

export class WebhookValidator {
  private static instance: WebhookValidator;
  private defaultRules: ValidationRules = {
    requireSignature: true,
    maxAge: 300, // 5 minutes
    allowedEvents: [],
    requiredFields: ['type', 'data', 'timestamp'],
    payloadSizeLimit: 1024 * 1024, // 1MB
  };

  private constructor() {}

  static getInstance(): WebhookValidator {
    if (!WebhookValidator.instance) {
      WebhookValidator.instance = new WebhookValidator();
    }
    return WebhookValidator.instance;
  }

  async validate(
    headers: Record<string, string>,
    body: any,
    subscriptionId?: string
  ): Promise<ValidatedWebhook> {
    try {
      // Parse payload
      const payload = typeof body === 'string' ? JSON.parse(body) : body;
      
      // Get subscription if ID provided
      let subscription = null;
      if (subscriptionId) {
        subscription = await this.getSubscription(subscriptionId);
      } else if (headers['x-webhook-id']) {
        subscription = await this.getSubscriptionByWebhookId(headers['x-webhook-id']);
      }

      // Apply validation rules
      const rules = await this.getValidationRules(subscription);

      // Validate basic structure
      const structureValidation = this.validateStructure(payload, rules);
      if (!structureValidation.isValid) {
        return {
          isValid: false,
          eventType: payload.type || 'unknown',
          payload,
          timestamp: new Date().toISOString(),
          error: structureValidation.error,
        };
      }

      // Validate timestamp
      const timestampValidation = this.validateTimestamp(payload.timestamp, rules.maxAge);
      if (!timestampValidation.isValid) {
        return {
          isValid: false,
          eventType: payload.type,
          payload,
          timestamp: payload.timestamp,
          error: timestampValidation.error,
        };
      }

      // Validate event type
      const eventValidation = this.validateEventType(payload.type, rules.allowedEvents);
      if (!eventValidation.isValid) {
        return {
          isValid: false,
          eventType: payload.type,
          payload,
          timestamp: payload.timestamp,
          error: eventValidation.error,
        };
      }

      // Validate signature if required
      if (rules.requireSignature && subscription) {
        const signature = headers['x-webhook-signature'] || headers['x-signature'] || payload.signature;
        
        if (!signature) {
          return {
            isValid: false,
            eventType: payload.type,
            payload,
            timestamp: payload.timestamp,
            error: 'Missing webhook signature',
          };
        }

        const signatureValidation = await this.validateSignature(
          payload,
          signature,
          subscription.secret
        );

        if (!signatureValidation.isValid) {
          return {
            isValid: false,
            eventType: payload.type,
            payload,
            timestamp: payload.timestamp,
            error: signatureValidation.error,
          };
        }
      }

      // Validate payload size
      const sizeValidation = this.validatePayloadSize(payload, rules.payloadSizeLimit);
      if (!sizeValidation.isValid) {
        return {
          isValid: false,
          eventType: payload.type,
          payload,
          timestamp: payload.timestamp,
          error: sizeValidation.error,
        };
      }

      // Validate data schema based on event type
      const schemaValidation = await this.validateDataSchema(payload.type, payload.data);
      if (!schemaValidation.isValid) {
        return {
          isValid: false,
          eventType: payload.type,
          payload,
          timestamp: payload.timestamp,
          error: schemaValidation.error,
        };
      }

      return {
        isValid: true,
        subscriptionId: subscription?.id,
        eventType: payload.type,
        payload,
        signature: headers['x-webhook-signature'] || payload.signature,
        timestamp: payload.timestamp,
      };

    } catch (error: any) {
      return {
        isValid: false,
        eventType: 'unknown',
        payload: body,
        timestamp: new Date().toISOString(),
        error: error.message || 'Validation failed',
      };
    }
  }

  async validateBatch(
    headers: Record<string, string>,
    batchBody: any[],
    subscriptionId?: string
  ): Promise<Array<ValidatedWebhook & { index: number }>> {
    const results = [];

    for (let i = 0; i < batchBody.length; i++) {
      const item = batchBody[i];
      const result = await this.validate(headers, item, subscriptionId);
      results.push({
        ...result,
        index: i,
      });
    }

    return results;
  }

  private async getSubscription(subscriptionId: string) {
    try {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('enabled', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  private async getSubscriptionByWebhookId(webhookId: string) {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('subscription:webhook_subscriptions(*)')
        .eq('id', webhookId)
        .single();

      if (error) throw error;
      return data?.subscription;
    } catch (error) {
      return null;
    }
  }

  private async getValidationRules(subscription: any): Promise<ValidationRules> {
    const rules = { ...this.defaultRules };

    if (subscription) {
      // Use subscription-specific rules
      if (subscription.events && subscription.events.length > 0) {
        rules.allowedEvents = subscription.events;
      }

      if (subscription.require_signature !== undefined) {
        rules.requireSignature = subscription.require_signature;
      }

      if (subscription.max_age !== undefined) {
        rules.maxAge = subscription.max_age;
      }
    }

    return rules;
  }

  private validateStructure(payload: any, rules: ValidationRules): { isValid: boolean; error?: string } {
    // Check required fields
    for (const field of rules.requiredFields) {
      if (!payload[field]) {
        return {
          isValid: false,
          error: `Missing required field: ${field}`,
        };
      }
    }

    // Check data type
    if (typeof payload.type !== 'string') {
      return {
        isValid: false,
        error: 'Event type must be a string',
      };
    }

    if (typeof payload.timestamp !== 'string') {
      return {
        isValid: false,
        error: 'Timestamp must be a string',
      };
    }

    // Validate timestamp format
    if (!this.isValidISOString(payload.timestamp)) {
      return {
        isValid: false,
        error: 'Invalid timestamp format. Use ISO 8601',
      };
    }

    return { isValid: true };
  }

  private validateTimestamp(timestamp: string, maxAge: number): { isValid: boolean; error?: string } {
    try {
      const eventTime = new Date(timestamp);
      const now = new Date();
      const age = (now.getTime() - eventTime.getTime()) / 1000;

      if (age > maxAge) {
        return {
          isValid: false,
          error: `Webhook is too old (${age.toFixed(0)}s). Maximum age is ${maxAge}s`,
        };
      }

      if (age < 0) {
        return {
          isValid: false,
          error: 'Webhook timestamp is in the future',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid timestamp',
      };
    }
  }

  private validateEventType(eventType: string, allowedEvents: string[]): { isValid: boolean; error?: string } {
    if (allowedEvents.length === 0) {
      // No restrictions
      return { isValid: true };
    }

    if (!allowedEvents.includes(eventType)) {
      return {
        isValid: false,
        error: `Event type '${eventType}' is not allowed. Allowed events: ${allowedEvents.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  private async validateSignature(
    payload: any,
    signature: string,
    secret: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Remove signature from payload for verification
      const payloadForVerification = { ...payload };
      delete payloadForVerification.signature;

      const payloadString = JSON.stringify(payloadForVerification);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Use timing-safe compare
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Signature verification failed',
      };
    }
  }

  private validatePayloadSize(payload: any, sizeLimit: number): { isValid: boolean; error?: string } {
    const payloadString = JSON.stringify(payload);
    const size = Buffer.byteLength(payloadString, 'utf8');

    if (size > sizeLimit) {
      return {
        isValid: false,
        error: `Payload too large (${size} bytes). Maximum size is ${sizeLimit} bytes`,
      };
    }

    return { isValid: true };
  }

  private async validateDataSchema(eventType: string, data: any): Promise<{ isValid: boolean; error?: string }> {
    // Get schema for event type
    const schema = this.getEventSchema(eventType);

    if (!schema) {
      // No schema defined for this event type
      return { isValid: true };
    }

    // Validate required fields
    for (const [field, config] of Object.entries(schema.fields)) {
      const fieldConfig = config as any;

      if (fieldConfig.required && data[field] === undefined) {
        return {
          isValid: false,
          error: `Missing required field in data: ${field}`,
        };
      }

      if (data[field] !== undefined) {
        // Validate type
        const typeError = this.validateFieldType(data[field], fieldConfig.type);
        if (typeError) {
          return {
            isValid: false,
            error: `Invalid type for field '${field}': ${typeError}`,
          };
        }

        // Validate format if specified
        if (fieldConfig.format) {
          const formatError = this.validateFieldFormat(data[field], fieldConfig.format);
          if (formatError) {
            return {
              isValid: false,
              error: `Invalid format for field '${field}': ${formatError}`,
            };
          }
        }

        // Validate enum if specified
        if (fieldConfig.enum && !fieldConfig.enum.includes(data[field])) {
          return {
            isValid: false,
            error: `Invalid value for field '${field}'. Must be one of: ${fieldConfig.enum.join(', ')}`,
          };
        }

        // Validate pattern if specified
        if (fieldConfig.pattern) {
          const regex = new RegExp(fieldConfig.pattern);
          if (!regex.test(data[field])) {
            return {
              isValid: false,
              error: `Field '${field}' does not match pattern: ${fieldConfig.pattern}`,
            };
          }
        }
      }
    }

    return { isValid: true };
  }

  private getEventSchema(eventType: string): any {
    const schemas = {
      'order.created': {
        fields: {
          orderId: { type: 'string', required: true },
          customerId: { type: 'string', required: true },
          total: { type: 'number', required: true },
          currency: { type: 'string', required: true },
          items: { type: 'array', required: true },
          shippingAddress: { type: 'object', required: true },
        },
      },
      'order.updated': {
        fields: {
          orderId: { type: 'string', required: true },
          status: { type: 'string', required: true, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
          updatedFields: { type: 'array', required: false },
        },
      },
      'payment.succeeded': {
        fields: {
          paymentId: { type: 'string', required: true },
          orderId: { type: 'string', required: true },
          amount: { type: 'number', required: true },
          currency: { type: 'string', required: true },
          method: { type: 'string', required: true },
        },
      },
      'customer.created': {
        fields: {
          customerId: { type: 'string', required: true },
          email: { type: 'string', required: true, format: 'email' },
          name: { type: 'string', required: false },
        },
      },
      'product.updated': {
        fields: {
          productId: { type: 'string', required: true },
          sku: { type: 'string', required: true },
          name: { type: 'string', required: true },
          price: { type: 'number', required: true },
          stock: { type: 'number', required: true },
        },
      },
      'inventory.updated': {
        fields: {
          productId: { type: 'string', required: true },
          sku: { type: 'string', required: true },
          oldStock: { type: 'number', required: true },
          newStock: { type: 'number', required: true },
          change: { type: 'number', required: true },
        },
      },
    };

    return schemas[eventType as keyof typeof schemas];
  }

  private validateFieldType(value: any, type: string): string | null {
    switch (type) {
      case 'string':
        return typeof value === 'string' ? null : 'Expected string';
      case 'number':
        return typeof value === 'number' ? null : 'Expected number';
      case 'boolean':
        return typeof value === 'boolean' ? null : 'Expected boolean';
      case 'array':
        return Array.isArray(value) ? null : 'Expected array';
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null ? null : 'Expected object';
      default:
        return null;
    }
  }

  private validateFieldFormat(value: string, format: string): string | null {
    switch (format) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Invalid email format';
      case 'url':
        try {
          new URL(value);
          return null;
        } catch {
          return 'Invalid URL format';
        }
      case 'date-time':
        return this.isValidISOString(value) ? null : 'Invalid ISO 8601 date-time format';
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value) ? null : 'Invalid UUID format';
      default:
        return null;
    }
  }

  private isValidISOString(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString || !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  async logValidation(
    validation: ValidatedWebhook,
    source: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('webhook_validations').insert({
        event_type: validation.eventType,
        subscription_id: validation.subscriptionId,
        is_valid: validation.isValid,
        error: validation.error,
        source,
        payload: validation.payload,
        metadata,
        validated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log validation:', error);
    }
  }

  async getValidationStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    valid: number;
    invalid: number;
    byEventType: Record<string, { total: number; valid: number }>;
    commonErrors: Array<{ error: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('webhook_validations')
        .select('*')
        .gte('validated_at', startDate.toISOString())
        .lte('validated_at', endDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        valid: data.filter(d => d.is_valid).length,
        invalid: data.filter(d => !d.is_valid).length,
        byEventType: {} as Record<string, { total: number; valid: number }>,
        commonErrors: [] as Array<{ error: string; count: number }>,
      };

      // Group by event type
      data.forEach(validation => {
        if (!stats.byEventType[validation.event_type]) {
          stats.byEventType[validation.event_type] = { total: 0, valid: 0 };
        }
        stats.byEventType[validation.event_type].total++;
        if (validation.is_valid) {
          stats.byEventType[validation.event_type].valid++;
        }
      });

      // Count common errors
      const errorCounts = data
        .filter(d => d.error)
        .reduce((acc: Record<string, number>, validation) => {
          const error = validation.error || 'Unknown error';
          acc[error] = (acc[error] || 0) + 1;
          return acc;
        }, {});

      stats.commonErrors = Object.entries(errorCounts)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Failed to get validation stats:', error);
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        byEventType: {},
        commonErrors: [],
      };
    }
  }

  async cleanupOldValidations(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from('webhook_validations')
        .delete()
        .lt('validated_at', cutoffDate.toISOString());

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup old validations:', error);
      return 0;
    }
  }

  async validateAndProcess(
    headers: Record<string, string>,
    body: any,
    processor: (validated: ValidatedWebhook) => Promise<void>
  ): Promise<{ success: boolean; validation?: ValidatedWebhook; error?: string }> {
    try {
      const validation = await this.validate(headers, body);

      // Log validation result
      await this.logValidation(validation, 'api', {
        headers: Object.keys(headers),
        bodySize: JSON.stringify(body).length,
      });

      if (!validation.isValid) {
        return {
          success: false,
          validation,
          error: validation.error,
        };
      }

      // Process the validated webhook
      await processor(validation);

      return {
        success: true,
        validation,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const webhookValidator = WebhookValidator.getInstance();
