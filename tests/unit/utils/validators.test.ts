import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateRequired,
  validateNumber,
  validateURL,
  validateCreditCard,
  validateExpiryDate,
  validateCVV,
  validatePostalCode,
  validateAddress,
  validateQuantity,
  validatePrice,
  validateSKU,
  validateSlug,
  validateRating,
  validateStock,
  validateDate,
  validateFileSize,
  validateFileType,
  validateArray,
  validateObject,
  validateMinLength,
  validateMaxLength,
  validateRange,
  validatePattern,
  validateKenyaID,
  validateMpesaNumber,
  validateBankAccount,
} from '@/lib/utils/validators';

describe('Email Validators', () => {
  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('first.last@sub.domain.com')).toBe(true);
      expect(validateEmail('email+tag@example.com')).toBe(true);
      expect(validateEmail('123@numbers.com')).toBe(true);
      expect(validateEmail('upper-CASE@DOMAIN.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('test')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
      expect(validateEmail('test@com.')).toBe(false);
      expect(validateEmail('test@com')).toBe(false);
      expect(validateEmail('test@example..com')).toBe(false);
      expect(validateEmail('test example@domain.com')).toBe(false);
      expect(validateEmail('test@example.c')).toBe(false); // TLD too short
    });

    it('validates email with custom domain check', () => {
      expect(validateEmail('test@xarastore.com', 'xarastore.com')).toBe(true);
      expect(validateEmail('test@example.com', 'xarastore.com')).toBe(false);
      expect(validateEmail('admin@xarastore.co.ke', 'xarastore.co.ke')).toBe(true);
    });
  });
});

describe('Password Validators', () => {
  describe('validatePassword', () => {
    it('validates strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('Another1@Password')).toBe(true);
      expect(validatePassword('Test123$')).toBe(true); // Minimum length
      expect(validatePassword('A1!bcdefgh')).toBe(true); // 10 chars with all requirements
    });

    it('rejects weak passwords', () => {
      expect(validatePassword('')).toBe(false);
      expect(validatePassword('short')).toBe(false); // Too short
      expect(validatePassword('nouppercase123!')).toBe(false); // No uppercase
      expect(validatePassword('NOLOWERCASE123!')).toBe(false); // No lowercase
      expect(validatePassword('NoNumbers!')).toBe(false); // No numbers
      expect(validatePassword('NoSpecial123')).toBe(false); // No special chars
      expect(validatePassword('12345678')).toBe(false); // Only numbers
      expect(validatePassword('abcdefgh')).toBe(false); // Only lowercase
      expect(validatePassword('ABCDEFGH')).toBe(false); // Only uppercase
      expect(validatePassword('!@#$%^&*')).toBe(false); // Only special chars
    });

    it('validates with custom requirements', () => {
      expect(validatePassword('Test123', { minLength: 6 })).toBe(true);
      expect(validatePassword('TEST123!', { requireLowercase: false })).toBe(true);
      expect(validatePassword('test123!', { requireUppercase: false })).toBe(true);
      expect(validatePassword('TestPass!', { requireNumbers: false })).toBe(true);
      expect(validatePassword('Test1234', { requireSpecialChars: false })).toBe(true);
    });
  });
});

