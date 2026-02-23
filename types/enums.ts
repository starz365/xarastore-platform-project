export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  ON_HOLD = 'on_hold'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  MPESA = 'mpesa',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  CASH_ON_DELIVERY = 'cash_on_delivery',
  WALLET = 'wallet'
}

export enum ShippingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned'
}

export enum InventoryAction {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  ADJUSTMENT = 'adjustment',
  RESERVATION = 'reservation',
  RELEASE = 'release',
  DAMAGED = 'damaged',
  EXPIRED = 'expired'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping',
  BUY_X_GET_Y = 'buy_x_get_y'
}

export enum CouponScope {
  GLOBAL = 'global',
  CATEGORY = 'category',
  PRODUCT = 'product',
  BRAND = 'brand',
  COLLECTION = 'collection'
}

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  LOW_STOCK = 'low_stock',
  PRICE_DROP = 'price_drop',
  NEW_REVIEW = 'new_review',
  REVIEW_REPLY = 'review_reply',
  ACCOUNT_VERIFIED = 'account_verified',
  PASSWORD_CHANGED = 'password_changed',
  SECURITY_ALERT = 'security_alert',
  PROMOTION = 'promotion',
  NEWSLETTER = 'newsletter'
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

export enum FileUploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  PRODUCT_VIEW = 'product_view',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  BEGIN_CHECKOUT = 'begin_checkout',
  PURCHASE = 'purchase',
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',
  WISHLIST_ADD = 'wishlist_add',
  WISHLIST_REMOVE = 'wishlist_remove',
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export enum CacheKey {
  PRODUCT_DETAILS = 'product_details',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
  USER_PROFILE = 'user_profile',
  USER_CART = 'user_cart',
  USER_WISHLIST = 'user_wishlist',
  USER_ORDERS = 'user_orders',
  SEARCH_RESULTS = 'search_results',
  DEALS = 'deals',
  FEATURED_PRODUCTS = 'featured_products',
  RECOMMENDATIONS = 'recommendations'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_EQUALS = 'gte',
  LESS_THAN_EQUALS = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IN = 'in',
  NOT_IN = 'notIn',
  BETWEEN = 'between'
}

export enum Currency {
  KES = 'KES',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP'
}

export enum Country {
  KENYA = 'KE',
  USA = 'US',
  UK = 'GB',
  CANADA = 'CA',
  AUSTRALIA = 'AU',
  GERMANY = 'DE',
  FRANCE = 'FR'
}

export enum Language {
  ENGLISH = 'en',
  SWAHILI = 'sw',
  FRENCH = 'fr',
  GERMAN = 'de',
  SPANISH = 'es'
}

export enum TimeZone {
  AFRICA_NAIROBI = 'Africa/Nairobi',
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
  EUROPE_LONDON = 'Europe/London',
  ASIA_TOKYO = 'Asia/Tokyo'
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
  TRIAL = 'trial'
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  PDF = 'pdf'
}

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}
