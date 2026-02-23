export interface PaymentBase {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  userId?: string;
  customerId?: string;
  sessionId?: string;
  type: 'sale' | 'authorization' | 'capture' | 'refund' | 'void' | 'preauthorization';
  status: 'pending' | 'processing' | 'authorized' | 'captured' | 'partially_captured' | 
          'refunded' | 'partially_refunded' | 'voided' | 'failed' | 'expired' | 'disputed';
  currency: string;
  amount: number;
  capturedAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  exchangeRate?: number;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  expiredAt?: string;
}

export interface PaymentCustomer {
  id?: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  company?: string;
  taxNumber?: string;
  customerGroup?: string;
  loyaltyTier?: string;
  isGuest: boolean;
  marketingOptIn: boolean;
}

export interface PaymentMethodCard {
  type: 'card';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay';
  lastFour: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName?: string;
  country?: string;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  fingerprint?: string;
  isTokenized: boolean;
  token?: string;
  threeDSecure: {
    version: '1.0' | '2.0' | '2.1' | '2.2';
    status: 'not_supported' | 'available' | 'required' | 'verified' | 'failed';
    liabilityShift: boolean;
    authenticationFlow: 'frictionless' | 'challenge';
    cavv?: string;
    eci?: string;
    xid?: string;
  };
  networkTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PaymentMethodBank {
  type: 'bank_transfer' | 'ach' | 'sepa' | 'bacs';
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  bic?: string;
  accountHolderName: string;
  country: string;
  mandateId?: string;
  mandateStatus?: 'pending' | 'active' | 'expired' | 'revoked';
  mandateUrl?: string;
}

export interface PaymentMethodMobile {
  type: 'mobile_money';
  provider: 'mpesa' | 'airtel_money' | 'tigo_pesa' | 'vodacom_m_pesa' | 'orange_money';
  phoneNumber: string;
  accountName?: string;
  country: string;
  transactionId?: string;
  receiptNumber?: string;
}

export interface PaymentMethodWallet {
  type: 'digital_wallet';
  provider: 'paypal' | 'apple_pay' | 'google_pay' | 'samsung_pay' | 'm_pesa' | 'venmo';
  email?: string;
  phone?: string;
  walletId?: string;
  payerId?: string;
}

export interface PaymentMethodCash {
  type: 'cash';
  method: 'cash_on_delivery' | 'bank_deposit' | 'over_the_counter';
  instructions?: string;
  reference?: string;
}

export interface PaymentMethodCrypto {
  type: 'crypto';
  currency: 'bitcoin' | 'ethereum' | 'litecoin' | 'bitcoin_cash' | 'usdc' | 'dai';
  address: string;
  amount: number;
  exchangeRate: number;
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations: number;
}

export interface PaymentMethodInstallment {
  type: 'installment';
  provider: string;
  planId: string;
  numberOfInstallments: number;
  installmentAmount: number;
  interestRate: number;
  totalAmount: number;
  firstPaymentDate: string;
  paymentSchedule: Array<{
    installment: number;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
  }>;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'mobile_money' | 'digital_wallet' | 'cash' | 
        'crypto' | 'installment' | 'voucher' | 'loyalty_points' | 'gift_card';
  provider: string;
  isSaved: boolean;
  isDefault: boolean;
  metadata?: Record<string, any>;
  // Type-specific data
  card?: PaymentMethodCard;
  bank?: PaymentMethodBank;
  mobile?: PaymentMethodMobile;
  wallet?: PaymentMethodWallet;
  cash?: PaymentMethodCash;
  crypto?: PaymentMethodCrypto;
  installment?: PaymentMethodInstallment;
}

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  type: 'authorization' | 'capture' | 'refund' | 'void' | 'dispute' | 'chargeback';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'reversed';
  gateway: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  gatewayError?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'mpesa' | 'braintree' | 'square' | 'adyen' | 
        'authorize_net' | 'worldpay' | 'checkout_com' | 'razorpay' | 'paystack';
  environment: 'sandbox' | 'production';
  credentials: Record<string, any>;
  isActive: boolean;
  isLive: boolean;
  supportedCurrencies: string[];
  supportedCountries: string[];
  supportedPaymentMethods: string[];
  processingFees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface PaymentRiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  flags: Array<{
    type: 'velocity' | 'geolocation' | 'billing_shipping_mismatch' | 'high_value' | 
          'new_customer' | 'guest_checkout' | 'risky_ip' | 'risky_email' | 'risky_card';
    description: string;
    weight: number;
  }>;
  verification: {
    address: boolean;
    cvv: boolean;
    zip: boolean;
    threeDSecure: boolean;
    biometric: boolean;
  };
  recommendations: Array<{
    action: 'approve' | 'review' | 'decline' | 'require_3ds' | 'require_avs' | 'require_cvv';
    reason: string;
    confidence: number;
  }>;
}