describe('Phone Validators', () => {
  describe('validatePhone', () => {
    it('validates Kenyan phone numbers', () => {
      expect(validatePhone('0712345678')).toBe(true); // Safaricom
      expect(validatePhone('0723456789')).toBe(true); // Safaricom
      expect(validatePhone('0734567890')).toBe(true); // Airtel
      expect(validatePhone('0745678901')).toBe(true); // Telkom
      expect(validatePhone('0756789012')).toBe(true); // Equitel
      expect(validatePhone('0767890123')).toBe(true); // Mobile Pay
      expect(validatePhone('0778901234')).toBe(true); // Airtel
      expect(validatePhone('0789012345')).toBe(true); // Airtel
      expect(validatePhone('0790123456')).toBe(true); // Safaricom
      expect(validatePhone('+254712345678')).toBe(true); // International format
      expect(validatePhone('254723456789')).toBe(true); // Without plus
      expect(validatePhone('712345678')).toBe(true); // Without prefix
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('12345')).toBe(false); // Too short
      expect(validatePhone('0612345678')).toBe(false); // Invalid prefix
      expect(validatePhone('071234567')).toBe(false); // Too short (9 digits)
      expect(validatePhone('07123456789')).toBe(false); // Too long (11 digits)
      expect(validatePhone('0712 345 678')).toBe(false); // With spaces
      expect(validatePhone('0712-345-678')).toBe(false); // With dashes
      expect(validatePhone('abc')).toBe(false); // Not a number
      expect(validatePhone('0201234567')).toBe(false); // Landline
    });

    it('validates with custom country code', () => {
      expect(validatePhone('+255712345678', 'TZ')).toBe(true); // Tanzania
      expect(validatePhone('+256712345678', 'UG')).toBe(true); // Uganda
      expect(validatePhone('+254712345678', 'UG')).toBe(false); // Wrong country
    });
  });

  describe('validateMpesaNumber', () => {
    it('validates M-Pesa registered numbers', () => {
      expect(validateMpesaNumber('0712345678')).toBe(true);
      expect(validateMpesaNumber('0723456789')).toBe(true);
      expect(validateMpesaNumber('0734567890')).toBe(true);
      expect(validateMpesaNumber('0745678901')).toBe(true);
      expect(validateMpesaNumber('0756789012')).toBe(true);
      expect(validateMpesaNumber('0767890123')).toBe(true);
      expect(validateMpesaNumber('0778901234')).toBe(true);
      expect(validateMpesaNumber('0789012345')).toBe(true);
      expect(validateMpesaNumber('0790123456')).toBe(true);
      expect(validateMpesaNumber('254712345678')).toBe(true);
    });

    it('rejects non-M-Pesa numbers', () => {
      expect(validateMpesaNumber('')).toBe(false);
      expect(validateMpesaNumber('0201234567')).toBe(false); // Landline
      expect(validateMpesaNumber('0800123456')).toBe(false); // Toll-free
      expect(validateMpesaNumber('0700123456')).toBe(false); // Invalid prefix
      expect(validateMpesaNumber('07123')).toBe(false); // Too short
    });
  });
});

describe('Name Validators', () => {
  describe('validateName', () => {
    it('validates proper names', () => {
      expect(validateName('John')).toBe(true);
      expect(validateName('John Doe')).toBe(true);
      expect(validateName('Mary-Jane')).toBe(true);
      expect(validateName('O\'Connor')).toBe(true);
      expect(validateName('Élise')).toBe(true); // Unicode
      expect(validateName('Mohamed Ali')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(validateName('')).toBe(false);
      expect(validateName('J')).toBe(false); // Too short
      expect(validateName('John123')).toBe(false); // Contains numbers
      expect(validateName('John@Doe')).toBe(false); // Contains special chars
      expect(validateName('   ')).toBe(false); // Only spaces
      expect(validateName('A')).toBe(false); // Single character
    });

    it('validates with custom length', () => {
      expect(validateName('Jo', 2, 50)).toBe(true); // Minimum 2 chars
      expect(validateName('J', 2, 50)).toBe(false); // Too short
      expect(validateName('A'.repeat(51), 2, 50)).toBe(false); // Too long
    });
  });
});

describe('Required Field Validators', () => {
  describe('validateRequired', () => {
    it('validates non-empty values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired(123)).toBe(true);
      expect(validateRequired(true)).toBe(true);
      expect(validateRequired(false)).toBe(true); // Boolean false is still a value
      expect(validateRequired(0)).toBe(true); // Zero is a value
      expect(validateRequired([])).toBe(true); // Empty array is a value
      expect(validateRequired({})).toBe(true); // Empty object is a value
    });

    it('rejects empty/null/undefined values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
      expect(validateRequired('   ')).toBe(false); // Only whitespace
      expect(validateRequired('\t\n ')).toBe(false); // Only whitespace chars
    });

    it('validates with custom trim option', () => {
      expect(validateRequired(' test ', { trim: true })).toBe(true);
      expect(validateRequired('   ', { trim: true })).toBe(false);
    });
  });
});

