export interface ProductBase {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  upc?: string;
  ean?: string;
  isbn?: string;
  mpn?: string;
}

export interface ProductPrice {
  price: number;
  originalPrice?: number;
  costPrice?: number;
  currency: string;
  taxRate?: number;
  taxIncluded: boolean;
  discountAmount?: number;
  discountPercentage?: number;
  discountType?: 'percentage' | 'fixed';
  discountStart?: string;
  discountEnd?: string;
  minimumPrice?: number;
  maximumPrice?: number;
  tieredPricing?: Array<{
    minQuantity: number;
    price: number;
  }>;
}

export interface ProductInventory {
  stock: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  backorderQuantity?: number;
  manageStock: boolean;
  stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder' | 'discontinued';
  warehouseLocation?: string;
  shelf?: string;
  bin?: string;
  lastStockUpdate?: string;
  stockUpdatedBy?: string;
}

export interface ProductShipping {
  weight: number;
  weightUnit: 'g' | 'kg' | 'lb' | 'oz';
  length?: number;
  width?: number;
  height?: number;
  dimensionsUnit: 'cm' | 'm' | 'in' | 'ft';
  shippingClass?: string;
  requiresShipping: boolean;
  shippingFee?: number;
  freeShipping: boolean;
  shippingRestrictions?: string[];
  estimatedDelivery?: {
    minDays: number;
    maxDays: number;
    timeUnit: 'hours' | 'days' | 'weeks';
  };
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string[];
  level: number;
  image?: string;
  productCount: number;
  displayOrder: number;
  isActive: boolean;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface ProductBrand {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  foundedYear?: number;
  productCount: number;
  isActive: boolean;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
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
  attributes: Record<string, string>;
  images?: string[];
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  type: 'text' | 'number' | 'color' | 'image' | 'select' | 'multiselect';
  values: Array<{
    id: string;
    value: string;
    display: string;
    color?: string;
    image?: string;
    displayOrder: number;
  }>;
  filterable: boolean;
  visible: boolean;
  searchable: boolean;
  required: boolean;
  displayOrder: number;
}

export interface ProductSpecification {
  group: string;
  items: Array<{
    name: string;
    value: string;
    unit?: string;
    displayOrder: number;
  }>;
  displayOrder: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  displayOrder: number;
  isPrimary: boolean;
  variants?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
    original?: string;
  };
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    createdAt?: string;
  };
}

export interface ProductVideo {
  id: string;
  url: string;
  type: 'youtube' | 'vimeo' | 'direct';
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: number;
  displayOrder: number;
}

export interface ProductDocument {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'xls' | 'ppt' | 'txt';
  size?: number;
  language?: string;
  displayOrder: number;
}

export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  metaRobots?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitterCard?: {
    title?: string;
    description?: string;
    image?: string;
    cardType?: string;
  };
  schemaMarkup?: Record<string, any>;
}

export interface ProductReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchases: number;
  recentReviews: number;
  lastReviewDate?: string;
}

export interface ProductRelated {
  type: 'cross_sell' | 'upsell' | 'related' | 'frequently_bought_together';
  products: Array<{
    id: string;
    slug: string;
    name: string;
    price: number;
    image?: string;
    relationStrength: number;
    displayOrder: number;
  }>;
}

export interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue?: number;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    discountApplied?: boolean;
    required: boolean;
    displayOrder: number;
  }>;
  totalPrice: number;
  discountedPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ProductDigital {
  isDigital: boolean;
  downloadLimit?: number;
  downloadExpiry?: number; // days
  downloadFiles?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
    displayOrder: number;
  }>;
  licenseKey?: {
    enabled: boolean;
    generator: 'random' | 'pattern' | 'external';
    pattern?: string;
    prefix?: string;
    suffix?: string;
    length?: number;
  };
}

export interface ProductSubscription {
  isSubscription: boolean;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriod?: number; // days
  trialPrice?: number;
  signupFee?: number;
  minCycles?: number;
  maxCycles?: number;
  autoRenew: boolean;
  cancellationPolicy?: string;
}

export interface ProductWholesale {
  enabled: boolean;
  tiers: Array<{
    minQuantity: number;
    price: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  }>;
  requirements?: {
    minOrderValue?: number;
    customerGroups?: string[];
    approvalRequired: boolean;
  };
}

