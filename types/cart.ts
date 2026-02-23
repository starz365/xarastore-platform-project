export interface CartItemBase {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
}

export interface CartItemPrice {
  unitPrice: number;
  originalUnitPrice?: number;
  totalPrice: number;
  originalTotalPrice?: number;
  currency: string;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  discountPercentage: number;
  discountType?: 'percentage' | 'fixed' | 'coupon' | 'promotion';
  discountCode?: string;
  finalPrice: number;
}

export interface CartItemProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  thumbnail?: string;
  brand?: {
    id: string;
    name: string;
    slug: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  attributes?: Record<string, string>;
  specifications?: Record<string, string>;
  isDigital: boolean;
  requiresShipping: boolean;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  stock: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  manageStock: boolean;
}

export interface CartItemVariant {
  id: string;
  name: string;
  sku: string;
  attributes: Record<string, string>;
  images?: string[];
  stock: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  manageStock: boolean;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface CartItemGiftOptions {
  isGift: boolean;
  giftMessage?: string;
  giftWrap?: boolean;
  giftWrapType?: string;
  giftWrapPrice?: number;
  giftWrapMessage?: string;
  giftReceipt: boolean;
  giftFrom?: {
    name?: string;
    email?: string;
  };
  giftTo?: {
    name?: string;
    email?: string;
    address?: string;
  };
}

export interface CartItemWarranty {
  hasWarranty: boolean;
  warrantyType?: string;
  warrantyDuration?: number;
  warrantyUnit?: 'days' | 'months' | 'years';
  warrantyPrice?: number;
  warrantyDescription?: string;
}

export interface CartItemSubscription {
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

export interface CartItemDigital {
  isDigital: boolean;
  downloadLimit?: number;
  downloadExpiry?: number;
  downloadFiles?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  licenseKey?: string;
  licenseExpiry?: string;
}

export interface CartItemCustomization {
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

export interface CartItemBundle {
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
  bundleDiscount?: number;
  bundleDiscountType?: 'percentage' | 'fixed';
}

export interface CartItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stockAvailable: boolean;
  priceValid: boolean;
  productActive: boolean;
  variantActive: boolean;
  meetsMinimumQuantity: boolean;
  meetsMaximumQuantity: boolean;
  meetsMinimumPrice: boolean;
  ageRestrictionMet?: boolean;
  locationRestrictionMet?: boolean;
  customerGroupAllowed?: boolean;
}

export interface CartItem extends CartItemBase {
  // Product Information
  product: CartItemProduct;
  
  // Variant Information (if applicable)
  variant?: CartItemVariant;
  
  // Pricing
  pricing: CartItemPrice;
  
  // Gift Options
  giftOptions: CartItemGiftOptions;
  
  // Warranty
  warranty: CartItemWarranty;
  
  // Subscription
  subscription: CartItemSubscription;
  
  // Digital Product Details
  digital: CartItemDigital;
  
  // Customizations
  customization: CartItemCustomization;
  
  // Bundle Information
  bundle: CartItemBundle;
  
  // Validation
  validation: CartItemValidation;
  
