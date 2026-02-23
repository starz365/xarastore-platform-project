tests/unit/utils/currency.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPrice,
  calculateDiscountPercentage,
  calculateTax,
  calculateShipping,
  formatPhoneNumber,
  validatePhoneNumber,
} from '@/lib/utils/currency';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('formats Kenyan Shillings correctly', () => {
      expect(formatCurrency(1000)).toBe('KES 1,000');
      expect(formatCurrency(5000)).toBe('KES 5,000');
      expect(formatCurrency(12500)).toBe('KES 12,500');
      expect(formatCurrency(1000000)).toBe('KES 1,000,000');
    });

    it('handles decimal amounts correctly', () => {
      expect(formatCurrency(1000.50)).toBe('KES 1,001'); // Rounded to nearest KES
      expect(formatCurrency(999.99)).toBe('KES 1,000'); // Rounded up
      expect(formatCurrency(1000.49)).toBe('KES 1,000'); // Rounded down
    });

    it('formats with custom options', () => {
      expect(formatCurrency(1000, { minimumFractionDigits: 2 })).toBe('KES 1,000.00');
      expect(formatCurrency(1000.50, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        .toBe('KES 1,000.50');
      expect(formatCurrency(1000, { style: 'decimal' })).toBe('1,000');
    });

    it('handles zero and negative amounts', () => {
      expect(formatCurrency(0)).toBe('KES 0');
      expect(formatCurrency(-1000)).toBe('-KES 1,000');
      expect(formatCurrency(-5000)).toBe('-KES 5,000');
    });

    it('handles very large amounts', () => {
      expect(formatCurrency(1000000000)).toBe('KES 1,000,000,000');
      expect(formatCurrency(999999999.99)).toBe('KES 1,000,000,000');
    });
  });

  describe('formatPrice', () => {
    it('formats prices in millions', () => {
      expect(formatPrice(1500000)).toBe('KES 1.5M');
      expect(formatPrice(2500000)).toBe('KES 2.5M');
      expect(formatPrice(1000000)).toBe('KES 1.0M');
      expect(formatPrice(1250000)).toBe('KES 1.3M'); // 1.25M rounded to 1.3M
    });

    it('formats prices in thousands', () => {
      expect(formatPrice(1500)).toBe('KES 1.5K');
      expect(formatPrice(2500)).toBe('KES 2.5K');
      expect(formatPrice(1000)).toBe('KES 1.0K');
      expect(formatPrice(1250)).toBe('KES 1.3K'); // 1.25K rounded to 1.3K
    });

    it('formats prices under 1000 normally', () => {
      expect(formatPrice(999)).toBe('KES 999');
      expect(formatPrice(500)).toBe('KES 500');
      expect(formatPrice(100)).toBe('KES 100');
      expect(formatPrice(0)).toBe('KES 0');
    });

    it('handles decimal prices correctly', () => {
      expect(formatPrice(1500.50)).toBe('KES 1.5K');
      expect(formatPrice(1250.75)).toBe('KES 1.3K');
      expect(formatPrice(999.99)).toBe('KES 1,000'); // Rounded up to 1000
    });

    it('handles negative prices', () => {
      expect(formatPrice(-1500)).toBe('-KES 1.5K');
      expect(formatPrice(-2500000)).toBe('-KES 2.5M');
      expect(formatPrice(-500)).toBe('-KES 500');
    });
  });

  describe('calculateDiscountPercentage', () => {
    it('calculates correct discount percentage', () => {
      expect(calculateDiscountPercentage(1000, 800)).toBe(20); // 20% off
      expect(calculateDiscountPercentage(5000, 4000)).toBe(20); // 20% off
      expect(calculateDiscountPercentage(10000, 7500)).toBe(25); // 25% off
      expect(calculateDiscountPercentage(200, 150)).toBe(25); // 25% off
    });

    it('returns 0 when no discount or price increase', () => {
      expect(calculateDiscountPercentage(1000, 1000)).toBe(0); // No discount
      expect(calculateDiscountPercentage(1000, 1200)).toBe(0); // Price increased
      expect(calculateDiscountPercentage(0, 800)).toBe(0); // Original price is 0
      expect(calculateDiscountPercentage(-1000, 800)).toBe(0); // Negative original price
    });

    it('rounds percentages correctly', () => {
      expect(calculateDiscountPercentage(1000, 833)).toBe(17); // 16.7% rounded to 17
      expect(calculateDiscountPercentage(300, 257)).toBe(14); // 14.33% rounded to 14
      expect(calculateDiscountPercentage(1000, 666)).toBe(33); // 33.4% rounded to 33
    });

    it('handles edge cases', () => {
      expect(calculateDiscountPercentage(1, 0.5)).toBe(50); // 50% off
      expect(calculateDiscountPercentage(1000000, 500000)).toBe(50); // 50% off large amount
      expect(calculateDiscountPercentage(100, 1)).toBe(99); // 99% off
    });
  });

  describe('calculateTax', () => {
    it('calculates 16% VAT correctly', () => {
      expect(calculateTax(1000)).toBe(160); // 1000 * 0.16 = 160
      expect(calculateTax(5000)).toBe(800); // 5000 * 0.16 = 800
      expect(calculateTax(12500)).toBe(2000); // 12500 * 0.16 = 2000
    });

    it('rounds tax amounts correctly', () => {
      expect(calculateTax(100)).toBe(16); // 100 * 0.16 = 16
      expect(calculateTax(333)).toBe(53); // 333 * 0.16 = 53.28 rounded to 53
      expect(calculateTax(777)).toBe(124); // 777 * 0.16 = 124.32 rounded to 124
    });

    it('accepts custom tax rates', () => {
      expect(calculateTax(1000, 0.10)).toBe(100); // 10% tax
      expect(calculateTax(1000, 0.20)).toBe(200); // 20% tax
      expect(calculateTax(1000, 0.05)).toBe(50); // 5% tax
    });

    it('handles zero and negative amounts', () => {
      expect(calculateTax(0)).toBe(0);
      expect(calculateTax(-1000)).toBe(-160); // Negative amount, negative tax
      expect(calculateTax(0, 0.16)).toBe(0);
    });

    it('handles decimal amounts correctly', () => {
      expect(calculateTax(1000.50)).toBe(160); // 1000.50 * 0.16 = 160.08 rounded to 160
      expect(calculateTax(999.99)).toBe(160); // 999.99 * 0.16 = 159.9984 rounded to 160
    });
  });

  describe('calculateShipping', () => {
    it('provides free shipping for orders over 2000 KES', () => {
      expect(calculateShipping(2000)).toBe(0);
      expect(calculateShipping(2500)).toBe(0);
      expect(calculateShipping(10000)).toBe(0);
      expect(calculateShipping(2000.01)).toBe(0);
    });

    it('charges reduced shipping for orders between 1000 and 1999 KES', () => {
      expect(calculateShipping(1000)).toBe(199);
      expect(calculateShipping(1500)).toBe(199);
      expect(calculateShipping(1999.99)).toBe(199);
    });

    it('charges standard shipping for orders under 1000 KES', () => {
      expect(calculateShipping(999.99)).toBe(299);
      expect(calculateShipping(500)).toBe(299);
      expect(calculateShipping(100)).toBe(299);
      expect(calculateShipping(0)).toBe(299);
    });

    it('handles negative amounts', () => {
      expect(calculateShipping(-1000)).toBe(299); // Negative amount, standard shipping
      expect(calculateShipping(-5000)).toBe(299);
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 9-digit numbers starting with 7', () => {
      expect(formatPhoneNumber('712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('798765432')).toBe('+254798765432');
    });

    it('formats 10-digit numbers starting with 07', () => {
      expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('0798765432')).toBe('+254798765432');
    });

    it('formats 12-digit numbers starting with 254', () => {
      expect(formatPhoneNumber('254712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('254798765432')).toBe('+254798765432');
    });

    it('keeps already formatted numbers unchanged', () => {
      expect(formatPhoneNumber('+254712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('+254798765432')).toBe('+254798765432');
    });

    it('returns original for invalid formats', () => {
      expect(formatPhoneNumber('12345')).toBe('12345'); // Too short
      expect(formatPhoneNumber('812345678')).toBe('812345678'); // Wrong prefix
      expect(formatPhoneNumber('abc')).toBe('abc'); // Not a number
      expect(formatPhoneNumber('')).toBe('');
    });

    it('handles numbers with spaces and dashes', () => {
      expect(formatPhoneNumber('0712 345 678')).toBe('+254712345678');
      expect(formatPhoneNumber('0712-345-678')).toBe('+254712345678');
      expect(formatPhoneNumber('254 712 345 678')).toBe('+254712345678');
    });
  });

  describe('validatePhoneNumber', () => {
    it('validates correct Kenyan mobile numbers', () => {
      expect(validatePhoneNumber('712345678')).toBe(true); // 7 prefix
      expect(validatePhoneNumber('0712345678')).toBe(true); // 07 prefix
      expect(validatePhoneNumber('254712345678')).toBe(true); // 254 prefix
      expect(validatePhoneNumber('+254712345678')).toBe(true); // +254 prefix
    });

    it('rejects invalid Kenyan mobile numbers', () => {
      expect(validatePhoneNumber('612345678')).toBe(false); // Wrong prefix
      expect(validatePhoneNumber('71234567')).toBe(false); // Too short
      expect(validatePhoneNumber('7123456789')).toBe(false); // Too long (10 digits with 7 prefix)
      expect(validatePhoneNumber('0812345678')).toBe(false); // Wrong 0 prefix
      expect(validatePhoneNumber('254612345678')).toBe(false); // Wrong 254 prefix
      expect(validatePhoneNumber('abc')).toBe(false); // Not a number
      expect(validatePhoneNumber('')).toBe(false); // Empty
    });

    it('handles formatted numbers', () => {
      expect(validatePhoneNumber('0712 345 678')).toBe(true);
      expect(validatePhoneNumber('0712-345-678')).toBe(true);
      expect(validatePhoneNumber('+254 712 345 678')).toBe(true);
    });

    it('validates other Kenyan mobile prefixes', () => {
      // Safaricom prefixes
      expect(validatePhoneNumber('711234567')).toBe(true);
      expect(validatePhoneNumber('721234567')).toBe(true);
      expect(validatePhoneNumber('731234567')).toBe(true);
      expect(validatePhoneNumber('741234567')).toBe(true);
      expect(validatePhoneNumber('751234567')).toBe(true);
      expect(validatePhoneNumber('761234567')).toBe(true);
      
      // Airtel prefixes
      expect(validatePhoneNumber('771234567')).toBe(true);
      expect(validatePhoneNumber('781234567')).toBe(true);
      
      // Telkom prefixes
      expect(validatePhoneNumber('791234567')).toBe(true);
    });

    it('rejects landline numbers', () => {
      expect(validatePhoneNumber('0201234567')).toBe(false); // Nairobi landline
      expect(validatePhoneNumber('0411234567')).toBe(false); // Mombasa landline
    });
  });

  describe('integration between functions', () => {
    it('calculates complete order total correctly', () => {
      const subtotal = 1500;
      const shipping = calculateShipping(subtotal); // 199
      const tax = calculateTax(subtotal); // 240
      const total = subtotal + shipping + tax; // 1500 + 199 + 240 = 1939
      
      expect(shipping).toBe(199); // Reduced shipping
      expect(tax).toBe(240); // 16% of 1500 = 240
      expect(total).toBe(1939);
      expect(formatCurrency(total)).toBe('KES 1,939');
    });

    it('handles free shipping scenario', () => {
      const subtotal = 2500;
      const shipping = calculateShipping(subtotal); // 0
      const tax = calculateTax(subtotal); // 400
      const total = subtotal + shipping + tax; // 2500 + 0 + 400 = 2900
      
      expect(shipping).toBe(0);
      expect(tax).toBe(400);
      expect(total).toBe(2900);
    });

    it('formats discounted prices correctly', () => {
      const originalPrice = 5000;
      const salePrice = 4000;
      const discount = calculateDiscountPercentage(originalPrice, salePrice);
      const formattedSale = formatCurrency(salePrice);
      const formattedOriginal = formatCurrency(originalPrice);
      
      expect(discount).toBe(20);
      expect(formattedSale).toBe('KES 4,000');
      expect(formattedOriginal).toBe('KES 5,000');
    });
  });
});
