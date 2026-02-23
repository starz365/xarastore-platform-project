export interface OrderBase {
  id: string;
  orderNumber: string;
  userId?: string;
  sessionId?: string;
  customerId?: string;
  guestEmail?: string;
  guestPhone?: string;
  type: 'standard' | 'subscription' | 'preorder' | 'backorder' | 'wholesale' | 'dropship';
  status: 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 
          'cancelled' | 'refunded' | 'partially_refunded' | 'on_hold' | 'failed';
  channel: 'web' | 'mobile' | 'pos' | 'marketplace' | 'api' | 'phone';
  createdAt: string;
  updatedAt: string;
  placedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
}

export interface OrderCustomer {
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
  notes?: string;
}

export interface OrderAddress {
  shipping: {
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode: string;
    phone: string;
    email?: string;
    instructions?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    validated: boolean;
  };
  billing: {
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode: string;
    phone: string;
    email?: string;
    sameAsShipping: boolean;
  };
  pickup?: {
    locationId: string;
    locationName: string;
    address: string;
    phone: string;
    hours?: string;
    pickupBy?: string;
    pickupAt?: string;
    pickupCode?: string;
  };
}

export interface OrderItemBase {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  quantity: number;
  addedAt: string;
}

export interface OrderItemPrice {
  unitPrice: number;
  originalUnitPrice?: number;
  totalPrice: number;
  originalTotalPrice?: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  discountPercentage: number;
  discountType?: 'percentage' | 'fixed' | 'coupon' | 'promotion';
  discountCode?: string;
  finalPrice: number;
  currency: string;
}

export interface OrderItemProduct {
  id: string;
  slug: string;
  brand?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
  attributes?: Record<string, string>;
  isDigital: boolean;
  requiresShipping: boolean;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  image?: string;
  thumbnail?: string;
}

export interface OrderItemVariant {
  id: string;
  name: string;
  attributes: Record<string, string>;
  image?: string;
}

export interface OrderItemGiftOptions {
  isGift: boolean;
  giftMessage?: string;
  giftWrap?: boolean;
  giftWrapType?: string;
  giftWrapPrice?: number;
  giftWrapMessage?: string;
  giftReceipt: boolean;
}

export interface OrderItemWarranty {
  hasWarranty: boolean;
  warrantyType?: string;
  warrantyDuration?: number;
  warrantyUnit?: 'days' | 'months' | 'years';
  warrantyPrice?: number;
  warrantyDescription?: string;
  warrantySerial?: string;
}

export interface OrderItemSubscription {
  isSubscription: boolean;
  interval?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  trialPeriod?: number;
  trialPrice?: number;
  signupFee?: number;
  totalCycles?: number;
  currentCycle?: number;
  nextBillingDate?: string;
  autoRenew: boolean;
}

export interface OrderItemDigital {
  isDigital: boolean;
  downloadLimit?: number;
  downloadExpiry?: number;
  downloadFiles?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
    downloadCount: number;
    lastDownloaded?: string;
  }>;
  licenseKey?: string;
  licenseExpiry?: string;
  licenseStatus?: 'active' | 'expired' | 'revoked';
}

export interface OrderItemCustomization {
  customizable: boolean;
  customizations?: Array<{
    id: string;
    name: string;
    type: 'text' | 'image' | 'file' | 'select' | 'color';
    value: string;
    price?: number;
    files?: Array<{
      id: string;
      name: string;
      url: string;
      size?: number;
    }>;
  }>;
}

export interface OrderItemBundle {
  isBundle: boolean;
  bundleId?: string;
  bundleItems?: Array<{
    productId: string;
    variantId?: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    required: boolean;
    image?: string;
  }>;
}

export interface OrderItemFulfillment {
  status: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'returned' | 'exchanged';
  quantity: number;
  shippedQuantity: number;
  returnedQuantity: number;
  warehouse?: string;
  location?: string;
  serialNumbers?: string[];
  batchNumbers?: string[];
  expiryDates?: string[];
}

