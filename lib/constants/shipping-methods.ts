export const shippingMethods = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: '3-5 business days',
    icon: 'truck',
    price: 299,
    freeThreshold: 2000,
    deliveryDays: {
      min: 3,
      max: 5,
    },
    availableCountries: ['KE', 'UG', 'TZ', 'RW'],
    weightLimit: 20,
    dimensionsLimit: '120x60x60cm',
    insurance: 0,
    tracking: true,
    signatureRequired: false,
    isEnabled: true,
    sortOrder: 1,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: '1-2 business days',
    icon: 'rocket',
    price: 699,
    freeThreshold: 5000,
    deliveryDays: {
      min: 1,
      max: 2,
    },
    availableCountries: ['KE'],
    weightLimit: 10,
    dimensionsLimit: '100x50x50cm',
    insurance: 10000,
    tracking: true,
    signatureRequired: true,
    isEnabled: true,
    sortOrder: 2,
  },
  {
    id: 'same_day',
    name: 'Same Day Delivery',
    description: 'Within Nairobi, orders placed before 2 PM',
    icon: 'clock',
    price: 999,
    freeThreshold: 10000,
    deliveryDays: {
      min: 0,
      max: 1,
    },
    availableCountries: ['KE'],
    weightLimit: 5,
    dimensionsLimit: '80x40x40cm',
    insurance: 20000,
    tracking: true,
    signatureRequired: true,
    isEnabled: true,
    sortOrder: 3,
  },
  {
    id: 'international_standard',
    name: 'International Standard',
    description: '7-14 business days',
    icon: 'globe',
    price: 2499,
    freeThreshold: null,
    deliveryDays: {
      min: 7,
      max: 14,
    },
    availableCountries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'CN', 'IN', 'JP'],
    weightLimit: 30,
    dimensionsLimit: '150x80x80cm',
    insurance: 50000,
    tracking: true,
    signatureRequired: true,
    isEnabled: true,
    sortOrder: 4,
  },
  {
    id: 'international_express',
    name: 'International Express',
    description: '3-5 business days',
    icon: 'plane',
    price: 4999,
    freeThreshold: null,
    deliveryDays: {
      min: 3,
      max: 5,
    },
    availableCountries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'CN', 'IN', 'JP'],
    weightLimit: 20,
    dimensionsLimit: '120x60x60cm',
    insurance: 100000,
    tracking: true,
    signatureRequired: true,
    isEnabled: true,
    sortOrder: 5,
  },
  {
    id: 'pickup',
    name: 'Store Pickup',
    description: 'Pick up from our Nairobi store',
    icon: 'store',
    price: 0,
    freeThreshold: null,
    deliveryDays: {
      min: 1,
      max: 2,
    },
    availableCountries: ['KE'],
    weightLimit: null,
    dimensionsLimit: null,
    insurance: 0,
    tracking: false,
    signatureRequired: false,
    isEnabled: true,
    sortOrder: 6,
  },
] as const;

export type ShippingMethodId = typeof shippingMethods[number]['id'];

export const shippingMethodMap = shippingMethods.reduce((acc, method) => {
  acc[method.id] = method;
  return acc;
}, {} as Record<ShippingMethodId, typeof shippingMethods[number]>);

export const pickupLocations = [
  {
    id: 'nairobi_cbd',
    name: 'Nairobi CBD Store',
    address: 'Kimathi Street, Nairobi CBD',
    city: 'Nairobi',
    country: 'KE',
    openingHours: {
      monday: { open: '9:00', close: '18:00' },
      tuesday: { open: '9:00', close: '18:00' },
      wednesday: { open: '9:00', close: '18:00' },
      thursday: { open: '9:00', close: '18:00' },
      friday: { open: '9:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '11:00', close: '15:00' },
    },
    phone: '+254 700 000000',
    coordinates: { lat: -1.286389, lng: 36.817223 },
    isAvailable: true,
  },
  {
    id: 'westlands',
    name: 'Westlands Store',
    address: 'Westlands Mall, Westlands',
    city: 'Nairobi',
    country: 'KE',
    openingHours: {
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' },
      thursday: { open: '10:00', close: '20:00' },
      friday: { open: '10:00', close: '20:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { open: '12:00', close: '17:00' },
    },
    phone: '+254 700 000001',
    coordinates: { lat: -1.265590, lng: 36.802830 },
    isAvailable: true,
  },
  {
    id: 'mombasa',
    name: 'Mombasa Store',
    address: 'Nyali Center, Mombasa',
    city: 'Mombasa',
    country: 'KE',
    openingHours: {
      monday: { open: '9:00', close: '18:00' },
      tuesday: { open: '9:00', close: '18:00' },
      wednesday: { open: '9:00', close: '18:00' },
      thursday: { open: '9:00', close: '18:00' },
      friday: { open: '9:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '11:00', close: '15:00' },
    },
    phone: '+254 700 000002',
    coordinates: { lat: -4.043540, lng: 39.668205 },
    isAvailable: true,
  },
] as const;

export type PickupLocationId = typeof pickupLocations[number]['id'];

export function getAvailableShippingMethods(
  country: string,
  orderValue: number,
  weight?: number,
  dimensions?: { length: number; width: number; height: number }
): typeof shippingMethods {
  return shippingMethods.filter(method => {
    if (!method.isEnabled) return false;
    if (!method.availableCountries.includes(country as any)) return false;
    
    if (method.freeThreshold !== null && orderValue >= method.freeThreshold) {
      return true;
    }
    
    if (weight !== undefined && method.weightLimit !== null && weight > method.weightLimit) {
      return false;
    }
    
    if (dimensions && method.dimensionsLimit) {
      const [maxLength, maxWidth, maxHeight] = method.dimensionsLimit.split('x').map(Number);
      const { length, width, height } = dimensions;
      
      if (length > maxLength || width > maxWidth || height > maxHeight) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function calculateShippingCost(
  methodId: ShippingMethodId,
  orderValue: number,
  weight?: number
): number {
  const method = shippingMethodMap[methodId];
  if (!method) return 0;
  
  if (method.freeThreshold !== null && orderValue >= method.freeThreshold) {
    return 0;
  }
  
  let cost = method.price;
  
  if (weight !== undefined && method.weightLimit !== null) {
    const weightSurcharge = Math.max(0, weight - method.weightLimit) * 50;
    cost += weightSurcharge;
  }
  
  return cost;
}

export function getDeliveryDateRange(
  methodId: ShippingMethodId,
  orderDate: Date = new Date()
): { min: Date; max: Date } {
  const method = shippingMethodMap[methodId];
  if (!method) {
    throw new Error(`Invalid shipping method: ${methodId}`);
  }
  
  const minDate = new Date(orderDate);
  const maxDate = new Date(orderDate);
  
  const addBusinessDays = (date: Date, days: number) => {
    const result = new Date(date);
    let added = 0;
    
    while (added < days) {
      result.setDate(result.getDate() + 1);
      
      const day = result.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    
    return result;
  };
  
  return {
    min: addBusinessDays(minDate, method.deliveryDays.min),
    max: addBusinessDays(maxDate, method.deliveryDays.max),
  };
}

export function formatDeliveryEstimate(
  methodId: ShippingMethodId,
  orderDate: Date = new Date()
): string {
  const { min, max } = getDeliveryDateRange(methodId, orderDate);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (min.getTime() === max.getTime()) {
    return `Delivery by ${formatDate(min)}`;
  }
  
  return `Delivery between ${formatDate(min)} - ${formatDate(max)}`;
}