  // Metadata
  metadata: {
    addedFromIp?: string;
    addedFromUserAgent?: string;
    addedFromUrl?: string;
    notes?: string;
    customFields?: Record<string, any>;
  };
}

export interface CartBase {
  id: string;
  userId?: string;
  sessionId: string;
  currency: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CartSummary {
  itemCount: number;
  uniqueItems: number;
  totalQuantity: number;
  subtotal: number;
  originalSubtotal?: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  shippingAmount: number;
  handlingFee: number;
  insuranceFee: number;
  giftWrapAmount: number;
  total: number;
  currency: string;
  weight: number;
  volume: number;
  estimatedDelivery?: {
    minDays: number;
    maxDays: number;
    dateRange: string;
  };
}

export interface CartDiscount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y' | 'bundle';
  value: number;
  description?: string;
  appliesTo: 'cart' | 'shipping' | 'specific_items';
  itemIds?: string[];
  minimumAmount?: number;
  maximumAmount?: number;
  maximumUses?: number;
  usedCount: number;
  validFrom?: string;
  validUntil?: string;
  stackable: boolean;
  autoApplied: boolean;
  conditions?: Array<{
    type: 'customer_group' | 'product_category' | 'product_brand' | 'location' | 'time';
    value: any;
  }>;
}

export interface CartTax {
  rate: number;
  amount: number;
  breakdown: Array<{
    type: 'product' | 'shipping' | 'handling' | 'other';
    rate: number;
    amount: number;
    taxableAmount: number;
  }>;
  inclusive: boolean;
  jurisdiction?: string;
  taxNumber?: string;
}

export interface CartShipping {
  methodId: string;
  carrier: string;
  service: string;
  cost: number;
  estimatedDelivery?: {
    minDays: number;
    maxDays: number;
    dateRange: string;
  };
  pickupPoints?: Array<{
    id: string;
    name: string;
    address: string;
    distance?: number;
    hours?: string;
  }>;
  trackingAvailable: boolean;
  insuranceAvailable: boolean;
  insuranceCost?: number;
  signatureRequired: boolean;
  adultSignatureRequired: boolean;
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
    value?: {
      min?: number;
      max?: number;
    };
    prohibitedItems?: string[];
  };
}

export interface CartPayment {
  methodId?: string;
  methodName?: string;
  savedMethods?: Array<{
    id: string;
    type: 'card' | 'bank' | 'mobile' | 'wallet';
    lastFour?: string;
    expiry?: string;
    isDefault: boolean;
  }>;
  installments?: {
    available: boolean;
    options?: Array<{
      installments: number;
      monthlyAmount: number;
      totalAmount: number;
      interestRate: number;
    }>;
  };
}

export interface CartCustomer {
  id?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  taxNumber?: string;
  customerGroup?: string;
  loyaltyPoints?: number;
  isGuest: boolean;
  isRegistered: boolean;
  preferences?: {
    language: string;
    currency: string;
    newsletter: boolean;
    marketing: boolean;
  };
}

export interface CartAddress {
  shipping?: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email?: string;
    instructions?: string;
  };
  billing?: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email?: string;
    sameAsShipping: boolean;
  };
}

export interface CartValidation {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
    details?: any;
    itemId?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    details?: any;
    itemId?: string;
  }>;
  stockIssues: Array<{
    itemId: string;
    productId: string;
    requested: number;
    available: number;
    backorderAvailable: boolean;
  }>;
  priceIssues: Array<{
    itemId: string;
    productId: string;
    expectedPrice: number;
    actualPrice: number;
  }>;
  availabilityIssues: Array<{
    itemId: string;
    productId: string;
    reason: string;
  }>;
}

export interface CartAnalytics {
  abandoned: boolean;
  abandonedStage?: 'viewed' | 'items_added' | 'address_entered' | 'shipping_selected' | 'payment_entered';
  recoveryAttempts: number;
  lastRecoveryAttempt?: string;
  conversionProbability: number;
  viewedCount: number;
  itemsAddedCount: number;
  itemsRemovedCount: number;
  quantityChangedCount: number;
  couponAppliedCount: number;
  shippingMethodChangedCount: number;
  estimatedLifetimeValue: number;
  customerValueTier?: 'low' | 'medium' | 'high' | 'vip';
}

export interface CartMetadata {
  source: 'web' | 'mobile' | 'api' | 'pos';
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
    screenSize?: string;
  };
  location?: {
    ip?: string;
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrer?: {
    url?: string;
    domain?: string;
    type?: 'direct' | 'organic' | 'referral' | 'social' | 'email' | 'paid';
  };
  utmParameters?: Record<string, string>;
  customFields?: Record<string, any>;
}

export interface Cart extends CartBase {
  // Items
  items: CartItem[];
  
  // Summary
  summary: CartSummary;
  
  // Discounts
  discounts: CartDiscount[];
  
  // Taxes
  taxes: CartTax;
  
  // Shipping
  shipping: CartShipping;
  
  // Payment
  payment: CartPayment;
  
