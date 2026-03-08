import { z } from 'zod';

/**
 * Sanitize search parameters to prevent XSS attacks
 */
export function sanitizeSearchParams(input: string): string {
  if (!input) return '';
  
  // Remove any HTML tags
  const noHtml = input.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  const encoded = noHtml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Limit length
  return encoded.slice(0, 200);
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(page: number, minPage: number = 1, maxPage: number = 1000): number {
  const parsedPage = Number(page);
  
  if (isNaN(parsedPage) || parsedPage < minPage) {
    return minPage;
  }
  
  if (parsedPage > maxPage) {
    return maxPage;
  }
  
  return Math.floor(parsedPage);
}

/**
 * Validate price range parameters
 */
export function validatePriceRange(
  minPrice?: number,
  maxPrice?: number,
  globalMin: number = 0,
  globalMax: number = 1000000
): { min: number | undefined; max: number | undefined } {
  let validatedMin = minPrice;
  let validatedMax = maxPrice;

  // Validate min price
  if (validatedMin !== undefined) {
    const parsedMin = Number(validatedMin);
    if (isNaN(parsedMin) || parsedMin < globalMin) {
      validatedMin = undefined;
    } else if (parsedMin > globalMax) {
      validatedMin = globalMax;
    } else {
      validatedMin = Math.floor(parsedMin);
    }
  }

  // Validate max price
  if (validatedMax !== undefined) {
    const parsedMax = Number(validatedMax);
    if (isNaN(parsedMax) || parsedMax > globalMax) {
      validatedMax = undefined;
    } else if (parsedMax < globalMin) {
      validatedMax = globalMin;
    } else {
      validatedMax = Math.floor(parsedMax);
    }
  }

  // Ensure min <= max
  if (validatedMin !== undefined && validatedMax !== undefined && validatedMin > validatedMax) {
    validatedMin = undefined;
    validatedMax = undefined;
  }

  return { min: validatedMin, max: validatedMax };
}

/**
 * Validate sort field against allowed values
 */
export function validateSortField(
  sortBy: string,
  allowedFields: string[] = [
    'featured',
    'newest',
    'price_low',
    'price_high',
    'rating',
    'name_asc',
    'name_desc',
    'popularity',
    'discount',
    'relevance',
  ]
): string {
  if (!sortBy) return 'featured';
  
  const normalized = sortBy.toLowerCase().trim();
  
  if (allowedFields.includes(normalized)) {
    return normalized;
  }
  
  return 'featured';
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (international)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate and sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

/**
 * Validate and parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  maxRangeDays: number = 365
): { isValid: boolean; error?: string } {
  const now = new Date();
  
  if (startDate > endDate) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  if (startDate < now) {
    return { isValid: false, error: 'Start date cannot be in the past' };
  }
  
  const rangeMs = endDate.getTime() - startDate.getTime();
  const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
  
  if (rangeDays > maxRangeDays) {
    return { isValid: false, error: `Date range cannot exceed ${maxRangeDays} days` };
  }
  
  return { isValid: true };
}

/**
 * Validate and format currency
 */
export function validateCurrency(
  amount: number,
  currency: string = 'KES',
  min: number = 0,
  max: number = 1000000
): { isValid: boolean; formatted: string; error?: string } {
  const validCurrencies = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];
  
  if (!validCurrencies.includes(currency)) {
    return { isValid: false, formatted: '', error: 'Invalid currency' };
  }
  
  if (isNaN(amount) || amount < min) {
    return { isValid: false, formatted: '', error: `Amount must be at least ${min}` };
  }
  
  if (amount > max) {
    return { isValid: false, formatted: '', error: `Amount cannot exceed ${max}` };
  }
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return {
    isValid: true,
    formatted: formatter.format(amount),
  };
}

/**
 * Validate coordinates
 */
export function validateCoordinates(
  lat: number,
  lng: number
): { isValid: boolean; error?: string } {
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { isValid: true };
}