export interface PaymentFraudCheck {
  provider: 'sift' | 'signifyd' | 'kount' | 'maxmind' | 'custom';
  checkId: string;
  score: number;
  decision: 'approve' | 'review' | 'decline';
  reasons: string[];
  details?: Record<string, any>;
  checkedAt: string;
}

export interface PaymentDispute {
  id: string;
  disputeId: string;
  reason: 'fraudulent' | 'duplicate' | 'subscription_canceled' | 'product_unacceptable' | 
          'product_not_received' | 'unrecognized' | 'credit_not_processed' | 'general';
  status: 'warning_needs_response' | 'warning_under_review' | 'warning_closed' | 
          'needs_response' | 'under_review' | 'won' | 'lost';
  amount: number;
  currency: string;
  evidence: Array<{
    type: 'receipt' | 'customer_communication' | 'refund_policy' | 'cancellation_policy' |
          'shipping_documentation' | 'access_activity_log' | 'service_documentation';
    url: string;
    description?: string;
    submittedAt?: string;
  }>;
  dueBy?: string;
  submittedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefund {
  id: string;
  refundId: string;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'defective_product' | 
          'wrong_product' | 'late_delivery' | 'customer_dissatisfaction' | 'price_adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  method: string;
  transactionId?: string;
  restockingFee?: number;
  items: Array<{
    itemId: string;
    quantity: number;
    amount: number;
  }>;
  shippingRefund?: number;
  taxRefund?: number;
  notes?: string;
  metadata?: Record<string, any>;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
}

export interface PaymentInstallment {
  id: string;
  planId: string;
  numberOfInstallments: number;
  installmentAmount: number;
  interestRate: number;
  totalAmount: number;
  schedule: Array<{
    installment: number;
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue' | 'failed';
    paidAt?: string;
    transactionId?: string;
  }>;
  currentInstallment: number;
  nextPaymentDate: string;
  autoDebit: boolean;
  failedAttempts: number;
  metadata?: Record<string, any>;
}

export interface PaymentSubscription {
  id: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  amount: number;
  currency: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'ended' | 'trialing';
  trialPeriod?: number;
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
  paymentMethodId: string;
  invoiceHistory: Array<{
    invoiceId: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    status: 'paid' | 'open' | 'void' | 'uncollectible';
    pdfUrl?: string;
    paidAt?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface PaymentInvoice {
  id: string;
  invoiceId: string;
  number: string;
  customerId: string;
  subscriptionId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  items: Array<{
    id: string;
    description: string;
    amount: number;
    quantity: number;
    tax?: number;
  }>;
  tax?: number;
  total: number;
  pdfUrl?: string;
  hostedUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  paidAt?: string;
  voidedAt?: string;
}

export interface PaymentWebhook {
  id: string;
  event: string;
  type: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 
        'charge.succeeded' | 'charge.failed' | 'charge.refunded' | 
        'customer.subscription.created' | 'customer.subscription.updated' | 
        'customer.subscription.deleted' | 'invoice.payment_succeeded' | 
        'invoice.payment_failed' | 'payment_method.attached' | 
        'payment_method.detached' | 'dispute.created' | 'dispute.updated' | 
        'dispute.closed';
  data: Record<string, any>;
  gateway: string;
  signature?: string;
  delivered: boolean;
  deliveryAttempts: number;
  lastDeliveryAttempt?: string;
  metadata?: Record<string, any>;
  receivedAt: string;
  processedAt?: string;
}

export interface PaymentSettlement {
  id: string;
  settlementId: string;
  gateway: string;
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalAmount: number;
  totalFees: number;
  netAmount: number;
  currency: string;
  transactions: number;
  breakdown: Array<{
    paymentId: string;
    amount: number;
    fees: number;
    net: number;
    status: string;
  }>;
  metadata?: Record<string, any>;
  expectedDate: string;
  settledAt?: string;
}

export interface PaymentReconciliation {
  id: string;
  reconciliationId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  currency: string;
  matchedTransactions: number;
  unmatchedTransactions: number;
  discrepancies: Array<{
    type: 'missing' | 'extra' | 'amount_mismatch' | 'date_mismatch';
    paymentId?: string;
    expected?: any;
    actual?: any;
    resolved: boolean;
    resolution?: string;
  }>;
  metadata?: Record<string, any>;
  startedAt: string;
  completedAt?: string;
}

export interface PaymentAudit {
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  authorizedBy?: string;
  authorizedAt?: string;
  capturedBy?: string;
  capturedAt?: string;
  refundedBy?: string;
  refundedAt?: string;
  voidedBy?: string;
  voidedAt?: string;
  version: number;
  history: Array<{
    date: string;
    action: string;
    user?: string;
    changes: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }>;
}

export interface PaymentAnalytics {
  successRate: number;
  failureRate: number;
  averageProcessingTime: number;
  totalVolume: number;
  totalTransactions: number;
  averageTransactionValue: number;
  refundRate: number;
  disputeRate: number;
  chargebackRate: number;
  fraudRate: number;
  gatewayPerformance: Record<string, {
    successRate: number;
    averageTime: number;
    volume: number;
    failures: number;
  }>;
  methodDistribution: Record<string, {
    count: number;
    volume: number;
    successRate: number;
  }>;
  currencyDistribution: Record<string, {
    count: number;
    volume: number;
  }>;
  timeAnalysis: {
    byHour: Record<string, number>;
    byDay: Record<string, number>;
    byMonth: Record<string, number>;
  };
}

export interface Payment extends PaymentBase {
  // Customer Information
  customer: PaymentCustomer;
  
  // Payment Method
  method: PaymentMethod;
  
  // Transactions
  transactions: PaymentTransaction[];
  
  // Gateway Information
  gateway: PaymentGateway;
  
  // Risk Assessment
  risk: PaymentRiskAssessment;
  
  // Fraud Check
  fraudCheck?: PaymentFraudCheck;
  
  // Disputes
  disputes: PaymentDispute[];
  
  // Refunds
  refunds: PaymentRefund[];
  
  // Installments
  installment?: PaymentInstallment;
  
  // Subscription (if applicable)
  subscription?: PaymentSubscription;
  
  // Invoice (if applicable)
  invoice?: PaymentInvoice;
  
  // Webhooks
  webhooks: PaymentWebhook[];
  
  // Settlement
  settlement?: PaymentSettlement;
  
  // Reconciliation
  reconciliation?: PaymentReconciliation;
  
  // Audit Trail
  audit: PaymentAudit;
  
  // Analytics
  analytics: PaymentAnalytics;
  
  // Metadata
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    device?: {
      type: string;
      os: string;
      browser: string;
    };
    location?: {
      country: string;
      region: string;
      city: string;
      timezone: string;
    };
    referrer?: string;
    campaign?: Record<string, string>;
    affiliateId?: string;
    salesPerson?: string;
    notes?: string;
  };
}

export interface PaymentFilter {
  // Basic Filters
  paymentIds?: string[];
  orderIds?: string[];
  orderNumbers?: string[];
  status?: string[];
  type?: string[];
  