describe('Number Validators', () => {
  describe('validateNumber', () => {
    it('validates numeric values', () => {
      expect(validateNumber('123')).toBe(true);
      expect(validateNumber('123.45')).toBe(true);
      expect(validateNumber('-123')).toBe(true);
      expect(validateNumber('0')).toBe(true);
      expect(validateNumber('+123')).toBe(true);
      expect(validateNumber(123)).toBe(true);
      expect(validateNumber(123.45)).toBe(true);
      expect(validateNumber(-123)).toBe(true);
      expect(validateNumber(0)).toBe(true);
    });

    it('rejects non-numeric values', () => {
      expect(validateNumber('')).toBe(false);
      expect(validateNumber('abc')).toBe(false);
      expect(validateNumber('123abc')).toBe(false);
      expect(validateNumber('12.34.56')).toBe(false);
      expect(validateNumber(null)).toBe(false);
      expect(validateNumber(undefined)).toBe(false);
      expect(validateNumber(true)).toBe(false);
      expect(validateNumber(false)).toBe(false);
      expect(validateNumber({})).toBe(false);
      expect(validateNumber([])).toBe(false);
    });

    it('validates with min/max constraints', () => {
      expect(validateNumber('50', 0, 100)).toBe(true);
      expect(validateNumber('0', 0, 100)).toBe(true);
      expect(validateNumber('100', 0, 100)).toBe(true);
      expect(validateNumber('-1', 0, 100)).toBe(false);
      expect(validateNumber('101', 0, 100)).toBe(false);
      expect(validateNumber('50.5', 0, 100)).toBe(true);
    });

    it('validates integer only', () => {
      expect(validateNumber('123', undefined, undefined, true)).toBe(true);
      expect(validateNumber('123.45', undefined, undefined, true)).toBe(false);
      expect(validateNumber('0', undefined, undefined, true)).toBe(true);
      expect(validateNumber('-456', undefined, undefined, true)).toBe(true);
    });
  });

  describe('validateQuantity', () => {
    it('validates product quantities', () => {
      expect(validateQuantity('1')).toBe(true);
      expect(validateQuantity('10')).toBe(true);
      expect(validateQuantity('999')).toBe(true);
      expect(validateQuantity('0')).toBe(false); // Must be at least 1
      expect(validateQuantity('-1')).toBe(false);
      expect(validateQuantity('1000')).toBe(true); // Default max is 9999
      expect(validateQuantity('10000')).toBe(false); // Exceeds default max
    });

    it('validates with custom stock limit', () => {
      expect(validateQuantity('5', 10)).toBe(true);
      expect(validateQuantity('10', 10)).toBe(true);
      expect(validateQuantity('11', 10)).toBe(false);
      expect(validateQuantity('0', 10)).toBe(false);
    });
  });

  describe('validatePrice', () => {
    it('validates price amounts', () => {
      expect(validatePrice('100')).toBe(true);
      expect(validatePrice('100.50')).toBe(true);
      expect(validatePrice('0.99')).toBe(true);
      expect(validatePrice('0')).toBe(true); // Free product
      expect(validatePrice('-100')).toBe(false); // Negative price
      expect(validatePrice('1000000000')).toBe(true); // Large amount
      expect(validatePrice('')).toBe(false);
      expect(validatePrice('abc')).toBe(false);
    });

    it('validates with min price constraint', () => {
      expect(validatePrice('100', 50)).toBe(true);
      expect(validatePrice('50', 50)).toBe(true);
      expect(validatePrice('49.99', 50)).toBe(false);
      expect(validatePrice('0', 1)).toBe(false); // Must be at least 1
    });
  });

  describe('validateRating', () => {
    it('validates star ratings', () => {
      expect(validateRating('1')).toBe(true);
      expect(validateRating('3')).toBe(true);
      expect(validateRating('5')).toBe(true);
      expect(validateRating('3.5')).toBe(true);
      expect(validateRating('0')).toBe(false); // Must be at least 1
      expect(validateRating('5.1')).toBe(false); // Must be at most 5
      expect(validateRating('6')).toBe(false);
      expect(validateRating('-1')).toBe(false);
      expect(validateRating('')).toBe(false);
    });

    it('validates decimal ratings', () => {
      expect(validateRating('4.7')).toBe(true);
      expect(validateRating('2.3')).toBe(true);
      expect(validateRating('0.5')).toBe(false); // Below minimum
      expect(validateRating('5.0')).toBe(true);
    });
  });

  describe('validateStock', () => {
    it('validates stock levels', () => {
      expect(validateStock('0')).toBe(true); // Out of stock is valid
      expect(validateStock('1')).toBe(true);
      expect(validateStock('1000')).toBe(true);
      expect(validateStock('-1')).toBe(false); // Negative stock
      expect(validateStock('')).toBe(false);
      expect(validateStock('abc')).toBe(false);
    });

    it('validates with minimum stock level', () => {
      expect(validateStock('10', 5)).toBe(true);
      expect(validateStock('5', 5)).toBe(true);
      expect(validateStock('4', 5)).toBe(false);
    });
  });
});

