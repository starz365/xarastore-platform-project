export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number; // in seconds
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface Cookie {
  name: string;
  value: string;
  options: CookieOptions;
}

export class CookieManager {
  private static instance: CookieManager;
  private readonly DEFAULT_OPTIONS: CookieOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  private constructor() {}

  static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // Add options
    if (mergedOptions.path) {
      cookieString += `; path=${mergedOptions.path}`;
    }

    if (mergedOptions.domain) {
      cookieString += `; domain=${mergedOptions.domain}`;
    }

    if (mergedOptions.maxAge) {
      cookieString += `; max-age=${mergedOptions.maxAge}`;
    }

    if (mergedOptions.expires) {
      cookieString += `; expires=${mergedOptions.expires.toUTCString()}`;
    }

    if (mergedOptions.secure) {
      cookieString += '; secure';
    }

    if (mergedOptions.sameSite) {
      cookieString += `; samesite=${mergedOptions.sameSite}`;
    }

    // Note: httpOnly cannot be set from JavaScript
    // It must be set server-side

    document.cookie = cookieString;
  }

  get(name: string): string | null {
    const cookies = document.cookie.split(';');
    
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      
      if (decodeURIComponent(cookieName) === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    
    return null;
  }

  getAll(): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookiePairs = document.cookie.split(';');
    
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }
    
    return cookies;
  }

  delete(name: string, options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}): void {
    this.set(name, '', {
      ...options,
      maxAge: -1,
      expires: new Date(0),
    });
  }

  deleteAll(path?: string, domain?: string): void {
    const cookies = this.getAll();
    
    for (const name in cookies) {
      this.delete(name, { path, domain });
    }
  }

  has(name: string): boolean {
    return this.get(name) !== null;
  }

  getWithOptions(name: string): { value: string; options: CookieOptions } | null {
    const value = this.get(name);
    
    if (!value) {
      return null;
    }

    // Parse options from cookie string
    const cookieString = document.cookie;
    const cookieRegex = new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`);
    const match = cookieString.match(cookieRegex);
    
    if (!match) {
      return null;
    }

    const options: CookieOptions = {};
    const optionsString = cookieString.substring(match[0].length);
    const optionPairs = optionsString.split(';');
    
    for (const pair of optionPairs) {
      const [key, value] = pair.trim().split('=');
      
      switch (key.toLowerCase()) {
        case 'path':
          options.path = value;
          break;
        case 'domain':
          options.domain = value;
          break;
        case 'max-age':
          options.maxAge = parseInt(value, 10);
          break;
        case 'expires':
          options.expires = new Date(value);
          break;
        case 'secure':
          options.secure = true;
          break;
        case 'samesite':
          options.sameSite = value as 'strict' | 'lax' | 'none';
          break;
      }
    }

    return { value, options };
  }

  setJson<T = any>(name: string, value: T, options: CookieOptions = {}): void {
    const jsonString = JSON.stringify(value);
    this.set(name, jsonString, options);
  }

  getJson<T = any>(name: string): T | null {
    const value = this.get(name);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Failed to parse cookie ${name} as JSON:`, error);
      return null;
    }
  }

  setEncrypted(name: string, value: string, secret: string, options: CookieOptions = {}): void {
    // Simple encryption using XOR (for demonstration)
    // In production, use proper encryption like AES-GCM
    const encrypted = this.xorEncrypt(value, secret);
    this.set(name, encrypted, options);
  }

  getEncrypted(name: string, secret: string): string | null {
    const encrypted = this.get(name);
    
    if (!encrypted) {
      return null;
    }

    try {
      return this.xorDecrypt(encrypted, secret);
    } catch (error) {
      console.error(`Failed to decrypt cookie ${name}:`, error);
      return null;
    }
  }

  private xorEncrypt(text: string, key: string): string {
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return btoa(result);
  }

  private xorDecrypt(encrypted: string, key: string): string {
    try {
      const text = atob(encrypted);
      let result = '';
      
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      
      return result;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  setSessionCookie(name: string, value: string, options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}): void {
    this.set(name, value, {
      ...options,
      maxAge: 30 * 60, // 30 minutes
    });
  }

  setPersistentCookie(name: string, value: string, days: number = 365, options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    
    this.set(name, value, {
      ...options,
      expires,
    });
  }

  getCookieSize(name: string): number {
    const value = this.get(name);
    return value ? encodeURIComponent(value).length : 0;
  }

  getTotalCookieSize(): number {
    return document.cookie.length;
  }

  isCookieLimitExceeded(maxSize: number = 4096): boolean {
    return this.getTotalCookieSize() > maxSize;
  }

  cleanupOldCookies(maxAge: number = 30 * 24 * 60 * 60): void { // 30 days
    const cookies = this.getAll();
    const now = Date.now();
    
    for (const [name, value] of Object.entries(cookies)) {
      const cookieData = this.getWithOptions(name);
      
      if (cookieData?.options.expires) {
        const expiresTime = cookieData.options.expires.getTime();
        
        if (expiresTime < now) {
          this.delete(name);
        }
      } else if (cookieData?.options.maxAge) {
        // Can't determine age without creation time
        // We'll keep these cookies
      }
    }
  }

  setConsent(consent: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  }): void {
    this.setJson('cookie_consent', {
      ...consent,
      timestamp: Date.now(),
      version: '1.0',
    }, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'strict',
    });
  }

  getConsent(): {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    timestamp: number;
    version: string;
  } | null {
    return this.getJson('cookie_consent');
  }

  hasConsent(category: 'analytics' | 'marketing' | 'preferences'): boolean {
    const consent = this.getConsent();
    
    if (!consent) {
      return false;
    }
    
    // Necessary cookies are always allowed
    if (category === 'necessary') {
      return true;
    }
    
    return consent[category] === true;
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.set('theme', theme, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
    });
  }

  getTheme(): 'light' | 'dark' | 'system' {
    return (this.get('theme') as any) || 'system';
  }

  setLanguage(language: string): void {
    this.set('language', language, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
    });
  }

  getLanguage(): string {
    return this.get('language') || 'en';
  }

  setCurrency(currency: string): void {
    this.set('currency', currency, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
    });
  }

  getCurrency(): string {
    return this.get('currency') || 'KES';
  }

  setCartId(cartId: string): void {
    this.set('cart_id', cartId, {
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: 'strict',
    });
  }

  getCartId(): string | null {
    return this.get('cart_id');
  }

  setGuestToken(token: string): void {
    this.set('guest_token', token, {
      maxAge: 24 * 60 * 60, // 24 hours
      secure: true,
      sameSite: 'strict',
    });
  }

  getGuestToken(): string | null {
    return this.get('guest_token');
  }

  deleteGuestToken(): void {
    this.delete('guest_token');
  }

  setReferrer(referrer: string): void {
    this.set('referrer', referrer, {
      maxAge: 30 * 60, // 30 minutes
      sameSite: 'strict',
    });
  }

  getReferrer(): string | null {
    return this.get('referrer');
  }

  setUTMParams(params: Record<string, string>): void {
    this.setJson('utm_params', {
      ...params,
      timestamp: Date.now(),
    }, {
      maxAge: 24 * 60 * 60, // 24 hours
      sameSite: 'strict',
    });
  }

  getUTMParams(): Record<string, string> | null {
    return this.getJson('utm_params');
  }

  setLastVisitedPage(page: string): void {
    this.set('last_visited', page, {
      maxAge: 30 * 60, // 30 minutes
      sameSite: 'strict',
    });
  }

  getLastVisitedPage(): string | null {
    return this.get('last_visited');
  }

  setAbtestVariant(test: string, variant: string): void {
    this.set(`abtest_${test}`, variant, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'strict',
    });
  }

  getAbtestVariant(test: string): string | null {
    return this.get(`abtest_${test}`);
  }

  setFeatureFlag(flag: string, enabled: boolean): void {
    this.set(`feature_${flag}`, enabled.toString(), {
      maxAge: 24 * 60 * 60, // 24 hours
      sameSite: 'strict',
    });
  }

  getFeatureFlag(flag: string): boolean {
    const value = this.get(`feature_${flag}`);
    return value === 'true';
  }

  setDismissedBanner(banner: string): void {
    const dismissed = this.getJson<string[]>('dismissed_banners') || [];
    
    if (!dismissed.includes(banner)) {
      dismissed.push(banner);
      this.setJson('dismissed_banners', dismissed, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: 'strict',
      });
    }
  }

  isBannerDismissed(banner: string): boolean {
    const dismissed = this.getJson<string[]>('dismissed_banners') || [];
    return dismissed.includes(banner);
  }

  setNotificationPreference(channel: string, enabled: boolean): void {
    const preferences = this.getJson<Record<string, boolean>>('notification_prefs') || {};
    preferences[channel] = enabled;
    
    this.setJson('notification_prefs', preferences, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
    });
  }

  getNotificationPreference(channel: string): boolean {
    const preferences = this.getJson<Record<string, boolean>>('notification_prefs') || {};
    return preferences[channel] !== false; // Default to true
  }

  setUserPreferences(prefs: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    newsletter?: boolean;
    marketingEmails?: boolean;
  }): void {
    const current = this.getJson<Record<string, boolean>>('user_prefs') || {};
    
    this.setJson('user_prefs', {
      ...current,
      ...prefs,
      updated: Date.now(),
    }, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'strict',
    });
  }

  getUserPreferences(): Record<string, boolean> {
    return this.getJson('user_prefs') || {};
  }

  exportCookies(): string {
    const cookies = this.getAll();
    return JSON.stringify(cookies, null, 2);
  }

  importCookies(json: string): void {
    try {
      const cookies = JSON.parse(json);
      
      for (const [name, value] of Object.entries(cookies)) {
        if (typeof value === 'string') {
          this.set(name, value);
        }
      }
    } catch (error) {
      console.error('Failed to import cookies:', error);
    }
  }

  validateCookie(name: string, validator: (value: string) => boolean): boolean {
    const value = this.get(name);
    
    if (!value) {
      return false;
    }
    
    return validator(value);
  }

  migrateCookie(oldName: string, newName: string, transformer?: (value: string) => string): void {
    const oldValue = this.get(oldName);
    
    if (oldValue) {
      const newValue = transformer ? transformer(oldValue) : oldValue;
      this.set(newName, newValue);
      this.delete(oldName);
    }
  }

  async syncWithServer(): Promise<void> {
    // This would sync cookies with server-side storage
    // Implementation depends on your backend
    console.log('Cookie sync with server not implemented');
  }

  getCookieMetadata(): Array<{
    name: string;
    purpose: string;
    category: 'necessary' | 'analytics' | 'marketing' | 'preferences';
    expiry: string;
  }> {
    return [
      {
        name: 'cookie_consent',
        purpose: 'Stores user cookie consent preferences',
        category: 'necessary',
        expiry: '1 year',
      },
      {
        name: 'theme',
        purpose: 'Stores user theme preference',
        category: 'preferences',
        expiry: '1 year',
      },
      {
        name: 'language',
        purpose: 'Stores user language preference',
        category: 'preferences',
        expiry: '1 year',
      },
      {
        name: 'cart_id',
        purpose: 'Stores guest cart identifier',
        category: 'necessary',
        expiry: '7 days',
      },
      {
        name: 'guest_token',
        purpose: 'Stores guest session token',
        category: 'necessary',
        expiry: '24 hours',
      },
      {
        name: 'last_visited',
        purpose: 'Stores last visited page for navigation',
        category: 'analytics',
        expiry: '30 minutes',
      },
    ];
  }
}

export const cookieManager = CookieManager.getInstance();
