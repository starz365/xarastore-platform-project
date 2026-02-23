import { getMpesaService } from './providers/mpesa';
import { supabase } from '@/lib/supabase/client';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'mpesa' | 'card' | 'bank';
  metadata: {
    phoneNumber?: string;
    cardToken?: string;
    bankAccount?: string;
  };
  customer: {
    email: string;
    name: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message: string;
  metadata?: any;
}

export class PaymentProcessor {
  private static instance: PaymentProcessor;

  private constructor() {}

  static getInstance(): PaymentProcessor {
    if (!PaymentProcessor.instance) {
      PaymentProcessor.instance = new PaymentProcessor();
    }
    return PaymentProcessor.instance;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate request
      this.validatePaymentRequest(request);

      // Process based on payment method
      switch (request.paymentMethod) {
        case 'mpesa':
          return await this.processMpesaPayment(request);
        case 'card':
          return await this.processCardPayment(request);
        case 'bank':
          return await this.processBankPayment(request);
        default:
          throw new Error(`Unsupported payment method: ${request.paymentMethod}`);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Save failed payment attempt
      await this.savePaymentAttempt(request, 'failed', error.message);
      
      return {
        success: false,
        message: error.message || 'Payment processing failed',
      };
    }
  }

  private async processMpesaPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!request.metadata.phoneNumber) {
      throw new Error('Phone number is required for M-Pesa payment');
    }

    // Initiate M-Pesa payment
    const mpesaService = getMpesaService();
    const result = await mpesaService.initiateSTKPush(
      request.metadata.phoneNumber,
      request.amount,
      request.orderId,
      `Payment for order ${request.orderId}`
    );

    // Save payment attempt
    await this.savePaymentAttempt(request, 'pending', result.customerMessage, {
      checkoutRequestID: result.checkoutRequestID,
      merchantRequestID: result.merchantRequestID,
    });

    return {
      success: true,
      transactionId: result.checkoutRequestID,
      reference: result.merchantRequestID,
      message: result.customerMessage,
      metadata: result,
    };
  }

  private async processCardPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // In production, integrate with Stripe, PayPal, etc.
    // This is a simplified implementation
    
    if (!request.metadata.cardToken) {
      throw new Error('Card token is required for card payment');
    }

    // Simulate card payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a mock transaction ID
    const transactionId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save payment attempt
    await this.savePaymentAttempt(request, 'completed', 'Card payment processed successfully', {
      transactionId,
      method: 'card',
    });

    return {
      success: true,
      transactionId,
      reference: transactionId,
      message: 'Card payment processed successfully',
    };
  }

  private async processBankPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // In production, integrate with bank APIs
    // This is a simplified implementation
    
    if (!request.metadata.bankAccount) {
      throw new Error('Bank account details are required for bank transfer');
    }

    // Generate bank transfer reference
    const reference = `BANK_${Date.now()}`;
    
    // Save payment attempt
    await this.savePaymentAttempt(request, 'pending', 'Bank transfer initiated', {
      reference,
      bankAccount: request.metadata.bankAccount,
    });

    return {
      success: true,
      transactionId: reference,
      reference,
      message: 'Bank transfer initiated. Please complete the transfer using the reference provided.',
      metadata: {
        bankName: 'Co-operative Bank of Kenya',
        accountNumber: '0112345678900',
        accountName: 'Xarastore Limited',
        reference,
        amount: request.amount,
      },
    };
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.orderId) {
      throw new Error('Order ID is required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('Valid amount is required');
    }

    if (request.currency !== 'KES') {
      throw new Error('Only KES currency is supported');
    }

    if (!request.paymentMethod) {
      throw new Error('Payment method is required');
    }

    if (!request.customer?.email) {
      throw new Error('Customer email is required');
    }
  }

  private async savePaymentAttempt(
    request: PaymentRequest,
    status: 'pending' | 'completed' | 'failed',
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase.from('payment_attempts').insert({
        order_id: request.orderId,
        payment_method: request.paymentMethod,
        amount: request.amount,
        currency: request.currency,
        status,
        customer_email: request.customer.email,
        customer_name: request.customer.name,
        customer_phone: request.customer.phone,
        metadata: metadata || {},
        message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save payment attempt:', error);
      throw error;
    }
  }

  async verifyPayment(transactionId: string, paymentMethod: string): Promise<PaymentResponse> {
    try {
      switch (paymentMethod) {
        case 'mpesa':
          const mpesaService = getMpesaService();
          const result = await mpesaService.queryTransactionStatus(transactionId);
          
          return {
            success: result.success,
            transactionId,
            message: result.resultDesc,
            metadata: result,
          };

        default:
          // For other payment methods, check the payment attempt status
          const { data: paymentAttempt } = await supabase
            .from('payment_attempts')
            .select('*')
            .eq('metadata->>transactionId', transactionId)
            .single();

          return {
            success: paymentAttempt?.status === 'completed',
            transactionId,
            message: paymentAttempt?.message || 'Payment status checked',
          };
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        message: error.message || 'Payment verification failed',
      };
    }
  }

  async refundPayment(transactionId: string, amount: number, reason: string): Promise<PaymentResponse> {
    try {
      // Find the original payment
      const { data: payment } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('metadata->>transactionId', transactionId)
        .single();

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Process refund based on payment method
      // In production, this would call the respective payment provider's refund API
      
      // Save refund record
      await supabase.from('refunds').insert({
        payment_attempt_id: payment.id,
        amount,
        reason,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        transactionId: `refund_${Date.now()}`,
        message: 'Refund request submitted successfully',
      };
    } catch (error: any) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        message: error.message || 'Refund processing failed',
      };
    }
  }
}
