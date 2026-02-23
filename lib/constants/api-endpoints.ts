export const apiEndpoints = {
  // Authentication
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    verifyEmail: '/api/auth/verify-email',
    resetPassword: '/api/auth/reset-password',
    refreshToken: '/api/auth/refresh-token',
    socialLogin: '/api/auth/social-login',
    me: '/api/auth/me',
  },
  
  // Products
  products: {
    list: '/api/products',
    get: (id: string) => `/api/products/${id}`,
    create: '/api/products',
    update: (id: string) => `/api/products/${id}`,
    delete: (id: string) => `/api/products/${id}`,
    search: '/api/products/search',
    featured: '/api/products/featured',
    deals: '/api/products/deals',
    recommendations: '/api/products/recommendations',
    trending: '/api/products/trending',
    categories: '/api/products/categories',
    brands: '/api/products/brands',
    reviews: (productId: string) => `/api/products/${productId}/reviews`,
    variants: (productId: string) => `/api/products/${productId}/variants`,
    inventory: (productId: string) => `/api/products/${productId}/inventory`,
  },
  
  // Categories
  categories: {
    list: '/api/categories',
    get: (id: string) => `/api/categories/${id}`,
    create: '/api/categories',
    update: (id: string) => `/api/categories/${id}`,
    delete: (id: string) => `/api/categories/${id}`,
    products: (categoryId: string) => `/api/categories/${categoryId}/products`,
    tree: '/api/categories/tree',
    featured: '/api/categories/featured',
  },
  
  // Brands
  brands: {
    list: '/api/brands',
    get: (id: string) => `/api/brands/${id}`,
    create: '/api/brands',
    update: (id: string) => `/api/brands/${id}`,
    delete: (id: string) => `/api/brands/${id}`,
    products: (brandId: string) => `/api/brands/${brandId}/products`,
    featured: '/api/brands/featured',
  },
  
  // Cart
  cart: {
    get: '/api/cart',
    add: '/api/cart/items',
    update: (itemId: string) => `/api/cart/items/${itemId}`,
    remove: (itemId: string) => `/api/cart/items/${itemId}`,
    clear: '/api/cart/clear',
    merge: '/api/cart/merge',
    count: '/api/cart/count',
  },
  
  // Orders
  orders: {
    list: '/api/orders',
    get: (id: string) => `/api/orders/${id}`,
    create: '/api/orders',
    cancel: (id: string) => `/api/orders/${id}/cancel`,
    track: (id: string) => `/api/orders/${id}/track`,
    invoice: (id: string) => `/api/orders/${id}/invoice`,
    history: '/api/orders/history',
    recent: '/api/orders/recent',
    stats: '/api/orders/stats',
  },
  
  // Payments
  payments: {
    methods: '/api/payments/methods',
    create: '/api/payments',
    status: (paymentId: string) => `/api/payments/${paymentId}/status`,
    capture: (paymentId: string) => `/api/payments/${paymentId}/capture`,
    refund: (paymentId: string) => `/api/payments/${paymentId}/refund`,
    mpesa: {
      stkPush: '/api/payments/mpesa/stk-push',
      query: '/api/payments/mpesa/query',
      callback: '/api/payments/mpesa/callback',
    },
    stripe: {
      create: '/api/payments/stripe/create',
      webhook: '/api/payments/stripe/webhook',
    },
    paypal: {
      create: '/api/payments/paypal/create',
      capture: '/api/payments/paypal/capture',
      webhook: '/api/payments/paypal/webhook',
    },
  },
  
  // Shipping
  shipping: {
    methods: '/api/shipping/methods',
    rates: '/api/shipping/rates',
    calculate: '/api/shipping/calculate',
    track: (trackingNumber: string) => `/api/shipping/track/${trackingNumber}`,
    addresses: '/api/shipping/addresses',
    zones: '/api/shipping/zones',
  },
  
  // Users
  users: {
    profile: '/api/users/profile',
    update: '/api/users/profile',
    addresses: '/api/users/addresses',
    address: (id: string) => `/api/users/addresses/${id}`,
    wishlist: '/api/users/wishlist',
    wardrobe: '/api/users/wardrobe',
    preferences: '/api/users/preferences',
    notifications: '/api/users/notifications',
    activity: '/api/users/activity',
  },
  
  // Reviews
  reviews: {
    list: '/api/reviews',
    create: '/api/reviews',
    update: (id: string) => `/api/reviews/${id}`,
    delete: (id: string) => `/api/reviews/${id}`,
    user: '/api/reviews/user',
    product: (productId: string) => `/api/reviews/product/${productId}`,
    stats: (productId: string) => `/api/reviews/product/${productId}/stats`,
  },
  
  // Wishlist
  wishlist: {
    list: '/api/wishlist',
    add: '/api/wishlist',
    remove: (productId: string) => `/api/wishlist/${productId}`,
    moveToCart: (productId: string) => `/api/wishlist/${productId}/move-to-cart`,
    count: '/api/wishlist/count',
  },
  
  // Search
  search: {
    products: '/api/search/products',
    suggestions: '/api/search/suggestions',
    autocomplete: '/api/search/autocomplete',
    trending: '/api/search/trending',
    history: '/api/search/history',
  },
  
  // Analytics
  analytics: {
    track: '/api/analytics/track',
    pageview: '/api/analytics/pageview',
    event: '/api/analytics/event',
    ecommerce: '/api/analytics/ecommerce',
    performance: '/api/analytics/performance',
  },
  
  // Notifications
  notifications: {
    list: '/api/notifications',
    unread: '/api/notifications/unread',
    markRead: (id: string) => `/api/notifications/${id}/read`,
    markAllRead: '/api/notifications/read-all',
    settings: '/api/notifications/settings',
    subscribe: '/api/notifications/subscribe',
  },
  
  // Upload
  upload: {
    image: '/api/upload/image',
    file: '/api/upload/file',
    avatar: '/api/upload/avatar',
    product: '/api/upload/product',
    review: '/api/upload/review',
  },
  
  // System
  system: {
    health: '/api/system/health',
    metrics: '/api/system/metrics',
    config: '/api/system/config',
    maintenance: '/api/system/maintenance',
    logs: '/api/system/logs',
  },
  
  // Public
  public: {
    sitemap: '/sitemap.xml',
    robots: '/robots.txt',
    manifest: '/manifest.json',
    serviceWorker: '/service-worker.js',
  },
} as const;

