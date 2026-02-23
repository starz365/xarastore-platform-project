export const errorCodes = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'auth/invalid-credentials',
    EMAIL_ALREADY_EXISTS: 'auth/email-already-exists',
    USER_NOT_FOUND: 'auth/user-not-found',
    WEAK_PASSWORD: 'auth/weak-password',
    INVALID_EMAIL: 'auth/invalid-email',
    ACCOUNT_LOCKED: 'auth/account-locked',
    SESSION_EXPIRED: 'auth/session-expired',
    TOKEN_EXPIRED: 'auth/token-expired',
    UNAUTHORIZED: 'auth/unauthorized',
  },
  
  // Product errors
  PRODUCT: {
    NOT_FOUND: 'product/not-found',
    OUT_OF_STOCK: 'product/out-of-stock',
    INVALID_VARIANT: 'product/invalid-variant',
    PRICE_MISMATCH: 'product/price-mismatch',
    CATEGORY_NOT_FOUND: 'product/category-not-found',
    BRAND_NOT_FOUND: 'product/brand-not-found',
    IMAGE_UPLOAD_FAILED: 'product/image-upload-failed',
    SKU_ALREADY_EXISTS: 'product/sku-already-exists',
  },
  
  // Cart errors
  CART: {
    EMPTY: 'cart/empty',
    ITEM_NOT_FOUND: 'cart/item-not-found',
    QUANTITY_EXCEEDS_STOCK: 'cart/quantity-exceeds-stock',
    INVALID_ITEM: 'cart/invalid-item',
    CART_NOT_FOUND: 'cart/not-found',
    CART_EXPIRED: 'cart/expired',
  },
  
  // Order errors
  ORDER: {
    NOT_FOUND: 'order/not-found',
    ALREADY_PROCESSED: 'order/already-processed',
    PAYMENT_FAILED: 'order/payment-failed',
    INSUFFICIENT_STOCK: 'order/insufficient-stock',
    INVALID_STATUS: 'order/invalid-status',
    SHIPPING_FAILED: 'order/shipping-failed',
    REFUND_FAILED: 'order/refund-failed',
    CANCELLATION_FAILED: 'order/cancellation-failed',
  },
  
  // Payment errors
  PAYMENT: {
    DECLINED: 'payment/declined',
    INSUFFICIENT_FUNDS: 'payment/insufficient-funds',
    CARD_EXPIRED: 'payment/card-expired',
    INVALID_CARD: 'payment/invalid-card',
    PROCESSING_ERROR: 'payment/processing-error',
    TIMEOUT: 'payment/timeout',
    FRAUD_DETECTED: 'payment/fraud-detected',
    MPESA_FAILED: 'payment/mpesa-failed',
    STRIPE_FAILED: 'payment/stripe-failed',
    PAYPAL_FAILED: 'payment/paypal-failed',
  },
  
  // Shipping errors
  SHIPPING: {
    ADDRESS_INVALID: 'shipping/address-invalid',
    SERVICE_UNAVAILABLE: 'shipping/service-unavailable',
    RATE_NOT_FOUND: 'shipping/rate-not-found',
    TRACKING_FAILED: 'shipping/tracking-failed',
    DELIVERY_FAILED: 'shipping/delivery-failed',
    RESTRICTED_AREA: 'shipping/restricted-area',
  },
  
  // User errors
  USER: {
    PROFILE_NOT_FOUND: 'user/profile-not-found',
    ADDRESS_NOT_FOUND: 'user/address-not-found',
    PASSWORD_MISMATCH: 'user/password-mismatch',
    EMAIL_NOT_VERIFIED: 'user/email-not-verified',
    PHONE_NOT_VERIFIED: 'user/phone-not-verified',
    ACCOUNT_DISABLED: 'user/account-disabled',
  },
  
  // System errors
  SYSTEM: {
    DATABASE_ERROR: 'system/database-error',
    NETWORK_ERROR: 'system/network-error',
    SERVICE_UNAVAILABLE: 'system/service-unavailable',
    RATE_LIMITED: 'system/rate-limited',
    MAINTENANCE: 'system/maintenance',
    VALIDATION_ERROR: 'system/validation-error',
    CONFIGURATION_ERROR: 'system/configuration-error',
    UNKNOWN_ERROR: 'system/unknown-error',
  },
  
  // API errors
  API: {
    INVALID_REQUEST: 'api/invalid-request',
    MISSING_PARAMETERS: 'api/missing-parameters',
    INVALID_TOKEN: 'api/invalid-token',
    RATE_LIMIT_EXCEEDED: 'api/rate-limit-exceeded',
    ENDPOINT_NOT_FOUND: 'api/endpoint-not-found',
    METHOD_NOT_ALLOWED: 'api/method-not-allowed',
    PAYLOAD_TOO_LARGE: 'api/payload-too-large',
  },
  
  // File upload errors
  UPLOAD: {
    FILE_TOO_LARGE: 'upload/file-too-large',
    INVALID_TYPE: 'upload/invalid-type',
    UPLOAD_FAILED: 'upload/upload-failed',
    STORAGE_ERROR: 'upload/storage-error',
    VIRUS_DETECTED: 'upload/virus-detected',
  },
} as const;