describe('String Validators', () => {
  describe('validateURL', () => {
    it('validates URLs', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://example.com')).toBe(true);
      expect(validateURL('https://www.example.com/path')).toBe(true);
      expect(validateURL('https://example.com/path?query=value')).toBe(true);
      expect(validateURL('https://example.com/#anchor')).toBe(true);
      expect(validateURL('ftp://example.com')).toBe(true);
      expect(validateURL('//cdn.example.com/image.jpg')).toBe(true); // Protocol-relative
    });

    it('rejects invalid URLs', () => {
      expect(validateURL('')).toBe(false);
      expect(validateURL('example.com')).toBe(false); // No protocol
      expect(validateURL('http://')).toBe(false); // No domain
      expect(validateURL('http://example')).toBe(false); // No TLD
      expect(validateURL('http://example..com')).toBe(false); // Double dot
      expect(validateURL('http://<script>')).toBe(false); // Invalid chars
    });

    it('validates with required protocols', () => {
      expect(validateURL('https://example.com', ['https'])).toBe(true);
      expect(validateURL('http://example.com', ['https'])).toBe(false);
      expect(validateURL('https://example.com', ['http', 'https'])).toBe(true);
    });
  });

  describe('validateSKU', () => {
    it('validates SKU formats', () => {
      expect(validateSKU('ABC-123')).toBe(true);
      expect(validateSKU('PROD-001')).toBe(true);
      expect(validateSKU('ITEM_456')).toBe(true);
      expect(validateSKU('123456')).toBe(true);
      expect(validateSKU('ABC123')).toBe(true);
      expect(validateSKU('')).toBe(false);
      expect(validateSKU('ABC 123')).toBe(false); // No spaces allowed
      expect(validateSKU('ABC@123')).toBe(false); // Invalid char
      expect(validateSKU('A'.repeat(51))).toBe(false); // Too long
    });

    it('validates with custom pattern', () => {
      expect(validateSKU('123-ABC', /^[A-Z]{3}-\d{3}$/)).toBe(true);
      expect(validateSKU('ABC-123', /^[A-Z]{3}-\d{3}$/)).toBe(true);
      expect(validateSKU('123ABC', /^[A-Z]{3}-\d{3}$/)).toBe(false);
    });
  });

  describe('validateSlug', () => {
    it('validates URL slugs', () => {
      expect(validateSlug('product-name')).toBe(true);
      expect(validateSlug('category-slug-123')).toBe(true);
      expect(validateSlug('test')).toBe(true);
      expect(validateSlug('product-name-2023')).toBe(true);
      expect(validateSlug('')).toBe(false);
      expect(validateSlug('Product-Name')).toBe(false); // Uppercase not allowed
      expect(validateSlug('product name')).toBe(false); // No spaces
      expect(validateSlug('product@name')).toBe(false); // Invalid char
      expect(validateSlug('-product-name')).toBe(false); // Cannot start with dash
      expect(validateSlug('product-name-')).toBe(false); // Cannot end with dash
      expect(validateSlug('product--name')).toBe(false); // No double dash
    });
  });

  describe('validateMinLength', () => {
    it('validates minimum length', () => {
      expect(validateMinLength('test', 3)).toBe(true);
      expect(validateMinLength('test', 4)).toBe(true);
      expect(validateMinLength('test', 5)).toBe(false);
      expect(validateMinLength('', 1)).toBe(false);
      expect(validateMinLength('   ', 1, true)).toBe(false); // Trimmed
      expect(validateMinLength(' a ', 1, true)).toBe(true); // Trimmed to 'a'
    });
  });

  describe('validateMaxLength', () => {
    it('validates maximum length', () => {
      expect(validateMaxLength('test', 5)).toBe(true);
      expect(validateMaxLength('test', 4)).toBe(true);
      expect(validateMaxLength('test', 3)).toBe(false);
      expect(validateMaxLength('', 10)).toBe(true);
      expect(validateMaxLength('   ', 2, true)).toBe(false); // Trimmed length 0
      expect(validateMaxLength(' abc ', 3, true)).toBe(true); // Trimmed to 'abc'
    });
  });

  describe('validatePattern', () => {
    it('validates against regex patterns', () => {
      expect(validatePattern('ABC123', /^[A-Z]{3}\d{3}$/)).toBe(true);
      expect(validatePattern('abc123', /^[A-Z]{3}\d{3}$/)).toBe(false);
      expect(validatePattern('ABC1234', /^[A-Z]{3}\d{3}$/)).toBe(false);
      expect(validatePattern('', /^.*$/)).toBe(true); // Empty matches .*
      expect(validatePattern('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)).toBe(true);
    });
  });
});

describe('Payment Validators', () => {
  describe('validateCreditCard', () => {
    it('validates credit card numbers', () => {
      expect(validateCreditCard('4111111111111111')).toBe(true); // Visa
      expect(validateCreditCard('5500000000000004')).toBe(true); // MasterCard
      expect(validateCreditCard('340000000000009')).toBe(true); // Amex (15 digits)
      expect(validateCreditCard('30000000000004')).toBe(true); // Diners (14 digits)
      expect(validateCreditCard('6011000000000004')).toBe(true); // Discover
      expect(validateCreditCard('')).toBe(false);
      expect(validateCreditCard('1234')).toBe(false); // Too short
      expect(validateCreditCard('4111111111111112')).toBe(false); // Invalid checksum
      expect(validateCreditCard('abc')).toBe(false); // Not numbers
      expect(validateCreditCard('4111 1111 1111 1111')).toBe(false); // With spaces
    });

    it('validates specific card types', () => {
      expect(validateCreditCard('4111111111111111', 'visa')).toBe(true);
      expect(validateCreditCard('5500000000000004', 'mastercard')).toBe(true);
      expect(validateCreditCard('340000000000009', 'amex')).toBe(true);
      expect(validateCreditCard('4111111111111111', 'mastercard')).toBe(false); // Wrong type
    });
  });

  describe('validateExpiryDate', () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    it('validates future expiry dates', () => {
      // Next month
      expect(validateExpiryDate(`${currentMonth + 1}/${currentYear.toString().slice(2)}`)).toBe(true);
      // Next year
      expect(validateExpiryDate(`01/${(currentYear + 1).toString().slice(2)}`)).toBe(true);
      // Far future
      expect(validateExpiryDate('12/30')).toBe(true);
    });

    it('rejects past expiry dates', () => {
      // Last month
      expect(validateExpiryDate(`${currentMonth - 1}/${currentYear.toString().slice(2)}`)).toBe(false);
      // Last year
      expect(validateExpiryDate(`01/${(currentYear - 1).toString().slice(2)}`)).toBe(false);
      // Very old
      expect(validateExpiryDate('01/20')).toBe(false);
    });

    it('rejects invalid formats', () => {
      expect(validateExpiryDate('')).toBe(false);
      expect(validateExpiryDate('13/25')).toBe(false); // Invalid month
      expect(validateExpiryDate('00/25')).toBe(false); // Invalid month
      expect(validateExpiryDate('12/')).toBe(false); // Incomplete
      expect(validateExpiryDate('/25')).toBe(false);
      expect(validateExpiryDate('12/250')).toBe(false); // Wrong year format
      expect(validateExpiryDate('abc')).toBe(false);
    });
  });

  describe('validateCVV', () => {
    it('validates CVV codes', () => {
      expect(validateCVV('123')).toBe(true);
      expect(validateCVV('1234')).toBe(true);
      expect(validateCVV('')).toBe(false);
      expect(validateCVV('12')).toBe(false); // Too short
      expect(validateCVV('12345')).toBe(false); // Too long
      expect(validateCVV('abc')).toBe(false); // Not numbers
      expect(validateCVV('12a')).toBe(false); // Contains letter
    });

    it('validates with card type', () => {
      expect(validateCVV('123', 'visa')).toBe(true);
      expect(validateCVV('1234', 'visa')).toBe(true); // Visa can be 3 or 4
      expect(validateCVV('123', 'amex')).toBe(true);
      expect(validateCVV('1234', 'amex')).toBe(true); // Amex is 4 digits
      expect(validateCVV('123', 'mastercard')).toBe(true);
    });
  });

  describe('validateBankAccount', () => {
    it('validates bank account numbers', () => {
      expect(validateBankAccount('12345678')).toBe(true);
      expect(validateBankAccount('1234567890')).toBe(true);
      expect(validateBankAccount('')).toBe(false);
      expect(validateBankAccount('123')).toBe(false); // Too short
      expect(validateBankAccount('12345678901234567')).toBe(false); // Too long (max 16)
      expect(validateBankAccount('123abc')).toBe(false); // Contains letters
      expect(validateBankAccount('12 345 678')).toBe(false); // Contains spaces
    });

    it('validates with specific bank formats', () => {
      expect(validateBankAccount('1234567', 'equity')).toBe(true); // Equity: 7-13 digits
      expect(validateBankAccount('1234567890123', 'equity')).toBe(true);
      expect(validateBankAccount('123456', 'equity')).toBe(false); // Too short
      expect(validateBankAccount('12345678', 'kcb')).toBe(true); // KCB: 8-13 digits
      expect(validateBankAccount('1234567890123', 'kcb')).toBe(true);
    });
  });
});

