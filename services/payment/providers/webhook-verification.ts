import crypto from 'crypto';
import { StripeService } from './stripe';
import { PayPalService } from './paypal';
import { MpesaService } from './mpesa';

export class WebhookVerificationService {
  private stripeService: StripeService;
  private paypalService: PayPalService;
  private mpesaService: MpesaService;

  constructor() {
    this.stripeService = new StripeService();
    this.paypalService = new PayPalService();
    this.mpesaService = new MpesaService();
  }

  async verifyStripeWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const stripe = require('stripe')(secret);
      
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      return !!event;
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      return false;
    }
  }

  async verifyPayPalWebhook(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): Promise<boolean> {
    try {
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const transmissionSig = headers['paypal-transmission-sig'];
      const certUrl = headers['paypal-cert-url'];
      const authAlgo = headers['paypal-auth-algo'];

      if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
        return false;
      }

      const response = await fetch(`${this.paypalService['baseUrl']}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.paypalService['getAccessToken']()}`,
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          transmission_sig: transmissionSig,
          cert_url: certUrl,
          auth_algo: authAlgo,
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  verifyMpesaWebhook(
    data: any,
    validationRules: {
      requiredFields?: string[];
      amountRange?: { min: number; max: number };
      phoneValidation?: boolean;
    } = {}
  ): boolean {
    try {
      // Check basic structure
      if (!data.Body?.stkCallback) {
        return false;
      }

      const callback = data.Body.stkCallback;

      // Check required fields
      const required = validationRules.requiredFields || [
        'MerchantRequestID',
        'CheckoutRequestID',
        'ResultCode',
        'ResultDesc',
      ];

      for (const field of required) {
        if (!callback[field]) {
          return false;
        }
      }

      // Validate ResultCode
      if (typeof callback.ResultCode !== 'number') {
        return false;
      }

      // If payment was successful, check callback metadata
      if (callback.ResultCode === 0) {
        if (!callback.CallbackMetadata?.Item) {
          return false;
        }

        const items = callback.CallbackMetadata.Item.reduce((acc: any, item: any) => {
          acc[item.Name] = item.Value;
          return acc;
        }, {});

        // Check for required metadata items
        const requiredMetadata = ['Amount', 'MpesaReceiptNumber', 'PhoneNumber'];
        for (const item of requiredMetadata) {
          if (!items[item]) {
            return false;
          }
        }

        // Validate amount range if specified
        if (validationRules.amountRange) {
          const amount = parseFloat(items.Amount);
          if (amount < validationRules.amountRange.min || amount > validationRules.amountRange.max) {
            return false;
          }
        }

        // Validate phone number if required
        if (validationRules.phoneValidation) {
          const phone = items.PhoneNumber.toString();
          if (!/^2547\d{8}$/.test(phone)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('M-Pesa webhook verification failed:', error);
      return false;
    }
  }

  verifyHMACSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      const hmac = crypto.createHmac(algorithm, secret);
      const computedSignature = hmac.update(payload).digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      console.error('HMAC signature verification failed:', error);
      return false;
    }
  }

  verifyJWTToken(
    token: string,
    secret: string,
    options: {
      algorithms?: string[];
      audience?: string;
      issuer?: string;
      subject?: string;
    } = {}
  ): boolean {
    try {
      const jwt = require('jsonwebtoken');
      
      const decoded = jwt.verify(token, secret, {
        algorithms: options.algorithms || ['HS256'],
        audience: options.audience,
        issuer: options.issuer,
        subject: options.subject,
      });
      
      return !!decoded;
    } catch (error) {
      console.error('JWT token verification failed:', error);
      return false;
    }
  }

  verifyTimestamp(
    timestamp: string | number,
    tolerance: number = 300 // 5 minutes in seconds
  ): boolean {
    try {
      const requestTime = typeof timestamp === 'string' 
        ? Date.parse(timestamp) / 1000 
        : timestamp;
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      return Math.abs(currentTime - requestTime) <= tolerance;
    } catch (error) {
      console.error('Timestamp verification failed:', error);
      return false;
    }
  }

  verifyIPAddress(
    ip: string,
    allowedIPs: string[],
    cidrRanges: string[] = []
  ): boolean {
    try {
      // Check exact match
      if (allowedIPs.includes(ip)) {
        return true;
      }

      // Check CIDR ranges
      for (const cidr of cidrRanges) {
        if (this.isIPInCIDR(ip, cidr)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('IP address verification failed:', error);
      return false;
    }
  }

  verifyRateLimit(
    identifier: string,
    limit: number,
    window: number // in seconds
  ): boolean {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL,
      });

      await client.connect();

      const key = `rate_limit:${identifier}`;
      const current = await client.get(key);

      if (!current) {
        await client.setEx(key, window, '1');
        return true;
      }

      const count = parseInt(current);
      if (count >= limit) {
        return false;
      }

      await client.incr(key);
      return true;
    } catch (error) {
      console.error('Rate limit verification failed:', error);
      return false;
    }
  }

  verifyRequestSize(
    contentLength: number,
    maxSize: number // in bytes
  ): boolean {
    return contentLength <= maxSize;
  }

  verifyContentType(
    contentType: string,
    allowedTypes: string[] = ['application/json']
  ): boolean {
    return allowedTypes.some(type => contentType.includes(type));
  }

  verifyOrigin(
    origin: string,
    allowedOrigins: string[]
  ): boolean {
    try {
      if (!origin) return false;
      
      const url = new URL(origin);
      const hostname = url.hostname;
      
      return allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed === hostname) return true;
        if (allowed.startsWith('*.') && hostname.endsWith(allowed.slice(2))) return true;
        return false;
      });
    } catch (error) {
      console.error('Origin verification failed:', error);
      return false;
    }
  }

  verifyUserAgent(
    userAgent: string,
    allowedPatterns: RegExp[] = []
  ): boolean {
    if (!userAgent) return false;
    
    // Default: allow common browsers and curl
    const defaultPatterns = [
      /^Mozilla\/.*/, // Browsers
      /^curl\/.*/,    // curl
      /^PostmanRuntime\/.*/, // Postman
      /^insomnia\/.*/, // Insomnia
    ];

    const patterns = [...defaultPatterns, ...allowedPatterns];
    
    return patterns.some(pattern => pattern.test(userAgent));
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const ipToInt = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      };

      const [cidrIP, maskBits] = cidr.split('/');
      const mask = ~((1 << (32 - parseInt(maskBits))) - 1) >>> 0;
      
      const ipInt = ipToInt(ip);
      const cidrInt = ipToInt(cidrIP);
      
      return (ipInt & mask) === (cidrInt & mask);
    } catch (error) {
      return false;
    }
  }

  async verifyWebhookSecurity(
    request: {
      method: string;
      headers: Record<string, string>;
      body: string | Buffer;
      ip: string;
    },
    config: {
      provider: 'stripe' | 'paypal' | 'mpesa' | 'custom';
      secret?: string;
      webhookId?: string;
      allowedIPs?: string[];
      rateLimit?: { limit: number; window: number };
      maxSize?: number;
      validationRules?: any;
    }
  ): Promise<{
    isValid: boolean;
    reason?: string;
    data?: any;
  }> {
    try {
      // Check request method
      if (request.method !== 'POST') {
        return { isValid: false, reason: 'Invalid request method' };
      }

      // Check content type
      if (!this.verifyContentType(request.headers['content-type'] || '')) {
        return { isValid: false, reason: 'Invalid content type' };
      }

      // Check request size
      const contentLength = parseInt(request.headers['content-length'] || '0');
      if (config.maxSize && !this.verifyRequestSize(contentLength, config.maxSize)) {
        return { isValid: false, reason: 'Request too large' };
      }

      // Check rate limiting
      if (config.rateLimit) {
        const identifier = `${config.provider}:${request.ip}`;
        if (!await this.verifyRateLimit(identifier, config.rateLimit.limit, config.rateLimit.window)) {
          return { isValid: false, reason: 'Rate limit exceeded' };
        }
      }

      // Check IP address
      if (config.allowedIPs && !this.verifyIPAddress(request.ip, config.allowedIPs)) {
        return { isValid: false, reason: 'IP address not allowed' };
      }

      // Verify provider-specific webhook
      let providerValid = false;
      let verifiedData: any;

      switch (config.provider) {
        case 'stripe':
          if (!config.secret) {
            return { isValid: false, reason: 'Missing webhook secret' };
          }
          
          const stripeSig = request.headers['stripe-signature'];
          if (!stripeSig) {
            return { isValid: false, reason: 'Missing Stripe signature' };
          }

          providerValid = await this.verifyStripeWebhook(
            request.body,
            stripeSig,
            config.secret
          );
          break;

        case 'paypal':
          if (!config.webhookId) {
            return { isValid: false, reason: 'Missing webhook ID' };
          }

          providerValid = await this.verifyPayPalWebhook(
            request.headers,
            request.body.toString(),
            config.webhookId
          );
          break;

        case 'mpesa':
          const mpesaData = JSON.parse(request.body.toString());
          providerValid = this.verifyMpesaWebhook(mpesaData, config.validationRules);
          verifiedData = mpesaData;
          break;

        case 'custom':
          if (!config.secret) {
            return { isValid: false, reason: 'Missing webhook secret' };
          }

          const signature = request.headers['x-webhook-signature'];
          const timestamp = request.headers['x-webhook-timestamp'];

          if (!signature || !timestamp) {
            return { isValid: false, reason: 'Missing webhook signature or timestamp' };
          }

          // Verify timestamp
          if (!this.verifyTimestamp(timestamp)) {
            return { isValid: false, reason: 'Timestamp outside tolerance window' };
          }

          // Verify HMAC signature
          const payload = `${timestamp}.${request.body.toString()}`;
          providerValid = this.verifyHMACSignature(payload, signature, config.secret);
          break;

        default:
          return { isValid: false, reason: 'Unsupported webhook provider' };
      }

      if (!providerValid) {
        return { isValid: false, reason: 'Provider verification failed' };
      }

      return {
        isValid: true,
        data: verifiedData,
      };
    } catch (error) {
      console.error('Webhook security verification failed:', error);
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  generateWebhookSignature(
    payload: string,
    secret: string,
    algorithm: string = 'sha256'
  ): string {
    const hmac = crypto.createHmac(algorithm, secret);
    return hmac.update(payload).digest('hex');
  }

  generateWebhookHeaders(
    payload: string,
    secret: string,
    options: {
      timestamp?: number;
      algorithm?: string;
    } = {}
  ): Record<string, string> {
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000);
    const algorithm = options.algorithm || 'sha256';
    
    const data = `${timestamp}.${payload}`;
    const signature = this.generateWebhookSignature(data, secret, algorithm);
    
    return {
      'x-webhook-timestamp': timestamp.toString(),
      'x-webhook-signature': signature,
      'x-webhook-algorithm': algorithm,
      'content-type': 'application/json',
    };
  }
}

export const webhookVerificationService = new WebhookVerificationService();
