export interface UserBase {
  id: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  username?: string;
  displayName?: string;
  avatar?: string;
  language: string;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  lastIpAddress?: string;
  lastUserAgent?: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  age?: number;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  occupation?: string;
  company?: string;
  website?: string;
  bio?: string;
  interests?: string[];
  hobbies?: string[];
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    pinterest?: string;
  };
}

export interface UserAddress {
  id: string;
  type: 'shipping' | 'billing' | 'both';
  label?: 'home' | 'work' | 'other';
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
  isDefault: boolean;
  instructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  verified: boolean;
  verificationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: {
    email: {
      orderUpdates: boolean;
      shippingUpdates: boolean;
      promotions: boolean;
      priceDrops: boolean;
      backInStock: boolean;
      productReviews: boolean;
      newsletter: boolean;
      accountAlerts: boolean;
    };
    push: {
      orderUpdates: boolean;
      shippingUpdates: boolean;
      promotions: boolean;
      priceDrops: boolean;
      backInStock: boolean;
      cartReminders: boolean;
    };
    sms: {
      orderUpdates: boolean;
      shippingUpdates: boolean;
      securityAlerts: boolean;
      promotions: boolean;
    };
  };
  privacy: {
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    showPurchaseHistory: boolean;
    showWishlist: boolean;
    showReviews: boolean;
    dataSharing: {
      analytics: boolean;
      marketing: boolean;
      thirdParties: boolean;
    };
  };
  communication: {
    preferredLanguage: string;
    preferredContactMethod: 'email' | 'sms' | 'push' | 'whatsapp';
    marketingConsent: boolean;
    emailFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    currency: string;
    measurementSystem: 'metric' | 'imperial';
    timeFormat: '12h' | '24h';
    dateFormat: string;
  };
  shopping: {
    defaultShippingAddress?: string;
    defaultBillingAddress?: string;
    defaultPaymentMethod?: string;
    savePaymentMethods: boolean;
    saveAddresses: boolean;
    autoApplyCoupons: boolean;
    showTaxInclusive: boolean;
    recentlyViewedLimit: number;
    wishlistPrivacy: 'public' | 'private' | 'friends';
  };
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'app' | 'sms' | 'email';
  backupCodes?: string[];
  lastPasswordChange?: string;
  passwordExpiryDate?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  trustedDevices?: Array<{
    id: string;
    name: string;
    type: string;
    os: string;
    browser: string;
    ip: string;
    lastUsed: string;
    isCurrent: boolean;
  }>;
  loginHistory: Array<{
    timestamp: string;
    ip: string;
    location?: string;
    device: string;
    userAgent: string;
    successful: boolean;
    reason?: string;
  }>;
  securityQuestions?: Array<{
    question: string;
    answerHash: string;
  }>;
}

export interface UserRoles {
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isVendor?: boolean;
  isAffiliate?: boolean;
  isWholesale?: boolean;
  permissions: string[];
  groups: string[];
  customRoles?: string[];
  effectivePermissions: string[];
  roleHierarchy: number;
}

export interface UserSubscription {
  type: 'free' | 'premium' | 'business' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  price: number;
  currency: string;
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  paymentMethodId?: string;
  features: string[];
  limits: {
    storage?: number;
    products?: number;
    orders?: number;
    bandwidth?: number;
    users?: number;
  };
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  history: Array<{
    date: string;
    action: 'signup' | 'upgrade' | 'downgrade' | 'renewal' | 'cancellation' | 'expiration';
    plan: string;
    amount: number;
  }>;
}

export interface UserWallet {
  balance: number;
  currency: string;
  holdBalance: number;
  availableBalance: number;
  transactions: Array<{
    id: string;
    type: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
    amount: number;
    balanceAfter: number;
    description: string;
    reference?: string;
    metadata?: Record<string, any>;
    createdAt: string;
  }>;
  paymentMethods: Array<{
    id: string;
    type: 'card' | 'bank' | 'mobile' | 'wallet';
    provider: string;
    lastFour?: string;
    expiry?: string;
    isDefault: boolean;
    addedAt: string;
    verified: boolean;
  }>;
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    transactionLimit: number;
  };
}

export interface UserLoyalty {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  nextTier?: string;
  pointsToNextTier?: number;
  lifetimePoints: number;
  pointsExpiring: number;
  pointsExpiryDate?: string;
  earnings: Array<{
    date: string;
    source: 'purchase' | 'review' | 'referral' | 'birthday' | 'promotion';
    points: number;
    orderId?: string;
  }>;
  redemptions: Array<{
    date: string;
    points: number;
    discountAmount: number;
    orderId?: string;
  }>;
  benefits: string[];
}

export interface UserWishlist {
  items: Array<{
    id: string;
    productId: string;
    variantId?: string;
    addedAt: string;
    notes?: string;
    priority: 'low' | 'medium' | 'high';
    notificationEnabled: boolean;
    product?: {
      name: string;
      slug: string;
      price: number;
      originalPrice?: number;
      image?: string;
      brand?: string;
      stock: number;
    };
  }>;
  privacy: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  itemCount: number;
  lastUpdated: string;
}