  // Customer
  customer: CartCustomer;
  
  // Addresses
  addresses: CartAddress;
  
  // Validation
  validation: CartValidation;
  
  // Analytics
  analytics: CartAnalytics;
  
  // Metadata
  metadata: CartMetadata;
  
  // Notes
  notes?: string;
  
  // Gift Cards
  giftCards?: Array<{
    code: string;
    amount: number;
    remaining: number;
    applied: number;
  }>;
  
  // Loyalty Points
  loyaltyPoints?: {
    available: number;
    used: number;
    earned: number;
  };
  
  // Split Tender
  splitTender?: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
}

export interface CartMergeResult {
  merged: boolean;
  sourceCartId: string;
  targetCartId: string;
  itemsMerged: number;
  itemsConflicted: number;
  itemsSkipped: number;
  discountsMerged: number;
  conflicts: Array<{
    itemId: string;
    conflict: 'price' | 'stock' | 'availability' | 'quantity';
    sourceValue: any;
    targetValue: any;
    resolution: 'source' | 'target' | 'highest_quantity' | 'latest';
  }>;
  mergedAt: string;
}

export interface CartAbandonmentRecovery {
  cartId: string;
  customerEmail?: string;
  customerPhone?: string;
  abandonedAt: string;
  recoveryAttempts: Array<{
    attempt: number;
    method: 'email' | 'sms' | 'push' | 'retargeting';
    sentAt: string;
    opened?: boolean;
    clicked?: boolean;
    recovered?: boolean;
    recoveredAt?: string;
    recoveryValue?: number;
  }>;
  recovered: boolean;
  recoveredAt?: string;
  recoveryValue?: number;
  lifetimeValue?: number;
}

export interface CartExportOptions {
  format: 'csv' | 'json' | 'xml';
  fields: string[];
  includeItems: boolean;
  includeCustomer: boolean;
  includeAnalytics: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    status?: string[];
    minValue?: number;
    maxValue?: number;
    hasCustomer?: boolean;
    recovered?: boolean;
  };
  compression?: boolean;
}

export interface CartImportRecord {
  sessionId: string;
  userId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price?: number;
    addedAt?: string;
  }>;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  billingAddress?: any;
  discounts?: string[];
  metadata?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  statusCode: 'pending' | 'processing' | 'success' | 'error';
}

export interface CartSyncResult {
  localChanges: Array<{
    type: 'add' | 'update' | 'remove';
    itemId: string;
    productId: string;
    quantity: number;
  }>;
  remoteChanges: Array<{
    type: 'add' | 'update' | 'remove';
    itemId: string;
    productId: string;
    quantity: number;
  }>;
  conflicts: Array<{
    itemId: string;
    localQuantity: number;
    remoteQuantity: number;
    resolution: 'local' | 'remote' | 'merge';
    finalQuantity: number;
  }>;
  merged: boolean;
  mergedCartId?: string;
  itemsSynced: number;
  syncDuration: number;
  syncAt: string;
}

export interface CartCheckpoint {
  id: string;
  cartId: string;
  name: string;
  snapshot: Cart;
  createdAt: string;
  createdBy: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CartRecommendation {
  type: 'cross_sell' | 'upsell' | 'frequently_bought_together' | 'recently_viewed' | 'trending';
  products: Array<{
    id: string;
    slug: string;
    name: string;
    price: number;
    originalPrice?: number;
    image?: string;
    relevance: number;
    reason: string;
    discount?: number;
    stock: number;
  }>;
  basedOn: Array<{
    type: 'item' | 'category' | 'brand' | 'behavior';
    value: string;
    weight: number;
  }>;
  expiration?: string;
}

export interface CartEvent {
  type: 'item_added' | 'item_removed' | 'quantity_changed' | 'coupon_applied' | 
        'coupon_removed' | 'shipping_changed' | 'address_changed' | 'cart_merged' |
        'cart_abandoned' | 'cart_recovered' | 'checkout_started';
  cartId: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  data: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    location?: string;
    device?: string;
    source?: string;
  };
}
