import { z } from 'zod';

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