export interface OrderItem extends OrderItemBase {
  // Product Information
  product: OrderItemProduct;
  
  // Variant Information
  variant?: OrderItemVariant;
  
  // Pricing
  pricing: OrderItemPrice;
  
  // Gift Options
  giftOptions: OrderItemGiftOptions;
  
  // Warranty
  warranty: OrderItemWarranty;
  
  // Subscription
  subscription: OrderItemSubscription;
  
  // Digital Product Details
  digital: OrderItemDigital;
  
  // Customizations
  customization: OrderItemCustomization;
  
  // Bundle Information
  bundle: OrderItemBundle;
  
  // Fulfillment
  fulfillment: OrderItemFulfillment;
  
  // Metadata
  metadata: {
    notes?: string;
    customFields?: Record<string, any>;
  };
}

export interface OrderSummary {
  subtotal: number;
  originalSubtotal?: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  shippingAmount: number;
  handlingFee: number;
  insuranceFee: number;
  giftWrapAmount: number;
  tipAmount?: number;
  roundingAdjustment?: number;
  total: number;
  currency: string;
  totalWeight: number;
  totalVolume: number;
  itemCount: number;
  uniqueItems: number;
  totalQuantity: number;
}

export interface OrderDiscount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y' | 'bundle';
  value: number;
  description?: string;
  appliesTo: 'cart' | 'shipping' | 'specific_items';
  itemIds?: string[];
  amount: number;
  maximumAmount?: number;
  stackable: boolean;
  autoApplied: boolean;
  conditions?: Array<{
    type: 'customer_group' | 'product_category' | 'product_brand' | 'location' | 'time';
    value: any;
  }>;
}

export interface OrderTax {
  totalAmount: number;
  inclusive: boolean;
  breakdown: Array<{
    type: 'product' | 'shipping' | 'handling' | 'other';
    rate: number;
    amount: number;
    taxableAmount: number;
    jurisdiction?: string;
  }>;
  taxNumber?: string;
  taxCertificate?: string;
}

export interface OrderShipping {
  methodId: string;
  carrier: string;
  service: string;
  cost: number;
  insuranceCost?: number;
  signatureRequired: boolean;
  adultSignatureRequired: boolean;
  deliveryInstructions?: string;
  estimatedDelivery?: {
    minDays: number;
    maxDays: number;
    dateRange: string;
    guaranteed: boolean;
  };
  actualDelivery?: {
    deliveredAt?: string;
    receivedBy?: string;
    proof?: string;
    notes?: string;
  };
  tracking: Array<{
    number: string;
    url?: string;
    carrier?: string;
    status?: string;
    lastUpdate?: string;
    events?: Array<{
      date: string;
      time: string;
      location: string;
      status: string;
      description: string;
    }>;
  }>;
  pickup?: {
    locationId: string;
    locationName: string;
    address: string;
    phone: string;
    pickupBy?: string;
    pickupAt?: string;
    pickedUpAt?: string;
    pickedUpBy?: string;
    pickupCode?: string;
  };
  restrictions?: {
    weight?: {
      min?: number;
      max?: number;
    };
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
  };
}

export interface OrderPayment {
  method: string;
  provider: string;
  status: 'pending' | 'authorized' | 'captured' | 'partially_captured' | 'refunded' | 
          'partially_refunded' | 'voided' | 'failed' | 'expired';
  transactionId?: string;
  authorizationCode?: string;
  capturedAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  currency: string;
  exchangeRate?: number;
  installments?: {
    count: number;
    amount: number;
    interestRate: number;
    nextPayment?: string;
  };
  details?: {
    lastFour?: string;
    expiry?: string;
    cardType?: string;
    bank?: string;
    accountType?: string;
    mobileProvider?: string;
    wallet?: string;
  };
  fraudCheck?: {
    score?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    reasons?: string[];
    passed: boolean;
  };
  paymentLinks?: Array<{
    url: string;
    expiresAt: string;
    used: boolean;
  }>;
  history: Array<{
    date: string;
    action: 'authorize' | 'capture' | 'refund' | 'void';
    amount: number;
    reference?: string;
    processedBy?: string;
  }>;
}