export interface ProductAdvanced {
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isOnSale: boolean;
  isPreOrder: boolean;
  preOrderReleaseDate?: string;
  isGiftCard: boolean;
  giftCardType?: 'fixed' | 'variable';
  giftCardAmounts?: number[];
  isVirtual: boolean;
  isDownloadable: boolean;
  requiresLicense: boolean;
  licenseType?: string;
  ageRestriction?: number;
  hazardousMaterial: boolean;
  hazardousClass?: string;
  batteryIncluded: boolean;
  batteryType?: string;
  warranty?: {
    duration: number;
    unit: 'days' | 'months' | 'years';
    type: string;
    terms?: string;
  };
  customs?: {
    hsCode?: string;
    countryOfOrigin?: string;
    customsValue?: number;
    customsDescription?: string;
  };
}

export interface ProductAnalytics {
  views: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
  averageOrderValue: number;
  lastViewed?: string;
  lastPurchased?: string;
  popularHours?: Array<{
    hour: number;
    views: number;
    purchases: number;
  }>;
  popularDays?: Array<{
    day: string;
    views: number;
    purchases: number;
  }>;
}

export interface ProductSocial {
  shares: {
    facebook: number;
    twitter: number;
    pinterest: number;
    whatsapp: number;
    total: number;
  };
  likes: number;
  saves: number;
  mentions: number;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
    score: number;
  };
}

export interface ProductCompliance {
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  rohsCompliant?: boolean;
  reachCompliant?: boolean;
  prop65Compliant?: boolean;
  isoCertified?: boolean[];
  safetyStandards?: string[];
  environmentalClaims?: string[];
  recyclingInfo?: string;
}

export interface ProductLocalization {
  language: string;
  translations: {
    name?: string;
    description?: string;
    shortDescription?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    specifications?: Array<{
      group: string;
      items: Array<{
        name: string;
        value: string;
      }>;
    }>;
    attributes?: Record<string, string>;
  };
}

export interface ProductHistory {
  type: 'price_change' | 'stock_update' | 'status_change' | 'image_update' | 'description_update';
  previousValue: any;
  newValue: any;
  changedBy: string;
  changedAt: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ProductAudit {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  unpublishedBy?: string;
  unpublishedAt?: string;
  version: number;
  revisionNotes?: string[];
}

export interface Product extends ProductBase {
  // Core Information
  type: 'simple' | 'variable' | 'bundle' | 'grouped' | 'digital' | 'service';
  status: 'draft' | 'pending' | 'published' | 'archived' | 'deleted';
  visibility: 'visible' | 'catalog' | 'search' | 'hidden';
  
  // Pricing
  pricing: ProductPrice;
  
  // Inventory
  inventory: ProductInventory;
  
  // Shipping
  shipping: ProductShipping;
  
  // Categories & Brand
  categories: ProductCategory[];
  brand?: ProductBrand;
  tags: string[];
  
  // Media
  images: ProductImage[];
  videos?: ProductVideo[];
  documents?: ProductDocument[];
  
  // Variants
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  
  // Specifications
  specifications?: ProductSpecification[];
  
  // SEO
  seo: ProductSEO;
  
  // Reviews
  reviewStats: ProductReviewStats;
  
  // Related Products
  related?: ProductRelated[];
  
  // Bundles
  bundles?: ProductBundle[];
  
  // Digital Products
  digital?: ProductDigital;
  
  // Subscriptions
  subscription?: ProductSubscription;
  
  // Wholesale
  wholesale?: ProductWholesale;
  
  // Advanced Features
  advanced: ProductAdvanced;
  
  // Analytics
  analytics: ProductAnalytics;
  
  // Social
  social: ProductSocial;
  
  // Compliance
  compliance: ProductCompliance;
  
  // Localization
  localizations?: ProductLocalization[];
  
  // History
  history?: ProductHistory[];
  