describe('Address Validators', () => {
  describe('validatePostalCode', () => {
    it('validates Kenyan postal codes', () => {
      expect(validatePostalCode('00100')).toBe(true); // Nairobi GPO
      expect(validatePostalCode('80100')).toBe(true); // Mombasa
      expect(validatePostalCode('40100')).toBe(true); // Kisumu
      expect(validatePostalCode('20100')).toBe(true); // Nakuru
      expect(validatePostalCode('30100')).toBe(true); // Eldoret
      expect(validatePostalCode('')).toBe(false);
      expect(validatePostalCode('1234')).toBe(false); // Too short
      expect(validatePostalCode('123456')).toBe(false); // Too long
      expect(validatePostalCode('abcde')).toBe(false); // Not numbers
      expect(validatePostalCode('00000')).toBe(false); // Invalid (Kenyan codes don't start with 0 except 00100)
    });
  });

  describe('validateAddress', () => {
    it('validates address strings', () => {
      expect(validateAddress('123 Main Street')).toBe(true);
      expect(validateAddress('P.O. Box 123-456, Nairobi')).toBe(true);
      expect(validateAddress('Building 5, 2nd Floor, Westlands')).toBe(true);
      expect(validateAddress('')).toBe(false);
      expect(validateAddress('   ')).toBe(false);
      expect(validateAddress('a')).toBe(false); // Too short
      expect(validateAddress('A'.repeat(201))).toBe(false); // Too long
    });

    it('validates with custom constraints', () => {
      expect(validateAddress('123 Street', 5, 50)).toBe(true);
      expect(validateAddress('123', 5, 50)).toBe(false); // Too short
      expect(validateAddress('A'.repeat(51), 5, 50)).toBe(false); // Too long
    });
  });
});

