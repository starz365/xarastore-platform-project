export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  domain: string;
  suggestions?: string[];
  error?: string;
  disposable: boolean;
  roleBased: boolean;
  freeProvider: boolean;
  deliverable?: boolean;
}

export class EmailValidator {
  private static instance: EmailValidator;
  
  // Common email providers
  private readonly FREE_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'yandex.com', 'zoho.com', 'protonmail.com',
  ];
  
  // Disposable email providers
  private readonly DISPOSABLE_PROVIDERS = [
    'tempmail.com', 'throwawaymail.com', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
    'getairmail.com', 'tempmailaddress.com',
  ];
  
  // Role-based email prefixes
  private readonly ROLE_PREFIXES = [
    'admin', 'administrator', 'webmaster', 'postmaster', 'hostmaster',
    'info', 'support', 'help', 'contact', 'sales', 'marketing',
    'billing', 'accounts', 'finance', 'hr', 'recruitment',
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  ];

  private constructor() {}

  static getInstance(): EmailValidator {
    if (!EmailValidator.instance) {
      EmailValidator.instance = new EmailValidator();
    }
    return EmailValidator.instance;
  }

  validate(email: string, options: {
    checkDisposable?: boolean;
    checkRoleBased?: boolean;
    checkFreeProvider?: boolean;
    checkDeliverable?: boolean;
  } = {}): EmailValidationResult {
    const defaultOptions = {
      checkDisposable: true,
      checkRoleBased: true,
      checkFreeProvider: false,
      checkDeliverable: false,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Basic email validation
    if (!email || typeof email !== 'string') {
      return {
        valid: false,
        normalized: '',
        domain: '',
        disposable: false,
        roleBased: false,
        freeProvider: false,
        error: 'Email is required',
      };
    }

    const trimmed = email.trim().toLowerCase();
    
    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmed)) {
      return {
        valid: false,
        normalized: '',
        domain: '',
        disposable: false,
        roleBased: false,
        freeProvider: false,
        error: 'Invalid email format',
      };
    }

    // Extract domain
    const domain = trimmed.split('@')[1];
    
    // Check for common typos
    const suggestions = this.getSuggestions(trimmed);
    
    // Check if disposable
    const disposable = opts.checkDisposable ? this.isDisposable(domain) : false;
    
    // Check if role-based
    const localPart = trimmed.split('@')[0];
    const roleBased = opts.checkRoleBased ? this.isRoleBased(localPart) : false;
    
    // Check if free provider
    const freeProvider = opts.checkFreeProvider ? this.isFreeProvider(domain) : false;

    const result: EmailValidationResult = {
      valid: true,
      normalized: trimmed,
      domain,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      disposable,
      roleBased,
      freeProvider,
    };

    // Additional validations
    if (disposable) {
      result.valid = false;
      result.error = 'Disposable email addresses are not allowed';
    }

    if (roleBased && opts.checkRoleBased) {
      result.error = 'Role-based email addresses are not recommended for personal accounts';
      // Don't set valid to false for role-based, just warn
    }

    // Check deliverability (async)
    if (opts.checkDeliverable) {
      this.checkDeliverability(trimmed).then(deliverable => {
        result.deliverable = deliverable;
      }).catch(() => {
        result.deliverable = undefined;
      });
    }

    return result;
  }

  async validateWithMXCheck(email: string): Promise<EmailValidationResult> {
    const basicValidation = this.validate(email, { checkDeliverable: true });
    
    if (!basicValidation.valid) {
      return basicValidation;
    }

    try {
      const deliverable = await this.checkDeliverability(email);
      return {
        ...basicValidation,
        deliverable,
      };
    } catch (error) {
      console.warn('MX check failed:', error);
      return basicValidation;
    }
  }

  private getSuggestions(email: string): string[] {
    const suggestions: string[] = [];
    const [localPart, domain] = email.split('@');
    
    // Check for common typos in popular domains
    const commonTypos: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yhoo.com': 'yahoo.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outllok.com': 'outlook.com',
    };
    
    if (commonTypos[domain]) {
      suggestions.push(`Did you mean ${localPart}@${commonTypos[domain]}?`);
    }
    
    // Check for missing dot in gmail
    if (domain === 'gmailcom') {
      suggestions.push('Did you mean gmail.com?');
    }
    
    // Check for common Kenyan domains
    const kenyanDomains = ['co.ke', 'ac.ke', 'or.ke', 'go.ke', 'me.ke'];
    const domainParts = domain.split('.');
    
    if (domainParts.length === 1 && domainParts[0].length > 2) {
      // Might be missing .co.ke
      suggestions.push(`Did you mean ${localPart}@${domainParts[0]}.co.ke?`);
    }
    
    return suggestions;
  }

  private isDisposable(domain: string): boolean {
    const domainLower = domain.toLowerCase();
    
    // Check exact matches
    if (this.DISPOSABLE_PROVIDERS.includes(domainLower)) {
      return true;
    }
    
    // Check subdomains
    for (const disposable of this.DISPOSABLE_PROVIDERS) {
      if (domainLower.endsWith(`.${disposable}`)) {
        return true;
      }
    }
    
    // Check for patterns common in disposable emails
    const disposablePatterns = [
      /^temp-?mail\./i,
      /^throwaway-?mail\./i,
      /^10min(ute)?mail\./i,
      /^fake-?mail\./i,
      /^trash-?mail\./i,
      /^spam-?mail\./i,
      /^guerrilla-?mail\./i,
    ];
    
    for (const pattern of disposablePatterns) {
      if (pattern.test(domainLower)) {
        return true;
      }
    }
    
    return false;
  }

  private isRoleBased(localPart: string): boolean {
    const localLower = localPart.toLowerCase();
    
    // Check exact matches
    if (this.ROLE_PREFIXES.includes(localLower)) {
      return true;
    }
    
    // Check with common separators
    const separators = ['-', '_', '.'];
    
    for (const prefix of this.ROLE_PREFIXES) {
      for (const separator of separators) {
        if (localLower.startsWith(`${prefix}${separator}`) || 
            localLower.endsWith(`${separator}${prefix}`)) {
          return true;
        }
      }
    }
    
    // Check for role-based patterns
    const rolePatterns = [
      /^admin\d*$/i,
      /^support\d*$/i,
      /^info\d*$/i,
      /^contact\d*$/i,
      /^sales\d*$/i,
      /^help\d*$/i,
    ];
    
    for (const pattern of rolePatterns) {
      if (pattern.test(localLower)) {
        return true;
      }
    }
    
    return false;
  }

  private isFreeProvider(domain: string): boolean {
    const domainLower = domain.toLowerCase();
    
    // Check exact matches
    if (this.FREE_PROVIDERS.includes(domainLower)) {
      return true;
    }
    
    // Check subdomains of free providers
    for (const provider of this.FREE_PROVIDERS) {
      if (domainLower.endsWith(`.${provider}`)) {
        return true;
      }
    }
    
    return false;
  }

  private async checkDeliverability(email: string): Promise<boolean> {
    // This is a simplified deliverability check
    // In production, use a proper email verification service
    
    const domain = email.split('@')[1];
    
    try {
      // Check MX records
      const mxRecords = await this.resolveMXRecords(domain);
      
      if (mxRecords.length === 0) {
        return false;
      }
      
      // Additional checks could include:
      // 1. SMTP handshake (requires server-side implementation)
      // 2. DNSBL checks
      // 3. Syntax validation (already done)
      
      return true;
    } catch (error) {
      console.warn('MX resolution failed:', error);
      return false;
    }
  }

  private async resolveMXRecords(domain: string): Promise<string[]> {
    // This is a client-side simulation
    // In production, this would be done server-side
    
    const knownDomains: Record<string, string[]> = {
      'gmail.com': ['gmail-smtp-in.l.google.com'],
      'yahoo.com': ['mta5.am0.yahoodns.net', 'mta6.am0.yahoodns.net'],
      'hotmail.com': ['mx1.hotmail.com', 'mx2.hotmail.com'],
      'outlook.com': ['outlook-com.olc.protection.outlook.com'],
      'co.ke': ['mx1.kenyaweb.com', 'mx2.kenyaweb.com'],
    };
    
    // Return mock MX records for known domains
    if (domain in knownDomains) {
      return knownDomains[domain];
    }
    
    // For unknown domains, simulate DNS resolution
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock successful resolution for most domains
        resolve([`mx1.${domain}`, `mx2.${domain}`]);
      }, 100);
    });
  }

  normalize(email: string): string {
    const validation = this.validate(email);
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid email address');
    }
    
    return validation.normalized;
  }

  maskEmail(email: string): string {
    const validation = this.validate(email);
    
    if (!validation.valid) {
      return email;
    }
    
    const [localPart, domain] = validation.normalized.split('@');
    
    if (localPart.length <= 2) {
      return validation.normalized;
    }
    
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  extractUsername(email: string): string | null {
    const validation = this.validate(email);
    
    if (!validation.valid) {
      return null;
    }
    
    return validation.normalized.split('@')[0];
  }

  extractDomain(email: string): string | null {
    const validation = this.validate(email);
    
    if (!validation.valid) {
      return null;
    }
    
    return validation.domain;
  }

  isBusinessEmail(email: string): boolean {
    const validation = this.validate(email);
    
    if (!validation.valid) {
      return false;
    }
    
    const domain = validation.domain;
    
    // Check for common business domain patterns
    const businessPatterns = [
      /\.co\.ke$/i, // Kenyan companies
      /\.com$/i,    // Commercial
      /\.org$/i,    // Organizations
      /\.net$/i,    // Networks
      /\.biz$/i,    // Business
      /\.info$/i,   // Information
    ];
    
    // Check if it's not a free provider
    const isFree = this.isFreeProvider(domain);
    
    // Check if it matches business patterns
    const matchesPattern = businessPatterns.some(pattern => pattern.test(domain));
    
    return !isFree && matchesPattern;
  }

  generateAlias(baseEmail: string, alias: string): string | null {
    const validation = this.validate(baseEmail);
    
    if (!validation.valid) {
      return null;
    }
    
    const [localPart, domain] = validation.normalized.split('@');
    
    // For Gmail, you can use + aliasing
    if (domain === 'gmail.com') {
      return `${localPart}+${alias}@gmail.com`;
    }
    
    // For other providers, create a simple alias
    return `${localPart}.${alias}@${domain}`;
  }

  validateMultiple(emails: string[]): {
    valid: string[];
    invalid: Array<{ email: string; error: string }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ email: string; error: string }> = [];
    
    for (const email of emails) {
      const validation = this.validate(email);
      
      if (validation.valid) {
        valid.push(validation.normalized);
      } else {
        invalid.push({
          email,
          error: validation.error || 'Invalid email address',
        });
      }
    }
    
    return { valid, invalid };
  }

  async bulkValidate(
    emails: string[],
    options: {
      checkDisposable?: boolean;
      checkDeliverable?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<{
    results: Array<{ email: string; result: EmailValidationResult }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      disposable: number;
      roleBased: number;
      undeliverable: number;
    };
  }> {
    const defaultOptions = {
      checkDisposable: true,
      checkDeliverable: false,
      batchSize: 10,
    };
    
    const opts = { ...defaultOptions, ...options };
    const results: Array<{ email: string; result: EmailValidationResult }> = [];
    
    // Process in batches to avoid overwhelming
    for (let i = 0; i < emails.length; i += opts.batchSize) {
      const batch = emails.slice(i, i + opts.batchSize);
      const batchPromises = batch.map(email => 
        opts.checkDeliverable 
          ? this.validateWithMXCheck(email)
          : Promise.resolve(this.validate(email, opts))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((result, index) => {
        results.push({
          email: batch[index],
          result,
        });
      });
      
      // Small delay between batches
      if (i + opts.batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Generate summary
    const summary = {
      total: results.length,
      valid: results.filter(r => r.result.valid).length,
      invalid: results.filter(r => !r.result.valid).length,
      disposable: results.filter(r => r.result.disposable).length,
      roleBased: results.filter(r => r.result.roleBased).length,
      undeliverable: results.filter(r => r.result.deliverable === false).length,
    };
    
    return { results, summary };
  }

  getCommonDomains(): string[] {
    return [...this.FREE_PROVIDERS];
  }

  getDisposableDomains(): string[] {
    return [...this.DISPOSABLE_PROVIDERS];
  }

  isDomainBlacklisted(domain: string, blacklist: string[] = []): boolean {
    const domainLower = domain.toLowerCase();
    
    // Check against built-in disposable domains
    if (this.isDisposable(domainLower)) {
      return true;
    }
    
    // Check against custom blacklist
    return blacklist.some(blacklisted => 
      domainLower === blacklisted.toLowerCase() ||
      domainLower.endsWith(`.${blacklisted.toLowerCase()}`)
    );
  }

  isDomainWhitelisted(domain: string, whitelist: string[] = []): boolean {
    const domainLower = domain.toLowerCase();
    
    // Check against custom whitelist
    return whitelist.some(whitelisted => 
      domainLower === whitelisted.toLowerCase() ||
      domainLower.endsWith(`.${whitelisted.toLowerCase()}`)
    );
  }
}

export const emailValidator = EmailValidator.getInstance();
