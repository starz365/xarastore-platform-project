import { z } from 'zod';

// Schema definitions
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^(?:254|\+254|0)?(7\d{8})$/, 'Please enter a valid Kenyan phone number');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address is too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name is too long'),
  state: z.string().min(1, 'State/Region is required').max(100, 'State/Region name is too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code is too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name is too long'),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name is too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
  price: z.number().min(0, 'Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU is too long'),
});

export const cardSchema = z.object({
  number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be in MM/YY format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  name: z.string().min(1, 'Cardholder name is required'),
});

export const mpesaSchema = z.object({
  phoneNumber: phoneSchema,
  amount: z.number().min(1, 'Amount must be at least KES 1').max(150000, 'Maximum amount is KES 150,000'),
});

// Validation functions with Zod
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  const result = phoneSchema.safeParse(phone);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validateName(name: string): { isValid: boolean; error?: string } {
  const result = nameSchema.safeParse(name);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File must be an image (JPEG, PNG, WebP, or GIF)',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 10MB',
    };
  }

  return { isValid: true };
}

export function validatePrice(price: number): boolean {
  return price >= 0 && price <= 100000000; // Max KES 100 million
}

export function validateStock(stock: number): boolean {
  return stock >= 0 && stock <= 1000000; // Max 1 million items
}

export function validateDiscountPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function validateOrderQuantity(quantity: number, availableStock: number): boolean {
  return quantity > 0 && quantity <= availableStock && quantity <= 100; // Max 100 per order
}

export function validatePostalCode(postalCode: string, country: string): boolean {
  if (country === 'KE') {
    // Kenyan postal codes: 5 digits
    return /^\d{5}$/.test(postalCode);
  }
  return postalCode.length > 0;
}

// Additional utility validation functions

/**
 * Validates that a value is not empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Validates a product ID format (UUID)
 */
export function validateProductId(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates a URL slug
 */
export function validateSlug(slug: any): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validates and sanitizes a string (removes HTML tags)
 */
export function sanitizeString(input: any, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  const sanitized = input.replace(/<[^>]*>/g, '');
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Validates a numeric ID
 */
export function validateNumericId(id: any): boolean {
  if (typeof id === 'number') return Number.isInteger(id) && id > 0;
  if (typeof id === 'string') return /^\d+$/.test(id) && parseInt(id, 10) > 0;
  return false;
}

/**
 * Validates an ISO date string
 */
export function validateISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Validates a future date
 */
export function validateFutureDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const now = new Date();
    return date instanceof Date && !isNaN(date.getTime()) && date > now;
  } catch {
    return false;
  }
}

/**
 * Safely parses JSON with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validates a Kenyan ID number
 */
export function validateKenyanID(id: string): boolean {
  return /^\d{7,8}$/.test(id);
}

/**
 * Validates a Kenyan KRA PIN
 */
export function validateKraPin(pin: string): boolean {
  return /^[A-Z]\d{9}[A-Z]$/.test(pin);
}

/**
 * Validates M-Pesa transaction ID
 */
export function validateMpesaTransactionId(transactionId: string): boolean {
  return /^[A-Z0-9]{10,20}$/.test(transactionId);
}

/**
 * Validates credit card number using Luhn algorithm
 */
export function validateCreditCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (!/^\d{16}$/.test(cleaned)) return false;
  
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
 * Validates that a value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validates file size
 */
export function validateFileSize(file: File, maxSizeMB: number): { isValid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }
  return { isValid: true };
}

/**
 * Validates file type
 */
export function validateFileType(file: File, allowedTypes: string[]): { isValid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type must be: ${allowedTypes.join(', ')}`,
    };
  }
  return { isValid: true };
}