describe('File Validators', () => {
  describe('validateFileSize', () => {
    it('validates file sizes', () => {
      const file1 = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file1, 'size', { value: 1024 * 1024 }); // 1MB

      const file2 = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file2, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      expect(validateFileSize(file1, 2 * 1024 * 1024)).toBe(true); // 1MB < 2MB limit
      expect(validateFileSize(file2, 2 * 1024 * 1024)).toBe(false); // 5MB > 2MB limit
    });

    it('handles non-file inputs', () => {
      expect(validateFileSize(null, 1024)).toBe(false);
      expect(validateFileSize(undefined, 1024)).toBe(false);
      expect(validateFileSize({}, 1024)).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('validates allowed file types', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pdfFile = new File([''], 'document.pdf', { type: 'application/pdf' });
      const textFile = new File([''], 'notes.txt', { type: 'text/plain' });

      expect(validateFileType(imageFile, ['image/jpeg', 'image/png'])).toBe(true);
      expect(validateFileType(pdfFile, ['image/jpeg', 'image/png'])).toBe(false);
      expect(validateFileType(pdfFile, ['application/pdf'])).toBe(true);
      expect(validateFileType(textFile, ['text/plain', 'application/pdf'])).toBe(true);
    });

    it('validates by file extension', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['.jpg', '.png', '.jpeg'])).toBe(true);
      expect(validateFileType(file, ['.pdf', '.doc'])).toBe(false);
    });

    it('handles files without type', () => {
      const file = new File([''], 'test.xyz');
      Object.defineProperty(file, 'type', { value: '' });
      expect(validateFileType(file, ['.jpg', '.png'])).toBe(false);
    });
  });
});