  // Audit
  audit: ProductAudit;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ProductFilter {
  // Search
  search?: string;
  
  // Categories
  categories?: string[];
  excludeCategories?: string[];
  categorySlugs?: string[];
  
  // Brand
  brands?: string[];
  brandSlugs?: string[];
  
  // Price Range
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  
  // Inventory
  inStock?: boolean;
  lowStock?: boolean;
  stockStatus?: string[];
  
  // Rating
  minRating?: number;
  maxRating?: number;
  
  // Attributes
  attributes?: Record<string, string[]>;
  
  // Tags
  tags?: string[];
  excludeTags?: string[];
  
  // Advanced Filters
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  isDigital?: boolean;
  isSubscription?: boolean;
  requiresShipping?: boolean;
  
  // Date Filters
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  
  // Status
  status?: string[];
  visibility?: string[];
  
  // Sort
  sortBy?: 'price' | 'name' | 'created' | 'updated' | 'rating' | 'popularity' | 'sales';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
  
  // Location-based
  warehouse?: string;
  shippingDestination?: string;
  
  // Customer-specific
  customerGroup?: string;
  loyaltyTier?: string;
  
  // Custom fields
  customFields?: Record<string, any>;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  filters: ProductFilter;
  aggregations?: {
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      count: number;
    }>;
    brands: Array<{
      id: string;
      name: string;
      slug: string;
      count: number;
    }>;
    priceRange: {
      min: number;
      max: number;
    };
    attributes: Record<string, Array<{
      value: string;
      display: string;
      count: number;
    }>>;
    tags: Array<{
      tag: string;
      count: number;
    }>;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  suggestions?: string[];
  relatedSearches?: string[];
  spellCheck?: {
    original: string;
    corrected: string;
    suggested: string[];
  };
}

export interface ProductImportRecord {
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  currency?: string;
  stock: number;
  lowStockThreshold?: number;
  allowBackorders?: boolean;
  manageStock?: boolean;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionsUnit?: string;
  category?: string;
  categories?: string[];
  brand?: string;
  tags?: string[];
  images?: string[];
  attributes?: Record<string, string>;
  specifications?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  status?: string;
  visibility?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  discountType?: string;
  discountValue?: number;
  discountStart?: string;
  discountEnd?: string;
  requiresShipping?: boolean;
  shippingFee?: number;
  freeShipping?: boolean;
  isDigital?: boolean;
  isSubscription?: boolean;
  subscriptionInterval?: string;
  subscriptionIntervalCount?: number;
  warrantyDuration?: number;
  warrantyUnit?: string;
  warrantyType?: string;
  customsHsCode?: string;
  customsCountryOfOrigin?: string;
  customsValue?: number;
  customsDescription?: string;
  upc?: string;
  ean?: string;
  isbn?: string;
  mpn?: string;
  ageRestriction?: number;
  hazardousMaterial?: boolean;
  hazardousClass?: string;
  batteryIncluded?: boolean;
  batteryType?: string;
  gdprCompliant?: boolean;
  ccpaCompliant?: boolean;
  rohsCompliant?: boolean;
  reachCompliant?: boolean;
  prop65Compliant?: boolean;
  isoCertified?: string[];
  safetyStandards?: string[];
  environmentalClaims?: string[];
  recyclingInfo?: string;
  // Variants
  variantAttributes?: string;
  variantValues?: string;
  variantPrices?: string;
  variantStock?: string;
  variantSkus?: string;
  // Errors
  errors?: string[];
  warnings?: string[];
  statusCode: 'pending' | 'processing' | 'success' | 'error' | 'warning';
  processedAt?: string;
}

export interface ProductExportOptions {
  format: 'csv' | 'json' | 'xml' | 'excel';
  fields: string[];
  filters?: ProductFilter;
  includeVariants: boolean;
  includeImages: boolean;
  includeMetadata: boolean;
  includeHistory: boolean;
  includeAnalytics: boolean;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  compression?: boolean;
  chunkSize?: number;
}

export interface ProductBulkUpdate {
  skus: string[];
  updates: Partial<{
    price: number;
    originalPrice: number;
    stock: number;
    status: string;
    visibility: string;
    categories: string[];
    tags: string[];
    attributes: Record<string, string>;
    seoTitle: string;
    seoDescription: string;
    isFeatured: boolean;
    isOnSale: boolean;
    discountType: string;
    discountValue: number;
    discountStart: string;
    discountEnd: string;
    warehouseLocation: string;
    shippingClass: string;
    requiresShipping: boolean;
    freeShipping: boolean;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    warrantyDuration: number;
    warrantyType: string;
    ageRestriction: number;
    hazardousMaterial: boolean;
    customsHsCode: string;
    customsCountryOfOrigin: string;
  }>;
  updateStrategy: 'replace' | 'increment' | 'decrement' | 'append' | 'remove';
  dryRun: boolean;
  notifyChanges: boolean;
  changeReason?: string;
}

export interface ProductSyncResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    sku: string;
    error: string;
    details?: any;
  }>;
  warnings: Array<{
    sku: string;
    warning: string;
    details?: any;
  }>;
  changes: Array<{
    sku: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  duration: number;
  startedAt: string;
  completedAt: string;
  summary: Record<string, number>;
}





export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  sku: string;
  brand: {
    id: string;
    slug: string;
    name: string;
    logo?: string;
    productCount: number;
  };
  category: {
    id: string;
    slug: string;
    name: string;
    productCount: number;
  };
  images: string[];
  variants: ProductVariant[];
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  isDeal: boolean;
  dealEndsAt?: string | null;
  allowPreorder?: boolean;
  estimatedRestockDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
}
