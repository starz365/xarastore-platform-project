export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  sku: string;
  brand: Brand;
  category: Category;
  images: string[];
  variants: ProductVariant[];
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  isDeal: boolean;
  dealEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo: string;
  productCount: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
  image?: string;
  productCount: number;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  products: Product[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variant: ProductVariant;
  quantity: number;
  addedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  estimatedDelivery?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isVerified: boolean;
  createdAt: string;
  user?: {
    name: string;
    avatar?: string;
  };
}



// ... existing types ...

export interface Deal {
  id: string;
  productId: string;
  discountPercentage: number;
  originalPrice: number;
  salePrice: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxQuantity?: number;
  soldQuantity: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface FlashSale {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  products: FlashSaleProduct[];
  totalSlots: number;
  bookedSlots: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlashSaleProduct {
  id: string;
  flashSaleId: string;
  productId: string;
  discountPercentage: number;
  maxQuantityPerCustomer?: number;
  stock: number;
  sold: number;
  product?: Product;
}

export interface CountdownTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isUrgent: boolean;
}





export interface OrderTracking {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: TrackingStatus;
  estimatedDelivery?: string;
  steps: TrackingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackingStep {
  id: string;
  trackingId: string;
  status: string;
  location: string;
  description?: string;
  timestamp: string;
}

export type TrackingStatus = 
  | 'label_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'returned';


