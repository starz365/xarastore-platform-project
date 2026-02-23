import { supabase } from '@/lib/supabase/client';

export class SecurityService {
  private static instance: SecurityService;
  private blockedIPs: Set<string> = new Set();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  private constructor() {
    this.initialize();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private async initialize(): Promise<void> {
    // Load blocked IPs from database
    await this.loadBlockedIPs();
    
    // Schedule periodic cleanup
    setInterval(() => this.cleanupRateLimits(), 300000); // 5 minutes
  }

  private async loadBlockedIPs(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('ip_address')
        .eq('is_active', true);

      if (error) throw error;

      this.blockedIPs.clear();
      data?.forEach(record => this.blockedIPs.add(record.ip_address));
    } catch (error) {
      console.error('Failed to load blocked IPs:', error);
    }
  }

  async checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const now = Date.now();
    const limit = this.rateLimits.get(ip);

    if (!limit) {
      this.rateLimits.set(ip, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS_PER_MINUTE - 1,
        resetIn: this.RATE_LIMIT_WINDOW,
      };
    }

    if (now > limit.resetTime) {
      this.rateLimits.set(ip, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS_PER_MINUTE - 1,
        resetIn: this.RATE_LIMIT_WINDOW,
      };
    }

    if (limit.count >= this.MAX_REQUESTS_PER_MINUTE) {
      await this.recordSuspiciousActivity(ip, 'rate_limit_exceeded');
      return {
        allowed: false,
        remaining: 0,
        resetIn: limit.resetTime - now,
      };
    }

    limit.count++;
    return {
      allowed: true,
      remaining: this.MAX_REQUESTS_PER_MINUTE - limit.count,
      resetIn: limit.resetTime - now,
    };
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  async blockIP(ip: string, reason: string, durationHours: number = 24): Promise<void> {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: ip,
          reason,
          expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      this.blockedIPs.add(ip);
      await this.recordSuspiciousActivity(ip, `blocked: ${reason}`);
    } catch (error) {
      console.error('Failed to block IP:', error);
      throw error;
    }
  }

  async unblockIP(ip: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .update({ is_active: false })
        .eq('ip_address', ip);

      if (error) throw error;

      this.blockedIPs.delete(ip);
    } catch (error) {
      console.error('Failed to unblock IP:', error);
      throw error;
    }
  }

  async recordSuspiciousActivity(ip: string, activity: string, details?: any): Promise<void> {
    try {
      await supabase
        .from('security_logs')
        .insert({
          ip_address: ip,
          activity_type: activity,
          details: details || {},
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to record security log:', error);
    }
  }

  async validateCSRFToken(token: string): Promise<boolean> {
    try {
      // In production, validate against stored tokens
      const { data, error } = await supabase
        .from('csrf_tokens')
        .select('id')
        .eq('token', token)
        .eq('is_valid', true)
        .single();

      if (error || !data) return false;

      // Invalidate token after use
      await supabase
        .from('csrf_tokens')
        .update({ is_valid: false })
        .eq('token', token);

      return true;
    } catch (error) {
      console.error('CSRF validation error:', error);
      return false;
    }
  }

  async generateCSRFToken(): Promise<string> {
    const token = this.generateRandomToken(32);
    
    try {
      await supabase
        .from('csrf_tokens')
        .insert({
          token,
          is_valid: true,
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          created_at: new Date().toISOString(),
        });

      return token;
    } catch (error) {
      console.error('Failed to generate CSRF token:', error);
      throw error;
    }
  }

  sanitizeInput(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  sanitizeHTML(html: string): string {
    // Basic HTML sanitization
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a'];
    const allowedAttributes = ['href', 'title', 'target'];

    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    const elementsToRemove: Element[] = [];
    let node: Element | null;

    while ((node = walker.nextNode() as Element)) {
      if (!allowedTags.includes(node.tagName.toLowerCase())) {
        elementsToRemove.push(node);
      } else {
        // Remove disallowed attributes
        Array.from(node.attributes).forEach(attr => {
          if (!allowedAttributes.includes(attr.name)) {
            node!.removeAttribute(attr.name);
          }
        });

        // Ensure href is safe
        const href = node.getAttribute('href');
        if (href && !href.startsWith('/') && !href.startsWith('http')) {
          node.removeAttribute('href');
        }
      }
    }

    elementsToRemove.forEach(el => el.remove());
    return doc.body.innerHTML;
  }

  validatePasswordStrength(password: string): {
    valid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 20;
    else feedback.push('Password should be at least 8 characters long');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 20;
    else feedback.push('Include at least one uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 20;
    else feedback.push('Include at least one lowercase letter');

    // Number check
    if (/[0-9]/.test(password)) score += 20;
    else feedback.push('Include at least one number');

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    else feedback.push('Include at least one special character');

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
    if (!commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score += 10;
    } else {
      feedback.push('Avoid common passwords');
      score -= 30;
    }

    return {
      valid: score >= 70,
      score: Math.min(100, Math.max(0, score)),
      feedback: feedback.length > 0 ? feedback : ['Password is strong'],
    };
  }

  generateRandomToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  hashPassword(password: string): Promise<string> {
    // This would typically be handled by Supabase Auth
    // For demonstration, using Web Crypto API
    return new Promise((resolve, reject) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      crypto.subtle.digest('SHA-256', data)
        .then(hash => {
          const hashArray = Array.from(new Uint8Array(hash));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        })
        .catch(reject);
    });
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [ip, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(ip);
      }
    }
  }
}

export const security = SecurityService.getInstance();