  // Customer Filters
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerGroup?: string[];
  
  // Date Filters
  createdAfter?: string;
  createdBefore?: string;
  processedAfter?: string;
  processedBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  
  // Amount Filters
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  
  // Method Filters
  paymentMethod?: string[];
  paymentProvider?: string[];
  cardBrand?: string[];
  
  // Gateway Filters
  gateway?: string[];
  gatewayTransactionId?: string;
  
  // Risk Filters
  riskLevel?: string[];
  fraudScoreMin?: number;
  fraudScoreMax?: number;
  hasDispute?: boolean;
  hasChargeback?: boolean;
  
  // Subscription Filters
  subscriptionId?: string;
  subscriptionStatus?: string[];
  
  // Installment Filters
  installmentPlan?: string[];
  installmentStatus?: string[];
  
  // Custom Field Filters
  customFields?: Record<string, any>;
  
  // Search
  search?: string;
  
  // Sort
  sortBy?: 'created' | 'processed' | 'amount' | 'status' | 'customer';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentSearchResult {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  aggregations?: {
    status: Array<{
      status: string;
      count: number;
      amount: number;
    }>;
    paymentMethod: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
    gateway: Array<{
      gateway: string;
      count: number;
      amount: number;
    }>;
    currency: Array<{
      currency: string;
      count: number;
      amount: number;
    }>;
    date: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
    riskLevel: Array<{
      level: string;
      count: number;
      amount: number;
    }>;
  };
  summary?: {
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    successRate: number;
    refundRate: number;
    disputeRate: number;
  };
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 
          'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  paymentMethod?: PaymentMethod;
  customer?: PaymentCustomer;
  metadata?: Record<string, any>;
  nextAction?: {
    type: 'redirect_to_url' | 'use_stripe_sdk' | 'oxxo_display_details' | 
          'wechat_pay_display_qr_code' | 'boleto_display_details';
    url?: string;
    data?: Record<string, any>;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface PaymentCapture {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  isFinal: boolean;
  status: 'pending' | 'succeeded' | 'failed';
  gatewayResponse?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentAuthorization {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  status: 'pending' | 'authorized' | 'captured' | 'voided' | 'expired';
  gatewayAuthorizationId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  authorizedAt?: string;
}

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  gateway: string;
  signature?: string;
  deliveryAttempts: number;
  lastDeliveryAttempt?: string;
  metadata?: Record<string, any>;
  receivedAt: string;
  processedAt?: string;
}

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: string;
  environment: 'sandbox' | 'production';
  credentials: Record<string, any>;
  isActive: boolean;
  isLive: boolean;
  supportedCurrencies: string[];
  supportedCountries: string[];
  supportedPaymentMethods: string[];
  processingFees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  capabilities: string[];
  webhookUrl?: string;
  webhookSecret?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodToken {
  id: string;
  type: 'card' | 'bank' | 'mobile' | 'wallet';
  token: string;
  provider: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
  createdAt: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriod?: number;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