export interface OrderFulfillment {
  status: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'returned' | 'exchanged';
  items: Array<{
    itemId: string;
    quantity: number;
    status: 'unfulfilled' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'exchanged';
    shippedAt?: string;
    deliveredAt?: string;
    returnedAt?: string;
    exchangedAt?: string;
  }>;
  shipments: Array<{
    id: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    cost: number;
    weight: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    packageType: string;
    items: Array<{
      itemId: string;
      quantity: number;
      serialNumbers?: string[];
    }>;
    shippedAt: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    proof?: string;
    notes?: string;
  }>;
  returns: Array<{
    id: string;
    reason: string;
    status: 'requested' | 'approved' | 'received' | 'refunded' | 'rejected';
    items: Array<{
      itemId: string;
      quantity: number;
      reason: string;
      condition: 'new' | 'used' | 'damaged';
    }>;
    requestedAt: string;
    approvedAt?: string;
    receivedAt?: string;
    refundedAt?: string;
    refundAmount: number;
    rmaNumber?: string;
    returnLabel?: string;
    notes?: string;
  }>;
  exchanges: Array<{
    id: string;
    reason: string;
    status: 'requested' | 'approved' | 'shipped' | 'completed' | 'rejected';
    originalItems: Array<{
      itemId: string;
      quantity: number;
    }>;
    replacementItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }>;
    requestedAt: string;
    approvedAt?: string;
    shippedAt?: string;
    completedAt?: string;
    rmaNumber?: string;
    notes?: string;
  }>;
  warehouse: string;
  packedBy?: string;
  shippedBy?: string;
  deliveredBy?: string;
}

export interface OrderInvoice {
  number: string;
  date: string;
  dueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  taxAmount: number;
  total: number;
  currency: string;
  pdfUrl?: string;
  sentAt?: string;
  paidAt?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface OrderRefund {
  id: string;
  reason: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  items: Array<{
    itemId: string;
    quantity: number;
    amount: number;
  }>;
  shippingRefund?: number;
  taxRefund?: number;
  restockingFee?: number;
  processedAt?: string;
  processedBy?: string;
  transactionId?: string;
  notes?: string;
}

export interface OrderNote {
  id: string;
  type: 'internal' | 'customer' | 'system';
  author?: string;
  message: string;
  createdAt: string;
  isPinned: boolean;
  metadata?: Record<string, any>;
}

export interface OrderAudit {
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  placedBy?: string;
  placedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  completedBy?: string;
  completedAt?: string;
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

export interface OrderRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  flags: Array<{
    type: 'velocity' | 'geolocation' | 'billing_shipping_mismatch' | 'high_value' | 
          'new_customer' | 'guest_checkout' | 'risky_ip' | 'risky_email';
    description: string;
    weight: number;
  }>;
  verification: {
    email: boolean;
    phone: boolean;
    address: boolean;
    payment: boolean;
    identity: boolean;
  };
  hold: boolean;
  holdReason?: string;
  holdUntil?: string;
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewDecision?: 'approve' | 'reject' | 'require_more_info';
  reviewNotes?: string;
}

export interface OrderMarketing {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  referrer?: string;
  landingPage?: string;
  affiliateId?: string;
  salesPerson?: string;
  utmParameters?: Record<string, string>;
  clickId?: string;
  impressionId?: string;
  conversionValue: number;
}

export interface OrderCustomFields {
  [key: string]: any;
}

export interface Order extends OrderBase {
  // Customer Information
  customer: OrderCustomer;
  
  // Addresses
  addresses: OrderAddress;
  
