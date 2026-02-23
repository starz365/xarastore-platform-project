export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  carrier?: string;
  type?: 'mobile' | 'landline' | 'voip';
  country: string;
  countryCode: string;
  error?: string;
}

export class PhoneValidator {
  private static instance: PhoneValidator;
  
  // Kenyan mobile network prefixes
  private readonly KENYAN_NETWORKS = {
    safaricom: ['70', '71', '72', '74', '75', '76', '79', '11'],
    airtel: ['73', '10'],
    telkom: ['77'],
    equitel: ['76'],
  };

  // East African country codes
  private readonly COUNTRY_CODES = {
    'KE': '254', // Kenya
    'TZ': '255', // Tanzania
    'UG': '256', // Uganda
    'RW': '250', // Rwanda
    'BI': '257', // Burundi
    'ET': '251', // Ethiopia
    'SS': '211', // South Sudan
  };

  private constructor() {}

  static getInstance(): PhoneValidator {
    if (!PhoneValidator.instance) {
      PhoneValidator.instance = new PhoneValidator();
    }
    return PhoneValidator.instance;
  }

  validate(phoneNumber: string, countryCode: string = 'KE'): PhoneValidationResult {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Default result
    const result: PhoneValidationResult = {
      valid: false,
      normalized: '',
      country: countryCode,
      countryCode: this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES] || '',
    };

    if (countryCode === 'KE') {
      return this.validateKenyanNumber(cleaned);
    }

