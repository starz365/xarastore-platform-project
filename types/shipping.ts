export interface ShippingAddress {
  id: string;
  userId: string;
  name: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  estimatedDays: {
    min: number;
    max: number;
  };
  supportedRegions: string[];
  isActive: boolean;
  requirements?: {
    minOrderValue?: number;
    maxOrderValue?: number;
    maxWeight?: number;
    maxDimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states?: string[];
  postalCodes?: string[];
  shippingMethods: string[];
  isActive: boolean;
}

export interface ShippingRate {
  id: string;
  zoneId: string;
  methodId: string;
  condition: {
    type: 'weight' | 'price' | 'quantity' | 'flat';
    min?: number;
    max?: number;
  };
  rate: number;
  currency: string;
  isActive: boolean;
}

export interface PackageDimension {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface PackageWeight {
  value: number;
  unit: 'kg' | 'lb';
}

export interface ShippingLabel {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  labelUrl: string;
  trackingUrl: string;
  estimatedDelivery: string;
  dimensions: PackageDimension;
  weight: PackageWeight;
  status: 'created' | 'printed' | 'shipped' | 'delivered' | 'returned';
  createdAt: string;
}

export interface ShippingCalculationRequest {
  address: {
    country: string;
    state: string;
    postalCode: string;
    city: string;
  };
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    weight?: number;
    dimensions?: PackageDimension;
    value: number;
  }>;
  totalValue: number;
  totalWeight: number;
  totalQuantity: number;
}

export interface ShippingCalculationResponse {
  availableMethods: ShippingMethod[];
  recommendedMethod: ShippingMethod;
  pickupPoints?: Array<{
    id: string;
    name: string;
    address: string;
    distance?: number;
    hours?: string;
  }>;
}

export interface DeliveryWindow {
  date: string;
  timeSlots: Array<{
    start: string;
    end: string;
    available: boolean;
    price?: number;
  }>;
}

export interface ShippingStatus {
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  timestamp: string;
  location?: string;
  description: string;
  carrier?: string;
  trackingNumber?: string;
}

export interface CarrierIntegration {
  id: string;
  name: string;
  code: string;
  apiKey?: string;
  apiSecret?: string;
  accountNumber?: string;
  isActive: boolean;
  settings: Record<string, any>;
  supportedServices: string[];
  supportedCountries: string[];
}

export interface InternationalShipping {
  originCountry: string;
  destinationCountry: string;
  dutiesAndTaxes: {
    estimated: number;
    currency: string;
    responsibleParty: 'sender' | 'receiver';
  };
  restrictions: string[];
  requiredDocuments: string[];
  prohibitedItems: string[];
}