export interface UserWardrobe {
  outfits: Array<{
    id: string;
    name: string;
    description?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      position: {
        x: number;
        y: number;
      };
    }>;
    tags: string[];
    occasion?: string;
    season?: string[];
    rating?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  savedItems: Array<{
    id: string;
    productId: string;
    variantId?: string;
    category: 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'accessories';
    color?: string;
    size?: string;
    brand?: string;
    purchaseDate?: string;
    price?: number;
    condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
    notes?: string;
    images?: string[];
    addedAt: string;
  }>;
  preferences: {
    style: string[];
    colors: string[];
    sizes: Record<string, string>;
    brands: string[];
    priceRange?: {
      min: number;
      max: number;
    };
  };
}

export interface UserSocial {
  followers: number;
  following: number;
  friends: string[];
  followingUsers: string[];
  friendRequests: Array<{
    id: string;
    userId: string;
    status: 'pending' | 'accepted' | 'rejected';
    sentAt: string;
    message?: string;
  }>;
  socialScore: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  contributions: {
    reviews: number;
    questions: number;
    answers: number;
    photos: number;
    videos: number;
    helpfulVotes: number;
  };
}

export interface UserAnalytics {
  lifetimeValue: number;
  averageOrderValue: number;
  orderFrequency: number;
  recency: number; // days since last purchase
  totalOrders: number;
  totalSpent: number;
  refundAmount: number;
  cancellationRate: number;
  productsPurchased: number;
  categoriesPurchased: string[];
  brandsPurchased: string[];
  purchasePattern: {
    weekday: Record<string, number>;
    hour: Record<string, number>;
    month: Record<string, number>;
  };
  browsingHistory: Array<{
    url: string;
    title: string;
    timeSpent: number;
    timestamp: string;
  }>;
  searchHistory: Array<{
    query: string;
    results: number;
    timestamp: string;
  }>;
  cartAbandonmentRate: number;
  wishlistConversionRate: number;
  emailOpenRate?: number;
  emailClickRate?: number;
  segmentation: {
    rfmScore: {
      recency: number;
      frequency: number;
      monetary: number;
      total: number;
    };
    valueTier: 'low' | 'medium' | 'high' | 'vip';
    churnRisk: 'low' | 'medium' | 'high';
    engagementLevel: 'low' | 'medium' | 'high';
  };
}

export interface UserSupport {
  tickets: Array<{
    id: string;
    subject: string;
    status: 'open' | 'pending' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    createdAt: string;
    updatedAt: string;
    lastMessage?: string;
    assignedTo?: string;
  }>;
  conversations: Array<{
    id: string;
    type: 'chat' | 'email' | 'phone';
    agent?: string;
    startedAt: string;
    endedAt?: string;
    satisfactionRating?: number;
    transcript?: string;
  }>;
  knowledgeBase: {
    articlesViewed: string[];
    searches: Array<{
      query: string;
      timestamp: string;
    }>;
  };
}

export interface UserDevice {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  version: string;
  screenResolution?: string;
  pushToken?: string;
  lastActive: string;
  isCurrent: boolean;
  location?: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
  trustLevel: 'trusted' | 'new' | 'suspicious';
}

export interface UserIntegration {
  connectedAccounts: Array<{
    provider: 'google' | 'facebook' | 'apple' | 'twitter' | 'github';
    connectedAt: string;
    lastUsed: string;
    scopes: string[];
    profile?: Record<string, any>;
  }>;
  apiKeys?: Array<{
    id: string;
    name: string;
    key: string;
    lastUsed?: string;
    createdAt: string;
    permissions: string[];
    rateLimit?: number;
  }>;
  webhooks?: Array<{
    id: string;
    url: string;
    events: string[];
    status: 'active' | 'inactive' | 'failed';
    lastTriggered?: string;
    createdAt: string;
  }>;
}

export interface UserLegal {
  termsAccepted: boolean;
  termsAcceptedAt: string;
  termsVersion: string;
  privacyAccepted: boolean;
  privacyAcceptedAt: string;
  privacyVersion: string;
  cookieConsent: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    updatedAt: string;
  };
  dataRights: {
    rightToBeForgotten?: boolean;
    rightToPortability?: boolean;
    rightToRectification?: boolean;
    requests: Array<{
      type: string;
      requestedAt: string;
      status: 'pending' | 'processing' | 'completed' | 'denied';
      completedAt?: string;
    }>;
  };
  ageVerified: boolean;
  ageVerifiedAt?: string;
  parentalConsent?: {
    granted: boolean;
    guardianEmail?: string;
    grantedAt?: string;
  };
}

export interface UserCustomFields {
  [key: string]: any;
}

export interface User extends UserBase {
  // Profile Information
  profile: UserProfile;
  
  // Addresses
  addresses: UserAddress[];
  
  // Preferences
  preferences: UserPreferences;
  
  // Security
  security: UserSecurity;
  