export type ApiEndpoint = typeof apiEndpoints;

export function getFullUrl(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}${endpoint}`;
}

export const apiConfig = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cacheTime: 60000,
  staleTime: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
} as const;

export const apiErrorCodes = {
  TIMEOUT: 'api/timeout',
  NETWORK_ERROR: 'api/network-error',
  SERVER_ERROR: 'api/server-error',
  VALIDATION_ERROR: 'api/validation-error',
  UNAUTHORIZED: 'api/unauthorized',
  FORBIDDEN: 'api/forbidden',
  NOT_FOUND: 'api/not-found',
  CONFLICT: 'api/conflict',
  RATE_LIMITED: 'api/rate-limited',
} as const;

export const rateLimits = {
  public: {
    limit: 100,
    window: '1m',
  },
  authenticated: {
    limit: 1000,
    window: '1m',
  },
  admin: {
    limit: 5000,
    window: '1m',
  },
} as const;

export const webhookEvents = {
  order: {
    CREATED: 'order.created',
    UPDATED: 'order.updated',
    CANCELLED: 'order.cancelled',
    COMPLETED: 'order.completed',
    SHIPPED: 'order.shipped',
    DELIVERED: 'order.delivered',
  },
  payment: {
    CREATED: 'payment.created',
    SUCCEEDED: 'payment.succeeded',
    FAILED: 'payment.failed',
    REFUNDED: 'payment.refunded',
  },
  user: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
  },
  product: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    DELETED: 'product.deleted',
    LOW_STOCK: 'product.low_stock',
    OUT_OF_STOCK: 'product.out_of_stock',
  },
  review: {
    CREATED: 'review.created',
    UPDATED: 'review.updated',
    DELETED: 'review.deleted',
  },
} as const;