describe('Data Structure Validators', () => {
  describe('validateArray', () => {
    it('validates arrays', () => {
      expect(validateArray([1, 2, 3])).toBe(true);
      expect(validateArray([])).toBe(true);
      expect(validateArray(['a', 'b', 'c'])).toBe(true);
      expect(validateArray(null)).toBe(false);
      expect(validateArray(undefined)).toBe(false);
      expect(validateArray({})).toBe(false);
      expect(validateArray('array')).toBe(false);
      expect(validateArray(123)).toBe(false);
    });

    it('validates with min/max length', () => {
      expect(validateArray([1, 2, 3], 1, 5)).toBe(true);
      expect(validateArray([], 1, 5)).toBe(false); // Too short
      expect(validateArray([1, 2, 3, 4, 5, 6], 1, 5)).toBe(false); // Too long
      expect(validateArray([1], 1, 5)).toBe(true);
      expect(validateArray([1, 2, 3, 4, 5], 1, 5)).toBe(true);
    });
  });

  describe('validateObject', () => {
    it('validates objects', () => {
      expect(validateObject({})).toBe(true);
      expect(validateObject({ key: 'value' })).toBe(true);
      expect(validateObject(null)).toBe(false);
      expect(validateObject(undefined)).toBe(false);
      expect(validateObject([])).toBe(false);
      expect(validateObject('object')).toBe(false);
      expect(validateObject(123)).toBe(false);
    });

    it('validates with required keys', () => {
      expect(validateObject({ id: 1, name: 'Test' }, ['id', 'name'])).toBe(true);
      expect(validateObject({ id: 1 }, ['id', 'name'])).toBe(false); // Missing 'name'
      expect(validateObject({}, ['id'])).toBe(false);
    });
  });
});