export type ErrorCode = 
  | typeof errorCodes.AUTH[keyof typeof errorCodes.AUTH]
  | typeof errorCodes.PRODUCT[keyof typeof errorCodes.PRODUCT]
  | typeof errorCodes.CART[keyof typeof errorCodes.CART]
  | typeof errorCodes.ORDER[keyof typeof errorCodes.ORDER]
  | typeof errorCodes.PAYMENT[keyof typeof errorCodes.PAYMENT]
  | typeof errorCodes.SHIPPING[keyof typeof errorCodes.SHIPPING]
  | typeof errorCodes.USER[keyof typeof errorCodes.USER]
  | typeof errorCodes.SYSTEM[keyof typeof errorCodes.SYSTEM]
  | typeof errorCodes.API[keyof typeof errorCodes.API]
  | typeof errorCodes.UPLOAD[keyof typeof errorCodes.UPLOAD];

export const errorMessages: Record<ErrorCode, string> = {
  // Authentication
  'auth/invalid-credentials': 'Invalid email or password. Please try again.',
  'auth/email-already-exists': 'An account with this email already exists.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/weak-password': 'Password is too weak. Please use a stronger password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/account-locked': 'Account temporarily locked. Try again later or reset password.',
  'auth/session-expired': 'Your session has expired. Please log in again.',
  'auth/token-expired': 'Your access token has expired. Please refresh the page.',
  'auth/unauthorized': 'You are not authorized to perform this action.',
  
  // Products
  'product/not-found': 'The requested product was not found.',
  'product/out-of-stock': 'This product is currently out of stock.',
  'product/invalid-variant': 'The selected product variant is invalid.',
  'product/price-mismatch': 'The product price has been updated. Please refresh the page.',
  'product/category-not-found': 'The requested category was not found.',
  'product/brand-not-found': 'The requested brand was not found.',
  'product/image-upload-failed': 'Failed to upload product image. Please try again.',
  'product/sku-already-exists': 'A product with this SKU already exists.',
  
  // Cart
  'cart/empty': 'Your cart is empty.',
  'cart/item-not-found': 'The cart item was not found.',
  'cart/quantity-exceeds-stock': 'Requested quantity exceeds available stock.',
  'cart/invalid-item': 'The cart item is invalid.',
  'cart/not-found': 'Cart not found.',
  'cart/expired': 'Your cart has expired. Please add items again.',
  
  // Orders
  'order/not-found': 'Order not found.',
  'order/already-processed': 'This order has already been processed.',
  'order/payment-failed': 'Payment processing failed. Please try again.',
  'order/insufficient-stock': 'Some items in your order are out of stock.',
  'order/invalid-status': 'Order status is invalid for this operation.',
  'order/shipping-failed': 'Shipping processing failed. Please contact support.',
  'order/refund-failed': 'Refund processing failed. Please contact support.',
  'order/cancellation-failed': 'Order cancellation failed. Please contact support.',
  
  // Payments
  'payment/declined': 'Your payment was declined. Please try another method.',
  'payment/insufficient-funds': 'Insufficient funds. Please try another payment method.',
  'payment/card-expired': 'Your card has expired. Please update your card details.',
  'payment/invalid-card': 'Invalid card details. Please check and try again.',
  'payment/processing-error': 'Payment processing error. Please try again.',
  'payment/timeout': 'Payment request timed out. Please try again.',
  'payment/fraud-detected': 'Fraud detection prevented this transaction.',
  'payment/mpesa-failed': 'M-Pesa payment failed. Please try again.',
  'payment/stripe-failed': 'Stripe payment failed. Please try again.',
  'payment/paypal-failed': 'PayPal payment failed. Please try again.',
  
  // Shipping
  'shipping/address-invalid': 'Invalid shipping address. Please check and try again.',
  'shipping/service-unavailable': 'Shipping service unavailable for this address.',
  'shipping/rate-not-found': 'Shipping rate not found for this destination.',
  'shipping/tracking-failed': 'Unable to track shipment. Please try again later.',
  'shipping/delivery-failed': 'Delivery failed. Please contact the courier.',
  'shipping/restricted-area': 'We cannot ship to this area.',
  
  // Users
  'user/profile-not-found': 'User profile not found.',
  'user/address-not-found': 'Address not found.',
  'user/password-mismatch': 'Current password is incorrect.',
  'user/email-not-verified': 'Please verify your email address.',
  'user/phone-not-verified': 'Please verify your phone number.',
  'user/account-disabled': 'Your account has been disabled.',
  
  // System
  'system/database-error': 'Database error. Please try again.',
  'system/network-error': 'Network error. Please check your connection.',
  'system/service-unavailable': 'Service temporarily unavailable.',
  'system/rate-limited': 'Too many requests. Please slow down.',
  'system/maintenance': 'System under maintenance. Please try again later.',
  'system/validation-error': 'Validation error. Please check your input.',
  'system/configuration-error': 'System configuration error.',
  'system/unknown-error': 'An unexpected error occurred.',
  
  // API
  'api/invalid-request': 'Invalid request. Please check your input.',
  'api/missing-parameters': 'Missing required parameters.',
  'api/invalid-token': 'Invalid or expired token.',
  'api/rate-limit-exceeded': 'API rate limit exceeded.',
  'api/endpoint-not-found': 'API endpoint not found.',
  'api/method-not-allowed': 'HTTP method not allowed.',
  'api/payload-too-large': 'Request payload too large.',
  
  // Upload
  'upload/file-too-large': 'File is too large. Maximum size is 10MB.',
  'upload/invalid-type': 'Invalid file type. Please upload a valid image.',
  'upload/upload-failed': 'File upload failed. Please try again.',
  'upload/storage-error': 'Storage error. Please try again later.',
  'upload/virus-detected': 'Virus detected in uploaded file.',
};