  // Items
  items: OrderItem[];
  
  // Summary
  summary: OrderSummary;
  
  // Discounts
  discounts: OrderDiscount[];
  
  // Taxes
  taxes: OrderTax;
  
  // Shipping
  shipping: OrderShipping;
  
  // Payment
  payment: OrderPayment;
  
  // Fulfillment
  fulfillment: OrderFulfillment;
  
  // Invoices
  invoices: OrderInvoice[];
  
  // Refunds
  refunds: OrderRefund[];
  
  // Notes
  notes: OrderNote[];
  
  // Audit Trail
  audit: OrderAudit;
  
  // Risk Assessment
  risk: OrderRisk;
  
  // Marketing Attribution
  marketing: OrderMarketing;
  
  // Custom Fields
  customFields: OrderCustomFields;
  
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
    appVersion?: string;
    sessionId?: string;
    cartId?: string;
  };
}

export interface OrderFilter {
  // Basic Filters
  orderNumbers?: string[];
  status?: string[];
  type?: string[];
  channel?: string[];
  
  // Customer Filters
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerGroup?: string[];
  
  // Date Filters
  createdAfter?: string;
  createdBefore?: string;
  placedAfter?: string;
  placedBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  deliveredAfter?: string;
  deliveredBefore?: string;
  cancelledAfter?: string;
  cancelledBefore?: string;
  
  // Price Filters
  minTotal?: number;
  maxTotal?: number;
  minSubtotal?: number;
  maxSubtotal?: number;
  currency?: string;
  
  // Item Filters
  productIds?: string[];
  skus?: string[];
  categories?: string[];
  brands?: string[];
  
  // Location Filters
  shippingCountry?: string[];
  billingCountry?: string[];
  shippingState?: string[];
  billingState?: string[];
  shippingCity?: string[];
  billingCity?: string[];
  
  // Payment Filters
  paymentMethod?: string[];
  paymentStatus?: string[];
  paymentProvider?: string[];
  
  // Shipping Filters
  shippingMethod?: string[];
  carrier?: string[];
  trackingNumber?: string;
  
  // Risk Filters
  riskLevel?: string[];
  fraudScoreMin?: number;
  fraudScoreMax?: number;
  onHold?: boolean;
  
  // Marketing Filters
  campaign?: string[];
  source?: string[];
  medium?: string[];
  affiliateId?: string[];
  
  // Custom Field Filters
  customFields?: Record<string, any>;
  
  // Search
  search?: string;
  
  // Sort
  sortBy?: 'created' | 'updated' | 'placed' | 'total' | 'status' | 'customer';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
}

export interface OrderSearchResult {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  aggregations?: {
    status: Array<{
      status: string;
      count: number;
      total: number;
    }>;
    channel: Array<{
      channel: string;
      count: number;
    }>;
    paymentMethod: Array<{
      method: string;
      count: number;
    }>;
    shippingMethod: Array<{
      method: string;
      count: number;
    }>;
    country: Array<{
      country: string;
      count: number;
    }>;
    date: Array<{
      date: string;
      count: number;
      total: number;
    }>;
    customerGroup: Array<{
      group: string;
      count: number;
    }>;
  };
  summary?: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    refundRate: number;
    fulfillmentRate: number;
  };
}

export interface OrderImportRecord {
  orderNumber?: string;
  customerEmail: string;
  customerPhone?: string;
  customerFirstName: string;
  customerLastName: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddress1: string;
  shippingAddress2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;
  billingSameAsShipping?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  billingPhone?: string;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
    productName?: string;
  }>;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount?: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderDate: string;
  shippingMethod?: string;
  trackingNumber?: string;
  notes?: string;
  customFields?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  statusCode: 'pending' | 'processing' | 'success' | 'error' | 'duplicate';
}

