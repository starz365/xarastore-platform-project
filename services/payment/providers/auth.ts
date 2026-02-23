export async function generateAccessToken(
  consumerKey: string,
  consumerSecret: string,
  environment: 'sandbox' | 'production'
): Promise<string> {
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const baseUrl = environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`M-Pesa auth failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    return data.access_token;
  } catch (error) {
    console.error('M-Pesa access token generation failed:', error);
    throw new Error('Failed to generate access token');
  }
}

export async function validateMpesaCredentials(
  consumerKey: string,
  consumerSecret: string,
  environment: 'sandbox' | 'production'
): Promise<boolean> {
  try {
    await generateAccessToken(consumerKey, consumerSecret, environment);
    return true;
  } catch (error) {
    console.error('M-Pesa credentials validation failed:', error);
    return false;
  }
}

export function generateSecurityCredential(
  initiatorPassword: string,
  certificatePath?: string
): string {
  if (certificatePath) {
    // If certificate path is provided, use certificate-based encryption
    const crypto = require('crypto');
    const fs = require('fs');
    
    const publicKey = fs.readFileSync(certificatePath, 'utf8');
    const buffer = Buffer.from(initiatorPassword, 'utf8');
    
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    );
    
    return encrypted.toString('base64');
  } else {
    // Use plain password (for sandbox)
    return Buffer.from(initiatorPassword).toString('base64');
  }
}

export function validateMpesaPhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Kenyan mobile numbers: 2547xxxxxxxx, 07xxxxxxxx, 7xxxxxxxx
  const patterns = [
    /^2547\d{8}$/, // +254 prefix
    /^07\d{8}$/,   // 07 prefix
    /^7\d{8}$/,    // 7 prefix
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

export function formatMpesaPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    return `254${cleaned}`;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('07')) {
    return `254${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return cleaned;
  }
  
  throw new Error('Invalid M-Pesa phone number format');
}

export function calculateMpesaTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generateMpesaPassword(
  shortCode: string,
  passkey: string,
  timestamp: string
): string {
  const data = `${shortCode}${passkey}${timestamp}`;
  return Buffer.from(data).toString('base64');
}

export function validateMpesaCallback(data: any): boolean {
  try {
    // Check required fields
    if (!data.Body?.stkCallback) {
      return false;
    }
    
    const callback = data.Body.stkCallback;
    
    // Check required callback fields
    if (!callback.MerchantRequestID || !callback.CheckoutRequestID || !callback.ResultCode) {
      return false;
    }
    
    // Validate ResultCode is a number
    if (typeof callback.ResultCode !== 'number') {
      return false;
    }
    
    // If successful, check for required metadata
    if (callback.ResultCode === 0) {
      if (!callback.CallbackMetadata?.Item) {
        return false;
      }
      
      const requiredItems = ['Amount', 'MpesaReceiptNumber', 'PhoneNumber'];
      const items = callback.CallbackMetadata.Item.reduce((acc: any, item: any) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});
      
      return requiredItems.every(item => items[item] !== undefined);
    }
    
    return true;
  } catch (error) {
    console.error('M-Pesa callback validation failed:', error);
    return false;
  }
}

export function parseMpesaCallback(data: any): {
  merchantRequestID: string;
  checkoutRequestID: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  transactionDate?: string;
} {
  const callback = data.Body.stkCallback;
  
  const result = {
    merchantRequestID: callback.MerchantRequestID,
    checkoutRequestID: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
  };
  
  if (callback.ResultCode === 0 && callback.CallbackMetadata?.Item) {
    const metadata = callback.CallbackMetadata.Item.reduce((acc: any, item: any) => {
      acc[item.Name] = item.Value;
      return acc;
    }, {});
    
    return {
      ...result,
      amount: metadata.Amount,
      mpesaReceiptNumber: metadata.MpesaReceiptNumber,
      phoneNumber: metadata.PhoneNumber,
      transactionDate: metadata.TransactionDate,
    };
  }
  
  return result;
}

export function generateMpesaReference(prefix: string = 'XARA'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

export function validateMpesaAmount(amount: number): boolean {
  return amount > 0 && amount <= 150000; // M-Pesa limit
}

export async function verifyMpesaTransaction(
  checkoutRequestID: string,
  accessToken: string,
  environment: 'sandbox' | 'production'
): Promise<{
  success: boolean;
  resultCode: string;
  resultDesc: string;
  checkoutRequestID: string;
  merchantRequestID: string;
}> {
  try {
    const baseUrl = environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const timestamp = calculateMpesaTimestamp();
    const shortCode = process.env.MPESA_SHORT_CODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const password = generateMpesaPassword(shortCode, passkey, timestamp);

    const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`M-Pesa query failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      success: data.ResultCode === '0',
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
      checkoutRequestID: data.CheckoutRequestID,
      merchantRequestID: data.MerchantRequestID,
    };
  } catch (error) {
    console.error('M-Pesa transaction verification failed:', error);
    throw new Error('Transaction verification failed');
  }
}
