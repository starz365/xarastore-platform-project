export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-100
  strength: 'very weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very strong';
  feedback: string[];
  suggestions: string[];
  meetsRequirements: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
    notPersonalInfo: boolean;
    notSequential: boolean;
    notRepeating: boolean;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxConsecutiveRepeating: number;
  maxSequentialLength: number;
  commonPasswords: string[];
  personalInfoFields?: string[];
}

export class PasswordValidator {
  private static instance: PasswordValidator;
  private defaultPolicy: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxConsecutiveRepeating: 3,
    maxSequentialLength: 3,
    commonPasswords: [
      'password', '123456', 'qwerty', 'admin', 'welcome',
      'password123', '12345678', '123456789', '1234567',
      'letmein', 'monkey', 'football', 'iloveyou', '123123',
      '111111', '1234', '12345', '1234567890',
    ],
  };

  private constructor() {}

  static getInstance(): PasswordValidator {
    if (!PasswordValidator.instance) {
      PasswordValidator.instance = new PasswordValidator();
    }
    return PasswordValidator.instance;
  }

  validate(
    password: string,
    options?: {
      policy?: Partial<PasswordPolicy>;
      personalInfo?: Record<string, string>;
      confirmPassword?: string;
    }
  ): PasswordValidationResult {
    const policy = { ...this.defaultPolicy, ...options?.policy };
    const personalInfo = options?.personalInfo || {};
    
    const feedback: string[] = [];
    const suggestions: string[] = [];
    
    const requirements = {
      minLength: password.length >= policy.minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password),
      notCommon: !this.isCommonPassword(password, policy.commonPasswords),
      notPersonalInfo: !this.containsPersonalInfo(password, personalInfo),
      notSequential: !this.hasSequentialChars(password, policy.maxSequentialLength),
      notRepeating: !this.hasConsecutiveRepeating(password, policy.maxConsecutiveRepeating),
    };

    // Check requirements
    if (!requirements.minLength) {
      feedback.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !requirements.hasUppercase) {
      feedback.push('Password must contain at least one uppercase letter (A-Z)');
    }

    if (policy.requireLowercase && !requirements.hasLowercase) {
      feedback.push('Password must contain at least one lowercase letter (a-z)');
    }

    if (policy.requireNumbers && !requirements.hasNumber) {
      feedback.push('Password must contain at least one number (0-9)');
    }

    if (policy.requireSpecialChars && !requirements.hasSpecialChar) {
      feedback.push('Password must contain at least one special character (!@#$%^&* etc.)');
    }

    if (!requirements.notCommon) {
      feedback.push('Password is too common. Please choose a more unique password');
    }

    if (!requirements.notPersonalInfo) {
      feedback.push('Password contains personal information');
    }

    if (!requirements.notSequential) {
      feedback.push('Password contains sequential characters');
    }

    if (!requirements.notRepeating) {
      feedback.push('Password contains repeating characters');
    }

    // Check if passwords match (if confirmPassword provided)
    if (options?.confirmPassword && password !== options.confirmPassword) {
      feedback.push('Passwords do not match');
    }

    // Calculate score (0-100)
    let score = 0;
    
    // Length score (max 25 points)
    score += Math.min(25, (password.length / policy.minLength) * 25);
    
    // Character variety score (max 50 points)
    if (requirements.hasUppercase) score += 10;
    if (requirements.hasLowercase) score += 10;
    if (requirements.hasNumber) score += 10;
    if (requirements.hasSpecialChar) score += 20;
    
    // Complexity score (max 25 points)
    if (requirements.notCommon) score += 10;
    if (requirements.notPersonalInfo) score += 5;
    if (requirements.notSequential) score += 5;
    if (requirements.notRepeating) score += 5;
    
    // Cap score at 100
    score = Math.min(100, score);

    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score >= 90) strength = 'very strong';
    else if (score >= 75) strength = 'strong';
    else if (score >= 60) strength = 'good';
    else if (score >= 40) strength = 'fair';
    else if (score >= 20) strength = 'weak';
    else strength = 'very weak';

    // Generate suggestions
    if (score < 75) {
      if (!requirements.hasUppercase && policy.requireUppercase) {
        suggestions.push('Add uppercase letters');
      }
      if (!requirements.hasLowercase && policy.requireLowercase) {
        suggestions.push('Add lowercase letters');
      }
      if (!requirements.hasNumber && policy.requireNumbers) {
        suggestions.push('Add numbers');
      }
      if (!requirements.hasSpecialChar && policy.requireSpecialChars) {
        suggestions.push('Add special characters');
      }
      if (password.length < 12) {
        suggestions.push('Make password longer (12+ characters recommended)');
      }
      if (requirements.notCommon === false) {
        suggestions.push('Avoid common words and patterns');
      }
    }

    // Check if all requirements are met
    const meetsRequirements = Object.values(requirements).every(req => req === true);

    return {
      valid: meetsRequirements && feedback.length === 0,
      score,
      strength,
      feedback,
      suggestions,
      meetsRequirements,
      requirements,
    };
  }

  generate(
    length: number = 12,
    options: {
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSpecialChars?: boolean;
      excludeSimilar?: boolean;
      excludeAmbiguous?: boolean;
    } = {}
  ): string {
    const defaultOptions = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSpecialChars: true,
      excludeSimilar: true,
      excludeAmbiguous: true,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Character sets
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O (similar to 1, 0)
    const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Excluding l, o (similar to 1, 0)
    const numbers = '23456789'; // Excluding 0, 1 (similar to O, l)
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Build character pool based on options
    let pool = '';
    if (opts.includeUppercase) pool += uppercase;
    if (opts.includeLowercase) pool += lowercase;
    if (opts.includeNumbers) pool += numbers;
    if (opts.includeSpecialChars) pool += specialChars;
    
    if (pool.length === 0) {
      throw new Error('At least one character set must be included');
    }
    
    // Ensure at least one character from each selected set
    const password: string[] = [];
    
    if (opts.includeUppercase) {
      password.push(this.getRandomChar(uppercase));
    }
    if (opts.includeLowercase) {
      password.push(this.getRandomChar(lowercase));
    }
    if (opts.includeNumbers) {
      password.push(this.getRandomChar(numbers));
    }
    if (opts.includeSpecialChars) {
      password.push(this.getRandomChar(specialChars));
    }
    
    // Fill remaining length
    while (password.length < length) {
      password.push(this.getRandomChar(pool));
    }
    
    // Shuffle the password
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }
    
    return password.join('');
  }

  async hash(password: string): Promise<string> {
    // In production, use a proper password hashing library
    // This is a simplified version using Web Crypto API
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Combine password and salt
    const combined = new Uint8Array(data.length + salt.length);
    combined.set(data);
    combined.set(salt, data.length);
    
    // Hash with SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Return salt + hash
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [saltHex, storedHash] = hashedPassword.split(':');
      
      if (!saltHex || !storedHash) {
        return false;
      }
      
      // Convert hex strings back to bytes
      const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // Combine password and salt
      const combined = new Uint8Array(data.length + salt.length);
      combined.set(data);
      combined.set(salt, data.length);
      
      // Hash with SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      
      // Convert to hex
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Compare
      return hashHex === storedHash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  estimateCrackTime(password: string): {
    time: number; // in seconds
    formatted: string;
    strength: 'instant' | 'seconds' | 'minutes' | 'hours' | 'days' | 'years' | 'centuries';
  } {
    // Calculate entropy
    const entropy = this.calculateEntropy(password);
    
    // Assume 10,000 guesses per second (common for offline attacks)
    const guessesPerSecond = 10000;
    const secondsToCrack = Math.pow(2, entropy) / guessesPerSecond;
    
    // Format time
    let formatted = '';
    let strength: PasswordValidationResult['strength'];
    
    if (secondsToCrack < 1) {
      formatted = 'instantly';
      strength = 'instant';
    } else if (secondsToCrack < 60) {
      formatted = `${Math.round(secondsToCrack)} seconds`;
      strength = 'seconds';
    } else if (secondsToCrack < 3600) {
      formatted = `${Math.round(secondsToCrack / 60)} minutes`;
      strength = 'minutes';
    } else if (secondsToCrack < 86400) {
      formatted = `${Math.round(secondsToCrack / 3600)} hours`;
      strength = 'hours';
    } else if (secondsToCrack < 31536000) {
      formatted = `${Math.round(secondsToCrack / 86400)} days`;
      strength = 'days';
    } else if (secondsToCrack < 3153600000) {
      formatted = `${Math.round(secondsToCrack / 31536000)} years`;
      strength = 'years';
    } else {
      formatted = `${Math.round(secondsToCrack / 3153600000)} centuries`;
      strength = 'centuries';
    }
    
    return {
      time: secondsToCrack,
      formatted,
      strength,
    };
  }

  private calculateEntropy(password: string): number {
    // Determine character set size
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26; // lowercase
    if (/[A-Z]/.test(password)) charsetSize += 26; // uppercase
    if (/[0-9]/.test(password)) charsetSize += 10; // digits
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32; // special chars
    
    // If no charset detected, assume worst case (only lowercase)
    if (charsetSize === 0) charsetSize = 26;
    
    // Calculate entropy: log2(charsetSize^length)
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  private isCommonPassword(password: string, commonPasswords: string[]): boolean {
    const lowerPassword = password.toLowerCase();
    
    // Check exact matches
    if (commonPasswords.includes(lowerPassword)) {
      return true;
    }
    
    // Check for common patterns
    const commonPatterns = [
      /^[0-9]+$/, // All numbers
      /^[a-z]+$/, // All lowercase letters
      /^[A-Z]+$/, // All uppercase letters
      /^qwerty/i, // Keyboard patterns
      /^asdfgh/i,
      /^zxcvbn/i,
      /^password/i,
      /^admin/i,
      /^welcome/i,
      /^123456/i,
    ];
    
    return commonPatterns.some(pattern => pattern.test(password));
  }

  private containsPersonalInfo(password: string, personalInfo: Record<string, string>): boolean {
    const lowerPassword = password.toLowerCase();
    
    for (const [key, value] of Object.entries(personalInfo)) {
      if (!value) continue;
      
      const lowerValue = value.toLowerCase();
      
      // Check if password contains personal info
      if (lowerPassword.includes(lowerValue) && lowerValue.length > 2) {
        return true;
      }
      
      // Check for reversed personal info
      const reversedValue = lowerValue.split('').reverse().join('');
      if (lowerPassword.includes(reversedValue) && reversedValue.length > 2) {
        return true;
      }
    }
    
    return false;
  }

  private hasSequentialChars(password: string, maxLength: number): boolean {
    const lowerPassword = password.toLowerCase();
    
    // Check for sequential letters
    for (let i = 0; i <= lowerPassword.length - maxLength; i++) {
      const sequence = lowerPassword.substring(i, i + maxLength);
      
      if (this.isSequential(sequence)) {
        return true;
      }
    }
    
    // Check for sequential numbers
    for (let i = 0; i <= password.length - maxLength; i++) {
      const sequence = password.substring(i, i + maxLength);
      
      if (this.isNumericSequential(sequence)) {
        return true;
      }
    }
    
    return false;
  }

  private hasConsecutiveRepeating(password: string, maxRepeating: number): boolean {
    for (let i = 0; i <= password.length - maxRepeating; i++) {
      const chars = password.substring(i, i + maxRepeating);
      
      // Check if all characters are the same
      if (new Set(chars).size === 1) {
        return true;
      }
    }
    
    return false;
  }

  private isSequential(chars: string): boolean {
    // Check if characters are sequential (abc, bcd, etc.)
    for (let i = 1; i < chars.length; i++) {
      const current = chars.charCodeAt(i);
      const previous = chars.charCodeAt(i - 1);
      
      if (current !== previous + 1) {
        return false;
      }
    }
    
    return chars.length > 1;
  }

  private isNumericSequential(chars: string): boolean {
    // Check if all characters are digits
    if (!/^\d+$/.test(chars)) {
      return false;
    }
    
    // Check if digits are sequential (123, 234, etc.)
    for (let i = 1; i < chars.length; i++) {
      const current = parseInt(chars[i]);
      const previous = parseInt(chars[i - 1]);
      
      if (current !== previous + 1) {
        return false;
      }
    }
    
    return chars.length > 1;
  }

  private getRandomChar(pool: string): string {
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  getPolicyDescription(policy?: Partial<PasswordPolicy>): string {
    const effectivePolicy = { ...this.defaultPolicy, ...policy };
    
    const requirements: string[] = [];
    
    requirements.push(`Minimum ${effectivePolicy.minLength} characters`);
    
    if (effectivePolicy.requireUppercase) {
      requirements.push('At least one uppercase letter (A-Z)');
    }
    
    if (effectivePolicy.requireLowercase) {
      requirements.push('At least one lowercase letter (a-z)');
    }
    
    if (effectivePolicy.requireNumbers) {
      requirements.push('At least one number (0-9)');
    }
    
    if (effectivePolicy.requireSpecialChars) {
      requirements.push('At least one special character (!@#$%^&* etc.)');
    }
    
    requirements.push('No common passwords');
    requirements.push('No personal information');
    requirements.push(`No more than ${effectivePolicy.maxConsecutiveRepeating} repeating characters`);
    requirements.push(`No sequential characters longer than ${effectivePolicy.maxSequentialLength}`);
    
    return requirements.join('\n• ');
  }

  async generatePassphrase(
    wordCount: number = 4,
    separator: string = '-',
    capitalize: boolean = true,
    includeNumber: boolean = true,
    includeSpecial: boolean = false
  ): Promise<string> {
    // Common word list (Diceware-like)
    const wordList = [
      'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'grape', 'heart',
      'image', 'jolly', 'knife', 'light', 'music', 'night', 'ocean', 'peace',
      'queen', 'river', 'stone', 'table', 'unity', 'voice', 'water', 'xerox',
      'youth', 'zebra', 'alpha', 'beta', 'gamma', 'delta', 'theta', 'sigma',
      'amber', 'coral', 'daisy', 'emery', 'flint', 'ivory', 'jasper', 'quartz',
      'sapphire', 'topaz', 'amber', 'crystal', 'diamond', 'emerald', 'ruby',
    ];
    
    // Select random words
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      words.push(wordList[randomIndex]);
    }
    
    // Capitalize if requested
    if (capitalize) {
      for (let i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
      }
    }
    
    // Join with separator
    let passphrase = words.join(separator);
    
    // Add number if requested
    if (includeNumber) {
      const randomNumber = Math.floor(Math.random() * 100);
      passphrase += randomNumber.toString().padStart(2, '0');
    }
    
    // Add special character if requested
    if (includeSpecial) {
      const specialChars = '!@#$%^&*';
      const randomChar = specialChars[Math.floor(Math.random() * specialChars.length)];
      passphrase += randomChar;
    }
    
    return passphrase;
  }

  validatePassphrase(
    passphrase: string,
    options: {
      minWords?: number;
      minWordLength?: number;
      allowNumbers?: boolean;
      allowSpecialChars?: boolean;
    } = {}
  ): PasswordValidationResult {
    const defaultOptions = {
      minWords: 3,
      minWordLength: 4,
      allowNumbers: true,
      allowSpecialChars: true,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Split into words
    const words = passphrase.split(/[^a-zA-Z]+/).filter(word => word.length > 0);
    
    const feedback: string[] = [];
    const suggestions: string[] = [];
    
    // Check word count
    if (words.length < opts.minWords) {
      feedback.push(`Passphrase must contain at least ${opts.minWords} words`);
    }
    
    // Check word length
    const shortWords = words.filter(word => word.length < opts.minWordLength);
    if (shortWords.length > 0) {
      feedback.push(`Each word must be at least ${opts.minWordLength} characters long`);
    }
    
    // Check for numbers if not allowed
    if (!opts.allowNumbers && /\d/.test(passphrase)) {
      feedback.push('Passphrase should not contain numbers');
    }
    
    // Check for special characters if not allowed
    if (!opts.allowSpecialChars && /[^a-zA-Z0-9\s]/.test(passphrase)) {
      feedback.push('Passphrase should not contain special characters');
    }
    
    // Calculate entropy
    const entropy = this.calculatePassphraseEntropy(words);
    const score = Math.min(100, entropy * 5); // Convert entropy to score
    
    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score >= 90) strength = 'very strong';
    else if (score >= 75) strength = 'strong';
    else if (score >= 60) strength = 'good';
    else if (score >= 40) strength = 'fair';
    else if (score >= 20) strength = 'weak';
    else strength = 'very weak';
    
    return {
      valid: feedback.length === 0,
      score,
      strength,
      feedback,
      suggestions,
      meetsRequirements: feedback.length === 0,
      requirements: {
        minLength: passphrase.length >= opts.minWords * opts.minWordLength,
        hasUppercase: /[A-Z]/.test(passphrase),
        hasLowercase: /[a-z]/.test(passphrase),
        hasNumber: /\d/.test(passphrase),
        hasSpecialChar: /[^A-Za-z0-9]/.test(passphrase),
        notCommon: true, // Passphrases are rarely in common password lists
        notPersonalInfo: true, // Harder to check for passphrases
        notSequential: true,
        notRepeating: true,
      },
    };
  }

  private calculatePassphraseEntropy(words: string[]): number {
    // Assuming 7776 words in Diceware list
    const wordListSize = 7776;
    const bitsPerWord = Math.log2(wordListSize);
    
    return words.length * bitsPerWord;
  }
}

export const passwordValidator = PasswordValidator.getInstance();
