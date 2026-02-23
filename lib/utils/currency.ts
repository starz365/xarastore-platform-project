import { settingsManager } from './settings';

export const CURRENCY = {
  code: 'KES',
  symbol: 'KES',
  name: 'Kenyan Shilling',
  locale: 'en-KE',
} as const;



export async function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): Promise<string> {
  const settings = await settingsManager.getCurrencySettings();
  
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}


/*
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}
*/

export function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `KES ${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `KES ${(price / 1000).toFixed(1)}K`;
  }
  return `KES ${price.toLocaleString('en-KE')}`;
}

export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/*
export function calculateTax(amount: number, taxRate: number = 0.16): number {
  return Math.round(amount * taxRate);
}
*/



export async function calculateTax(subtotal: number): Promise<number> {
  const settings = await settingsManager.getSiteSettings();
  return Math.round(subtotal * settings.tax_rate);
}

export async function calculateTotal(subtotal: number): Promise<{
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}> {
  const shipping = await calculateShipping(subtotal);
  const tax = await calculateTax(subtotal);
  const total = subtotal + shipping + tax;
  
  return {
    subtotal,
    shipping,
    tax,
    total,
  };
}


export async function calculateShipping(subtotal: number): Promise<number> {
  const settings = await settingsManager.getSiteSettings();
  
  if (subtotal >= settings.shipping_free_threshold) {
    return 0;
  }
  
  return settings.shipping_standard_price;
}



/*
export function calculateShipping(amount: number): number {
  if (amount >= 2000) return 0; // Free shipping over 2000 KES
  if (amount >= 1000) return 199; // Reduced shipping
  return 299; // Standard shipping
}
*/

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    return `+254${cleaned}`;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('07')) {
    return `+254${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }
  
  return phone;
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Kenyan mobile numbers: 2547xxxxxxxx, 07xxxxxxxx, 7xxxxxxxx
  const patterns = [
    /^2547\d{8}$/, // +254 prefix
    /^07\d{8}$/,   // 07 prefix
    /^7\d{8}$/,    // 7 prefix
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