describe('Date Validators', () => {
  describe('validateDate', () => {
    it('validates date strings', () => {
      expect(validateDate('2023-12-25')).toBe(true);
      expect(validateDate('2023-01-01')).toBe(true);
      expect(validateDate('')).toBe(false);
      expect(validateDate('2023-13-01')).toBe(false); // Invalid month
      expect(validateDate('2023-12-32')).toBe(false); // Invalid day
      expect(validateDate('2023-02-30')).toBe(false); // February 30
      expect(validateDate('abc')).toBe(false);
      expect(validateDate('12/25/2023')).toBe(false); // Wrong format
    });

    it('validates with min/max dates', () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      expect(validateDate(today, yesterday, tomorrow)).toBe(true);
      expect(validateDate(yesterday, today, tomorrow)).toBe(false); // Before min
      expect(validateDate(tomorrow, yesterday, today)).toBe(false); // After max
    });
  });
});

describe('Kenya Specific Validators', () => {
  describe('validateKenyaID', () => {
    it('validates Kenyan ID numbers', () => {
      // Note: These are example patterns, not real ID numbers
      expect(validateKenyaID('12345678')).toBe(true); // 8 digits
      expect(validateKenyaID('1234567')).toBe(false); // 7 digits
      expect(validateKenyaID('123456789')).toBe(true); // 9 digits (new format)
      expect(validateKenyaID('')).toBe(false);
      expect(validateKenyaID('123abc')).toBe(false); // Contains letters
      expect(validateKenyaID('123 456 78')).toBe(false); // Contains spaces
    });
  });
});

describe('Range Validators', () => {
  describe('validateRange', () => {
    it('validates numeric ranges', () => {
      expect(validateRange(5, 1, 10)).toBe(true);
      expect(validateRange(1, 1, 10)).toBe(true);
      expect(validateRange(10, 1, 10)).toBe(true);
      expect(validateRange(0, 1, 10)).toBe(false);
      expect(validateRange(11, 1, 10)).toBe(false);
      expect(validateRange(5.5, 1, 10)).toBe(true);
      expect(validateRange(-5, -10, 0)).toBe(true);
    });

    it('validates string numbers', () => {
      expect(validateRange('5', 1, 10)).toBe(true);
      expect(validateRange('1', 1, 10)).toBe(true);
      expect(validateRange('10', 1, 10)).toBe(true);
      expect(validateRange('0', 1, 10)).toBe(false);
    });

    it('handles invalid inputs', () => {
      expect(validateRange('', 1, 10)).toBe(false);
      expect(validateRange('abc', 1, 10)).toBe(false);
      expect(validateRange(null, 1, 10)).toBe(false);
      expect(validateRange(undefined, 1, 10)).toBe(false);
    });
  });
});

describe('Validator Integration', () => {
  it('combines validators for complex validation', () => {
    const validateUser = (data: any) => {
      return (
        validateRequired(data.name) &&
        validateName(data.name) &&
        validateEmail(data.email) &&
        validatePhone(data.phone) &&
        validatePassword(data.password)
      );
    };

    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '0712345678',
      password: 'StrongPass123!',
    };

    const invalidUser = {
      name: 'J',
      email: 'invalid',
      phone: '123',
      password: 'weak',
    };

    expect(validateUser(validUser)).toBe(true);
    expect(validateUser(invalidUser)).toBe(false);
  });

  it('validates product data', () => {
    const validateProduct = (data: any) => {
      return (
        validateRequired(data.name) &&
        validateMinLength(data.name, 3) &&
        validateMaxLength(data.name, 200) &&
        validateRequired(data.sku) &&
        validateSKU(data.sku) &&
        validatePrice(data.price.toString()) &&
        validateQuantity(data.stock.toString(), 0) &&
        validateSlug(data.slug) &&
        validateRating(data.rating?.toString() || '0')
      );
    };

    const validProduct = {
      name: 'Test Product',
      sku: 'PROD-001',
      price: 9999,
      stock: 100,
      slug: 'test-product',
      rating: 4.5,
    };

    const invalidProduct = {
      name: '',
      sku: 'Invalid SKU',
      price: -100,
      stock: -10,
      slug: 'Invalid Slug!',
      rating: 6,
    };

    expect(validateProduct(validProduct)).toBe(true);
    expect(validateProduct(invalidProduct)).toBe(false);
  });
});
