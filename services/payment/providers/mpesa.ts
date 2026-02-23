import { generateAccessToken } from './auth';
import { formatPhoneNumber } from '@/lib/utils/currency';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

export class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string = 'Xarastore Purchase'
  ) {
    try {
      // Get access token
      const accessToken = await generateAccessToken(
        this.config.consumerKey,
        this.config.consumerSecret,
        this.config.environment
      );

      // Format phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Prepare STK Push request
      const requestBody = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.config.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      // Make API request
      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || 'STK Push initiation failed');
      }

      return {
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        customerMessage: data.CustomerMessage,
        merchantRequestID: data.MerchantRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
      };
    } catch (error) {
      console.error('MPesa STK Push error:', error);
      throw error;
    }
  }

  async queryTransactionStatus(checkoutRequestID: string) {
    try {
      const accessToken = await generateAccessToken(
        this.config.consumerKey,
        this.config.consumerSecret,
        this.config.environment
      );

      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || 'Transaction query failed');
      }

      return {
        success: data.ResponseCode === '0',
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        checkoutRequestID: data.CheckoutRequestID,
        merchantRequestID: data.MerchantRequestID,
      };
    } catch (error) {
      console.error('MPesa query error:', error);
      throw error;
    }
  }

  async processCallback(data: any) {
    try {
      // Extract transaction details from callback
      const callbackMetadata = data.Body?.stkCallback?.CallbackMetadata?.Item || [];
      
      const metadata = callbackMetadata.reduce((acc: any, item: any) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});

      const transaction = {
        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        phoneNumber: metadata.PhoneNumber,
        transactionDate: metadata.TransactionDate,
        amount: metadata.Amount,
        resultCode: data.Body?.stkCallback?.ResultCode,
        resultDesc: data.Body?.stkCallback?.ResultDesc,
        merchantRequestID: data.Body?.stkCallback?.MerchantRequestID,
        checkoutRequestID: data.Body?.stkCallback?.CheckoutRequestID,
      };

      // Save transaction to database
      await this.saveTransaction(transaction);

      return {
        success: transaction.resultCode === 0,
        transaction,
      };
    } catch (error) {
      console.error('MPesa callback processing error:', error);
      throw error;
    }
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private generatePassword(timestamp: string): string {
    const data = `${this.config.shortCode}${this.config.passkey}${timestamp}`;
    
    // In production, use proper Base64 encoding
    return Buffer.from(data).toString('base64');
  }

  private async saveTransaction(transaction: any) {
    try {
      // Save to Supabase
      const { error } = await fetch('/api/payment/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'mpesa',
          data: transaction,
          status: transaction.resultCode === 0 ? 'completed' : 'failed',
        }),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save transaction:', error);
      throw error;
    }
  }
}

// Singleton instance
let mpesaInstance: MpesaService | null = null;

export function getMpesaService(): MpesaService {
  if (!mpesaInstance) {
    mpesaInstance = new MpesaService({
      consumerKey: process.env.MPESA_CONSUMER_KEY!,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
      shortCode: process.env.MPESA_SHORT_CODE!,
      passkey: process.env.MPESA_PASSKEY!,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
  }
  return mpesaInstance;
}
