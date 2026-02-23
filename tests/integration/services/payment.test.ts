tests/integration/services/payment.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MpesaService } from '@/services/payment/providers/mpesa';
import { StripeService } from '@/services/payment/providers/stripe';
import { PaymentProcessor } from '@/services/payment/processor';
import { supabase } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/services/payment/providers/mpesa', () => ({
  MpesaService: jest.fn().mockImplementation(() => ({
    initiateSTKPush: jest.fn(),
    queryTransactionStatus: jest.fn(),
    processCallback: jest.fn(),
  })),
  getMpesaService: jest.fn(),
}));

jest.mock('@/services/payment/providers/stripe', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    createCustomer: jest.fn(),
  })),
  getStripeService: jest.fn(),
}));

describe('Payment Service Integration Tests', () => {
  let mpesaService: jest.Mocked<MpesaService>;
  let stripeService: jest.Mocked<StripeService>;
  let paymentProcessor: PaymentProcessor;

  beforeEach(() => {
    mpesaService = new MpesaService({
      consumerKey: 'test-key',
      consumerSecret: 'test-secret',
      shortCode: 'test-shortcode',
      passkey: 'test-passkey',
      environment: 'sandbox',
    }) as jest.Mocked<MpesaService>;

    stripeService = new StripeService('test-secret-key') as jest.Mocked<StripeService>;

    (require('@/services/payment/providers/mpesa').getMpesaService as jest.Mock).mockReturnValue(mpesaService);
    (require('@/services/payment/providers/stripe').getStripeService as jest.Mock).mockReturnValue(stripeService);

    paymentProcessor = new PaymentProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('M-Pesa Payment Integration', () => {
    const testOrder = {
      id: 'order-123',
      order_number: 'ORD-2024-001',
      user_id: 'user-123',
      total: 5000,
      items: [
        {
          product_id: 'product-1',
          variant_id: 'variant-1',
          quantity: 1,
          price: 5000,
        },
      ],
      shipping_address: {
        name: 'Test User',
        phone: '0712345678',
        street: '123 Test Street',
        city: 'Nairobi',
      },
    };

    it('should initiate M-Pesa payment successfully', async () => {
      const mockResponse = {
        success: true,
        checkoutRequestID: 'ws_CO_123456',
        customerMessage: 'Success. Request accepted for processing',
        merchantRequestID: '12345-67890-1',
        responseCode: '0',
        responseDescription: 'Success',
      };

      mpesaService.initiateSTKPush.mockResolvedValue(mockResponse);

      const result = await paymentProcessor.initiateMpesaPayment(
        '0712345678',
        5000,
        'order-123',
        'Test Order'
      );

      expect(result.success).toBe(true);
      expect(result.checkoutRequestID).toBe('ws_CO_123456');
      expect(result.customerMessage).toBe('Success. Request accepted for processing');

      expect(mpesaService.initiateSTKPush).toHaveBeenCalledWith(
        '0712345678',
        5000,
        'order-123',
        'Test Order'
      );

      // Verify payment attempt was saved
      expect(supabase.from).toHaveBeenCalledWith('payment_attempts');
    });

    it('should handle M-Pesa payment initiation failure', async () => {
      mpesaService.initiateSTKPush.mockRejectedValue(
        new Error('Insufficient balance')
      );

      await expect(
        paymentProcessor.initiateMpesaPayment(
          '0712345678',
          5000,
          'order-123',
          'Test Order'
        )
      ).rejects.toThrow('Insufficient balance');

      // Should still attempt to save failed payment attempt
      expect(supabase.from).toHaveBeenCalled();
    });

    it('should query M-Pesa transaction status', async () => {
      const mockStatus = {
        success: true,
        resultCode: '0',
        resultDesc: 'The service request is processed successfully',
        checkoutRequestID: 'ws_CO_123456',
        merchantRequestID: '12345-67890-1',
      };

      mpesaService.queryTransactionStatus.mockResolvedValue(mockStatus);

      const result = await paymentProcessor.queryMpesaTransaction('ws_CO_123456');

      expect(result.success).toBe(true);
      expect(result.resultCode).toBe('0');
      expect(mpesaService.queryTransactionStatus).toHaveBeenCalledWith('ws_CO_123456');
    });

    it('should process M-Pesa callback successfully', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 5000 },
                { Name: 'MpesaReceiptNumber', Value: 'RCT123456' },
                { Name: 'TransactionDate', Value: '20240101120000' },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456',
          },
        },
      };

      const mockCallbackResult = {
        success: true,
        transaction: {
          mpesaReceiptNumber: 'RCT123456',
          phoneNumber: '254712345678',
          transactionDate: '20240101120000',
          amount: 5000,
          resultCode: 0,
          resultDesc: 'The service request is processed successfully',
          merchantRequestID: '12345-67890-1',
          checkoutRequestID: 'ws_CO_123456',
        },
      };

      mpesaService.processCallback.mockResolvedValue(mockCallbackResult);

      // Mock order lookup
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { order_id: 'order-123' },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'orders') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          };
        }
        return {
          insert: jest.fn(() => ({
            data: null,
            error: null,
          })),
        };
      });

      const result = await paymentProcessor.processMpesaCallback(callbackData);

      expect(result.success).toBe(true);
      expect(mpesaService.processCallback).toHaveBeenCalledWith(callbackData);

      // Verify order was updated
      expect(supabase.from).toHaveBeenCalledWith('orders');
      expect(supabase.from).toHaveBeenCalledWith('transactions');
    });

    it('should handle failed M-Pesa callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user',
            MerchantRequestID: '12345-67890-1',
            CheckoutRequestID: 'ws_CO_123456',
          },
        },
      };

      const mockCallbackResult = {
        success: false,
        transaction: {
          resultCode: 1032,
          resultDesc: 'Request cancelled by user',
          merchantRequestID: '12345-67890-1',
          checkoutRequestID: 'ws_CO_123456',
        },
      };

      mpesaService.processCallback.mockResolvedValue(mockCallbackResult);

      const result = await paymentProcessor.processMpesaCallback(callbackData);

      expect(result.success).toBe(false);
      expect(result.transaction.resultCode).toBe(1032);
    });
  });

  describe('Stripe Payment Integration', () => {
    const testPaymentData = {
      amount: 5000,
      currency: 'kes',
      customerEmail: 'test@example.com',
      orderId: 'order-123',
      metadata: {
        order_id: 'order-123',
        user_id: 'user-123',
      },
    };

    it('should create Stripe payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123456',
        client_secret: 'pi_123456_secret_789',
        amount: 5000,
        currency: 'kes',
        status: 'requires_payment_method',
      };

      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await paymentProcessor.createStripePaymentIntent(testPaymentData);

      expect(result.id).toBe('pi_123456');
      expect(result.client_secret).toBe('pi_123456_secret_789');
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(testPaymentData);
    });

    it('should confirm Stripe payment', async () => {
      const mockPayment = {
        id: 'pi_123456',
        status: 'succeeded',
        amount: 5000,
        currency: 'kes',
        customer: 'cus_123456',
      };

      stripeService.confirmPayment.mockResolvedValue(mockPayment);

      const result = await paymentProcessor.confirmStripePayment('pi_123456', 'pm_123456');

      expect(result.status).toBe('succeeded');
      expect(stripeService.confirmPayment).toHaveBeenCalledWith('pi_123456', 'pm_123456');
    });

    it('should create Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_123456',
        email: 'test@example.com',
        name: 'Test User',
      };

      stripeService.createCustomer.mockResolvedValue(mockCustomer);

      const result = await paymentProcessor.createStripeCustomer({
        email: 'test@example.com',
        name: 'Test User',
        phone: '0712345678',
      });

      expect(result.id).toBe('cus_123456');
      expect(stripeService.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        phone: '0712345678',
      });
    });
  });

  describe('Payment Processor Integration', () => {
    const testOrder = {
      id: 'order-123',
      total: 5000,
      user_id: 'user-123',
      shipping_address: {
        phone: '0712345678',
      },
    };

    it('should process payment with M-Pesa', async () => {
      const mockMpesaResult = {
        success: true,
        checkoutRequestID: 'ws_CO_123456',
        customerMessage: 'Success. Request accepted for processing',
      };

      mpesaService.initiateSTKPush.mockResolvedValue(mockMpesaResult);

      const result = await paymentProcessor.processPayment({
        order: testOrder,
        paymentMethod: 'mpesa',
        paymentDetails: {
          phoneNumber: '0712345678',
        },
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('mpesa');
      expect(result.transactionId).toBe('ws_CO_123456');
    });

    it('should process payment with Stripe', async () => {
      const mockStripeResult = {
        id: 'pi_123456',
        client_secret: 'pi_123456_secret_789',
        status: 'requires_payment_method',
      };

      stripeService.createPaymentIntent.mockResolvedValue(mockStripeResult);

      const result = await paymentProcessor.processPayment({
        order: testOrder,
        paymentMethod: 'card',
        paymentDetails: {
          cardToken: 'tok_123456',
        },
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('card');
      expect(result.paymentIntentId).toBe('pi_123456');
    });

    it('should handle invalid payment method', async () => {
      await expect(
        paymentProcessor.processPayment({
          order: testOrder,
          paymentMethod: 'invalid',
          paymentDetails: {},
        })
      ).rejects.toThrow('Unsupported payment method');
    });

    it('should validate payment amount', async () => {
      const invalidOrder = { ...testOrder, total: 0 };

      await expect(
        paymentProcessor.processPayment({
          order: invalidOrder,
          paymentMethod: 'mpesa',
          paymentDetails: { phoneNumber: '0712345678' },
        })
      ).rejects.toThrow('Invalid payment amount');
    });

    it('should validate phone number for M-Pesa', async () => {
      await expect(
        paymentProcessor.processPayment({
          order: testOrder,
          paymentMethod: 'mpesa',
          paymentDetails: { phoneNumber: 'invalid' },
        })
      ).rejects.toThrow('Invalid phone number');
    });
  });

  describe('Payment Status Management', () => {
    it('should update payment status', async () => {
      const updateMock = jest.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: updateMock,
        })),
      });

      await paymentProcessor.updatePaymentStatus('order-123', 'paid', 'RCT123456');

      expect(supabase.from).toHaveBeenCalledWith('orders');
      expect(updateMock).toHaveBeenCalledWith({
        payment_status: 'paid',
        mpesa_receipt: 'RCT123456',
        updated_at: expect.any(String),
      });
      expect(updateMock).toHaveBeenCalledWith('id', 'order-123');
    });

    it('should log payment transaction', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: insertMock,
      });

      const transactionData = {
        order_id: 'order-123',
        type: 'payment',
        amount: 5000,
        method: 'mpesa',
        reference: 'RCT123456',
        status: 'completed',
        metadata: {
          phone: '0712345678',
        },
      };

      await paymentProcessor.logTransaction(transactionData);

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(insertMock).toHaveBeenCalledWith(transactionData);
    });

    it('should get payment history', async () => {
      const mockPayments = [
        {
          id: 'txn-1',
          order_id: 'order-123',
          amount: 5000,
          method: 'mpesa',
          status: 'completed',
          created_at: '2024-01-01T12:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockPayments,
              error: null,
            })),
          })),
        })),
      });

      const result = await paymentProcessor.getPaymentHistory('user-123');

      expect(result).toEqual(mockPayments);
      expect(supabase.from).toHaveBeenCalledWith('transactions');
    });
  });

  describe('Refund Processing', () => {
    it('should process refund', async () => {
      const mockRefund = {
        id: 're_123456',
        amount: 5000,
        status: 'succeeded',
      };

      stripeService.createRefund = jest.fn().mockResolvedValue(mockRefund);

      const result = await paymentProcessor.processRefund({
        paymentIntentId: 'pi_123456',
        amount: 5000,
        reason: 'customer_request',
      });

      expect(result.id).toBe('re_123456');
      expect(result.status).toBe('succeeded');
    });

    it('should handle M-Pesa refund via reversal', async () => {
      const mockReversal = {
        success: true,
        transactionId: 'RVR123456',
      };

      mpesaService.initiateReversal = jest.fn().mockResolvedValue(mockReversal);

      const result = await paymentProcessor.processMpesaRefund({
        transactionId: 'RCT123456',
        amount: 5000,
        phoneNumber: '0712345678',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('RVR123456');
    });
  });
});