    // Validate other East African numbers
    return this.validateInternationalNumber(cleaned, countryCode);
  }

  private validateKenyanNumber(cleaned: string): PhoneValidationResult {
    const result: PhoneValidationResult = {
      valid: false,
      normalized: '',
      country: 'KE',
      countryCode: '254',
    };

    // Check length
    if (cleaned.length < 9 || cleaned.length > 12) {
      result.error = 'Phone number must be 9-12 digits';
      return result;
    }

    // Format 1: 7XXXXXXXX (9 digits)
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      result.valid = true;
      result.normalized = `+254${cleaned}`;
      result.type = 'mobile';
      result.carrier = this.getKenyanCarrier(cleaned.substring(0, 2));
      return result;
    }

    // Format 2: 07XXXXXXXX (10 digits)
    if (cleaned.length === 10 && cleaned.startsWith('07')) {
      result.valid = true;
      result.normalized = `+254${cleaned.substring(1)}`;
      result.type = 'mobile';
      result.carrier = this.getKenyanCarrier(cleaned.substring(1, 3));
      return result;
    }

    // Format 3: 2547XXXXXXXX (12 digits)
    if (cleaned.length === 12 && cleaned.startsWith('2547')) {
      result.valid = true;
      result.normalized = `+${cleaned}`;
      result.type = 'mobile';
      result.carrier = this.getKenyanCarrier(cleaned.substring(3, 5));
      return result;
    }

    // Format 4: +2547XXXXXXXX (13 digits)
    if (cleaned.length === 13 && cleaned.startsWith('2547')) {
      result.valid = true;
      result.normalized = `+${cleaned}`;
      result.type = 'mobile';
      result.carrier = this.getKenyanCarrier(cleaned.substring(3, 5));
      return result;
    }

    // Format 5: Landline numbers (start with 020, 040, etc.)
    if (cleaned.length >= 8 && cleaned.length <= 10) {
      const landlinePrefixes = ['020', '040', '041', '042', '043', '044', '045', '046', '050', '051', '052', '053', '054', '055', '056', '057', '058', '059'];
      
      for (const prefix of landlinePrefixes) {
        if (cleaned.startsWith(prefix)) {
          result.valid = true;
          result.normalized = `+254${cleaned}`;
          result.type = 'landline';
          result.carrier = 'Fixed Line';
          return result;
        }
      }
    }

    // Format 6: Toll-free numbers (start with 0800)
    if (cleaned.startsWith('0800')) {
      result.valid = true;
      result.normalized = `+254${cleaned}`;
      result.type = 'landline';
      result.carrier = 'Toll Free';
      return result;
    }

    // Format 7: Premium numbers (start with 0900, 0901, etc.)
    if (cleaned.startsWith('090')) {
      result.valid = true;
      result.normalized = `+254${cleaned}`;
      result.type = 'landline';
      result.carrier = 'Premium Rate';
      return result;
    }

    result.error = 'Invalid Kenyan phone number format';
    return result;
  }

  private validateInternationalNumber(cleaned: string, countryCode: string): PhoneValidationResult {
    const result: PhoneValidationResult = {
      valid: false,
      normalized: '',
      country: countryCode,
      countryCode: this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES] || '',
    };

    const expectedLengths: Record<string, number> = {
      'TZ': 9,  // Tanzania: 9 digits
      'UG': 9,  // Uganda: 9 digits
      'RW': 9,  // Rwanda: 9 digits
      'BI': 8,  // Burundi: 8 digits
      'ET': 9,  // Ethiopia: 9 digits
      'SS': 9,  // South Sudan: 9 digits
    };

    const expectedLength = expectedLengths[countryCode];
    if (!expectedLength) {
      result.error = `Unsupported country: ${countryCode}`;
      return result;
    }

    // Check if number starts with country code
    let localNumber = cleaned;
    const countryDialCode = this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES];
    
    if (cleaned.startsWith(countryDialCode)) {
      localNumber = cleaned.substring(countryDialCode.length);
    } else if (cleaned.startsWith(`00${countryDialCode}`)) {
      localNumber = cleaned.substring(countryDialCode.length + 2);
    } else if (cleaned.startsWith(`+${countryDialCode}`)) {
      localNumber = cleaned.substring(countryDialCode.length + 1);
    }

    // Validate length
    if (localNumber.length !== expectedLength) {
      result.error = `${countryCode} phone numbers must be ${expectedLength} digits`;
      return result;
    }

    // Validate based on country-specific rules
    switch (countryCode) {
      case 'TZ': // Tanzania
        if (!localNumber.startsWith('6') && !localNumber.startsWith('7')) {
          result.error = 'Tanzanian mobile numbers must start with 6 or 7';
          return result;
        }
        break;
      
      case 'UG': // Uganda
        if (!localNumber.startsWith('7')) {
          result.error = 'Ugandan mobile numbers must start with 7';
          return result;
        }
        break;
      
      case 'RW': // Rwanda
        if (!localNumber.startsWith('7')) {
          result.error = 'Rwandan mobile numbers must start with 7';
          return result;
        }
        break;
      
      case 'BI': // Burundi
        if (!localNumber.startsWith('7') && !localNumber.startsWith('2')) {
          result.error = 'Burundian numbers must start with 7 (mobile) or 2 (landline)';
          return result;
        }
        break;
      
      case 'ET': // Ethiopia
        if (!localNumber.startsWith('9')) {
          result.error = 'Ethiopian mobile numbers must start with 9';
          return result;
        }
        break;
      
      case 'SS': // South Sudan
        if (!localNumber.startsWith('9')) {
          result.error = 'South Sudanese mobile numbers must start with 9';
          return result;
        }
        break;
    }

    result.valid = true;
    result.normalized = `+${countryDialCode}${localNumber}`;
    result.type = localNumber.startsWith('7') || localNumber.startsWith('9') ? 'mobile' : 'landline';
    
    return result;
  }

  private getKenyanCarrier(prefix: string): string {
    if (['70', '71', '72', '74', '75', '76', '79', '11'].includes(prefix)) {
      return 'Safaricom';
    }
    if (['73', '10'].includes(prefix)) {
      return 'Airtel';
    }
    if (['77'].includes(prefix)) {
      return 'Telkom';
    }
    if (['76'].includes(prefix)) {
      return 'Equitel';
    }
    return 'Unknown';
  }

  formatForDisplay(phoneNumber: string): string {
    const validation = this.validate(phoneNumber);
    
    if (!validation.valid) {
      return phoneNumber;
    }

    const normalized = validation.normalized;
    
    // Format based on country
    switch (validation.country) {
      case 'KE':
        // Format: +254 7XX XXX XXX
        if (normalized.length === 13) {
          return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7, 10)} ${normalized.substring(10)}`;
        }
        break;
      
      case 'TZ':
      case 'UG':
      case 'RW':
        // Format: +255 XXX XXX XXX
        if (normalized.length === 12) {
          return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7, 10)} ${normalized.substring(10)}`;
        }
        break;
      
      case 'ET':
        // Format: +251 XX XXX XXXX
        if (normalized.length === 12) {
          return `${normalized.substring(0, 4)} ${normalized.substring(4, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
        }
        break;
    }

    return normalized;
  }

  maskPhoneNumber(phoneNumber: string, visibleDigits: number = 4): string {
    const validation = this.validate(phoneNumber);
    
    if (!validation.valid) {
      return phoneNumber;
    }

    const normalized = validation.normalized;
    const maskedLength = normalized.length - visibleDigits;
    
    if (maskedLength <= 0) {
      return normalized;
    }

    const maskedPart = '*'.repeat(maskedLength);
    const visiblePart = normalized.substring(maskedLength);
    
    return `${maskedPart}${visiblePart}`;
  }

  extractCountryCode(phoneNumber: string): string | null {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check for international formats
    for (const [country, code] of Object.entries(this.COUNTRY_CODES)) {
      if (cleaned.startsWith(code)) {
        return country;
      }
      if (cleaned.startsWith(`00${code}`)) {
        return country;
      }
    }
    
    // Check for Kenyan formats
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return 'KE';
    }
    if (cleaned.length === 10 && cleaned.startsWith('07')) {
      return 'KE';
    }
    if (cleaned.length === 12 && cleaned.startsWith('2547')) {
      return 'KE';
    }
    
    return null;
  }

  isMobileNumber(phoneNumber: string): boolean {
    const validation = this.validate(phoneNumber);
    return validation.valid && validation.type === 'mobile';
  }

  isLandlineNumber(phoneNumber: string): boolean {
    const validation = this.validate(phoneNumber);
    return validation.valid && validation.type === 'landline';
  }

  getSupportedCountries(): Array<{ code: string; name: string; dialCode: string }> {
    return [
      { code: 'KE', name: 'Kenya', dialCode: '+254' },
      { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
      { code: 'UG', name: 'Uganda', dialCode: '+256' },
      { code: 'RW', name: 'Rwanda', dialCode: '+250' },
      { code: 'BI', name: 'Burundi', dialCode: '+257' },
      { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
      { code: 'SS', name: 'South Sudan', dialCode: '+211' },
    ];
  }

  async validateWithCarrierLookup(phoneNumber: string): Promise<PhoneValidationResult> {
    const validation = this.validate(phoneNumber);
    
    if (!validation.valid) {
      return validation;
    }

    // In production, you could make an API call to verify the number
    // with a service like Twilio Lookup or NumVerify
    
    try {
      // This is a mock implementation
      // Replace with actual carrier lookup API
      const mockCarrierData: Record<string, { active: boolean; lineType: string }> = {
        'Safaricom': { active: true, lineType: 'mobile' },
        'Airtel': { active: true, lineType: 'mobile' },
        'Telkom': { active: true, lineType: 'mobile' },
      };

      if (validation.carrier && mockCarrierData[validation.carrier]) {
        validation.type = mockCarrierData[validation.carrier].lineType as 'mobile' | 'landline';
        // Add carrier verification status
        return {
          ...validation,
          carrier: `${validation.carrier} (Verified)`,
        };
      }
    } catch (error) {
      console.warn('Carrier lookup failed:', error);
    }

    return validation;
  }

  generateTestNumber(countryCode: string = 'KE', type: 'mobile' | 'landline' = 'mobile'): string {
    const dialCode = this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES];
    
    if (!dialCode) {
      throw new Error(`Unsupported country: ${countryCode}`);
    }

    let number = '';
    
    switch (countryCode) {
      case 'KE':
        if (type === 'mobile') {
          const prefixes = ['70', '71', '72', '73', '74', '75', '76', '77', '79'];
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          const random = Math.floor(1000000 + Math.random() * 9000000);
          number = `${prefix}${random}`.substring(0, 9);
        } else {
          const landlinePrefixes = ['020', '040', '041'];
          const prefix = landlinePrefixes[Math.floor(Math.random() * landlinePrefixes.length)];
          const random = Math.floor(10000 + Math.random() * 90000);
          number = `${prefix}${random}`.substring(0, 9);
        }
        break;
      
      default:
        // Generate random number for other countries
        const length = countryCode === 'BI' ? 8 : 9;
        number = '7' + Math.floor(Math.random() * Math.pow(10, length - 1)).toString().padStart(length - 1, '0');
    }

    return `+${dialCode}${number}`;
  }
}

export const phoneValidator = PhoneValidator.getInstance();