export interface OrderExportOptions {
  format: 'csv' | 'json' | 'xml' | 'excel';
  fields: string[];
  includeItems: boolean;
  includeCustomer: boolean;
  includeAddresses: boolean;
  includePayment: boolean;
  includeShipping: boolean;
  includeFulfillment: boolean;
  includeNotes: boolean;
  includeAudit: boolean;
  filters?: OrderFilter;
  dateRange?: {
    start: string;
    end: string;
  };
  compression?: boolean;
  encryption?: boolean;
  chunkSize?: number;
}

export interface OrderBulkUpdate {
  orderNumbers: string[];
  updates: Partial<{
    status: string;
    shippingMethod: string;
    trackingNumber: string;
    carrier: string;
    paymentStatus: string;
    customerGroup: string;
    tags: string[];
    notes: string;
    customFields: Record<string, any>;
    riskLevel: string;
    hold: boolean;
    holdReason: string;
    holdUntil: string;
  }>;
  notifyCustomer: boolean;
  notificationTemplate?: string;
  notifyAdmin: boolean;
  adminNotificationTemplate?: string;
  dryRun: boolean;
  changeReason?: string;
}

export interface OrderSyncResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    orderNumber: string;
    error: string;
    details?: any;
  }>;
  warnings: Array<{
    orderNumber: string;
    warning: string;
    details?: any;
  }>;
  changes: Array<{
    orderNumber: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  duration: number;
  startedAt: string;
  completedAt: string;
  summary: Record<string, number>;
}

export interface OrderWorkflow {
  currentStep: string;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    assignedTo?: string;
    dueDate?: string;
    completedAt?: string;
    notes?: string;
    actions?: string[];
  }>;
  nextSteps: string[];
  blocked: boolean;
  blockReason?: string;
  escalationLevel: number;
  slaStatus: 'on_time' | 'at_risk' | 'breached';
  slaDueDate?: string;
}

export interface OrderTimeline {
  events: Array<{
    id: string;
    type: 'order_created' | 'order_placed' | 'payment_received' | 'payment_failed' |
          'order_confirmed' | 'order_processing' | 'order_shipped' | 'order_delivered' |
          'order_cancelled' | 'order_refunded' | 'order_returned' | 'order_exchanged' |
          'status_changed' | 'note_added' | 'customer_contacted' | 'shipment_created' |
          'tracking_updated' | 'invoice_sent' | 'reminder_sent' | 'escalation';
    title: string;
    description?: string;
    timestamp: string;
    user?: string;
    metadata?: Record<string, any>;
    icon?: string;
    color?: string;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    targetDate: string;
    actualDate?: string;
    status: 'pending' | 'completed' | 'delayed' | 'cancelled';
    delayReason?: string;
  }>;
}

export interface OrderAnalytics {
  customerLifetimeValue: number;
  customerOrderCount: number;
  averageDaysBetweenOrders: number;
  predictedNextOrderDate?: string;
  churnRisk: 'low' | 'medium' | 'high';
  customerValueTier: 'low' | 'medium' | 'high' | 'vip';
  acquisitionCost: number;
  profitability: number;
  margin: number;
  returnRate: number;
  refundRate: number;
  exchangeRate: number;
  fulfillmentCost: number;
  shippingCost: number;
  packagingCost: number;
  handlingCost: number;
  insuranceCost: number;
  taxCost: number;
  paymentProcessingCost: number;
  netRevenue: number;
}

export interface OrderEvent {
  type: 'order_created' | 'order_updated' | 'order_status_changed' | 'payment_received' |
        'payment_failed' | 'shipment_created' | 'shipment_delivered' | 'refund_issued' |
        'return_requested' | 'exchange_requested' | 'note_added' | 'customer_contacted' |
        'invoice_sent' | 'reminder_sent' | 'escalation';
  orderId: string;
  orderNumber: string;
  timestamp: string;
  userId?: string;
  data: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    location?: string;
    device?: string;
    source?: string;
  };
}