  // Roles & Permissions
  roles: UserRoles;
  
  // Subscriptions
  subscription: UserSubscription;
  
  // Wallet
  wallet: UserWallet;
  
  // Loyalty Program
  loyalty: UserLoyalty;
  
  // Wishlist
  wishlist: UserWishlist;
  
  // Wardrobe
  wardrobe: UserWardrobe;
  
  // Social Features
  social: UserSocial;
  
  // Analytics
  analytics: UserAnalytics;
  
  // Support History
  support: UserSupport;
  
  // Devices
  devices: UserDevice[];
  
  // Integrations
  integration: UserIntegration;
  
  // Legal
  legal: UserLegal;
  
  // Custom Fields
  customFields: UserCustomFields;
  
  // Metadata
  metadata: {
    source: 'web' | 'mobile' | 'api' | 'pos' | 'import';
    referrer?: string;
    campaign?: Record<string, string>;
    affiliateId?: string;
    salesPerson?: string;
    notes?: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId?: string;
  token: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
  deviceInfo: {
    type: string;
    os: string;
    browser: string;
    version: string;
  };
  expiresAt: string;
  lastActivityAt: string;
  isActive: boolean;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | 'order_placed' | 
        'product_viewed' | 'cart_updated' | 'review_submitted' | 'address_added' |
        'payment_method_added' | 'subscription_changed' | 'support_ticket_created';
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'system' | 'order' | 'shipping' | 'promotion' | 'security' | 'social' | 'support';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'push' | 'sms' | 'in_app')[];
  status: 'unread' | 'read' | 'archived' | 'deleted';
  sentAt: string;
  readAt?: string;
  expiresAt?: string;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface UserImportRecord {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  dateOfBirth?: string;
  gender?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  customerGroup?: string;
  loyaltyPoints?: number;
  subscriptionPlan?: string;
  roles?: string[];
  permissions?: string[];
  customFields?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  statusCode: 'pending' | 'processing' | 'success' | 'error' | 'duplicate';
}

export interface UserExportOptions {
  format: 'csv' | 'json' | 'xml';
  fields: string[];
  includeSensitive: boolean;
  includeActivity: boolean;
  includeOrders: boolean;
  includeAddresses: boolean;
  includePreferences: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    status?: string[];
    roles?: string[];
    customerGroups?: string[];
    hasOrders?: boolean;
    hasSubscription?: boolean;
    lastLoginAfter?: string;
    createdAfter?: string;
    lifetimeValueMin?: number;
    lifetimeValueMax?: number;
  };
  compression?: boolean;
  encryption?: boolean;
}

export interface UserBulkUpdate {
  userIds: string[];
  updates: Partial<{
    customerGroup: string;
    roles: string[];
    permissions: string[];
    subscriptionPlan: string;
    subscriptionStatus: string;
    loyaltyPoints: number;
    walletBalance: number;
    preferences: Partial<UserPreferences>;
    customFields: Record<string, any>;
    status: 'active' | 'inactive' | 'suspended' | 'banned';
  }>;
  updateStrategy: 'replace' | 'increment' | 'decrement' | 'append' | 'remove';
  notifyUsers: boolean;
  notificationTemplate?: string;
  dryRun: boolean;
  changeReason?: string;
}

export interface UserMergeResult {
  sourceUserId: string;
  targetUserId: string;
  merged: boolean;
  dataMerged: {
    profile: boolean;
    addresses: boolean;
    orders: boolean;
    wishlist: boolean;
    wardrobe: boolean;
    reviews: boolean;
    loyalty: boolean;
    wallet: boolean;
    preferences: boolean;
  };
  conflicts: Array<{
    field: string;
    sourceValue: any;
    targetValue: any;
    resolution: 'source' | 'target' | 'merge' | 'both';
  }>;
  mergedAt: string;
  mergedBy: string;
}

export interface UserSegment {
  id: string;
  name: string;
  description?: string;
  type: 'static' | 'dynamic';
  rules: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 
            'ends_with' | 'greater_than' | 'less_than' | 'greater_than_equal' | 
            'less_than_equal' | 'between' | 'not_between' | 'is_empty' | 'is_not_empty' |
            'in' | 'not_in';
    value: any;
  }>;
  users: string[];
  userCount: number;
  matchCount: number;
  lastUpdated: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  aggregations?: {
    roles: Array<{
      role: string;
      count: number;
    }>;
    customerGroups: Array<{
      group: string;
      count: number;
    }>;
    subscriptionPlans: Array<{
      plan: string;
      count: number;
    }>;
    countries: Array<{
      country: string;
      count: number;
    }>;
    createdDate: Array<{
      date: string;
      count: number;
    }>;
    lastLogin: Array<{
      period: string;
      count: number;
    }>;
    lifetimeValue: {
      ranges: Array<{
        range: string;
        count: number;
      }>;
    };
  };
  suggestions?: string[];
  spellCheck?: {
    original: string;
    corrected: string;
  };
}

export interface UserAuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
