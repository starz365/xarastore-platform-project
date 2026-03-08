import { getRedisCache } from '@/services/cache/redis';

interface Product {
  id: string;
  basePrice: number;
  cost?: number;
  category?: string;
  brand?: string;
  tags?: string[];
  discounts?: Array<{
    id: string;
    type: 'percentage' | 'fixed';
    value: number;
    startDate: Date;
    endDate: Date;
    minQuantity?: number;
    userSegment?: string;
  }>;
  taxRate?: number;
  shippingCost?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

interface PriceBreakdown {
  originalPrice: number;
  discountedPrice: number;
  finalPrice: number;
  discounts: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  tax: number;
  shipping: number;
  total: number;
  savings: number;
  savingsPercentage: number;
}

interface UserContext {
  id?: string;
  segment?: string;
  location?: string;
  membershipTier?: string;
  previousPurchases?: string[];
}

export class PriceCalculator {
  private product: Product;
  private userContext?: UserContext;
  private redis = getRedisCache();
  private static instance: PriceCalculator;

  constructor(product: Product, userContext?: UserContext) {
    this.product = product;
    this.userContext = userContext;
  }

  static getInstance(product: Product, userContext?: UserContext): PriceCalculator {
    return new PriceCalculator(product, userContext);
  }

  /**
   * Calculate final price with all discounts
   */
  async calculateFinalPrice(quantity: number = 1): Promise<PriceBreakdown> {
    const cacheKey = `price:${this.product.id}:${this.userContext?.id || 'guest'}:${quantity}`;
    
    // Try cache first
    const cached = await this.redis.get<PriceBreakdown>(cacheKey);
    if (cached) {
      return cached;
    }

    let price = this.product.basePrice;
    const appliedDiscounts: Array<{ name: string; amount: number; type: string }> = [];

    // Apply automatic discounts
    const automaticDiscounts = await this.getAutomaticDiscounts();
    for (const discount of automaticDiscounts) {
      const discountAmount = this.calculateDiscountAmount(price, discount);
      appliedDiscounts.push({
        name: discount.name || 'Discount',
        amount: discountAmount,
        type: discount.type,
      });
      price -= discountAmount;
    }

    // Apply user-specific discounts
    if (this.userContext) {
      const userDiscounts = await this.getUserDiscounts();
      for (const discount of userDiscounts) {
        const discountAmount = this.calculateDiscountAmount(price, discount);
        appliedDiscounts.push({
          name: discount.name || 'Member Discount',
          amount: discountAmount,
          type: discount.type,
        });
        price -= discountAmount;
      }
    }

    // Apply quantity discounts
    if (quantity > 1) {
      const quantityDiscount = await this.getQuantityDiscount(quantity);
      if (quantityDiscount) {
        const discountAmount = this.calculateDiscountAmount(price * quantity, quantityDiscount);
        appliedDiscounts.push({
          name: `${quantity}+ items discount`,
          amount: discountAmount,
          type: quantityDiscount.type,
        });
        price = (price * quantity) - discountAmount;
      } else {
        price *= quantity;
      }
    }

    // Calculate tax
    const tax = await this.calculateTax(price);

    // Calculate shipping
    const shipping = await this.calculateShipping(quantity);

    // Calculate total
    const total = price + tax + shipping;
    
    // Calculate savings
    const originalTotal = (this.product.basePrice * quantity) + tax + shipping;
    const savings = originalTotal - total;
    const savingsPercentage = (savings / originalTotal) * 100;

    const breakdown: PriceBreakdown = {
      originalPrice: this.product.basePrice * quantity,
      discountedPrice: price,
      finalPrice: total,
      discounts: appliedDiscounts,
      tax,
      shipping,
      total,
      savings,
      savingsPercentage,
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, breakdown, 300);

    return breakdown;
  }

  /**
   * Get automatic discounts (site-wide, category, brand)
   */
  private async getAutomaticDiscounts() {
    const discounts = [];
    const now = new Date();

    // Site-wide sales
    const siteWideSales = await this.redis.get<any[]>('discounts:sitewide');
    if (siteWideSales) {
      discounts.push(...siteWideSales.filter(d => 
        new Date(d.startDate) <= now && new Date(d.endDate) >= now
      ));
    }

    // Category sales
    if (this.product.category) {
      const categorySales = await this.redis.get<any[]>(`discounts:category:${this.product.category}`);
      if (categorySales) {
        discounts.push(...categorySales.filter(d =>
          new Date(d.startDate) <= now && new Date(d.endDate) >= now
        ));
      }
    }

    // Brand sales
    if (this.product.brand) {
      const brandSales = await this.redis.get<any[]>(`discounts:brand:${this.product.brand}`);
      if (brandSales) {
        discounts.push(...brandSales.filter(d =>
          new Date(d.startDate) <= now && new Date(d.endDate) >= now
        ));
      }
    }

    // Product-specific discounts
    if (this.product.discounts) {
      discounts.push(...this.product.discounts.filter(d =>
        new Date(d.startDate) <= now && new Date(d.endDate) >= now
      ));
    }

    return discounts;
  }

  /**
   * Get user-specific discounts
   */
  private async getUserDiscounts() {
    if (!this.userContext?.id) return [];

    const discounts = [];
    const now = new Date();

    // Member tier discounts
    if (this.userContext.membershipTier) {
      const tierDiscounts = await this.redis.get<any[]>(`discounts:tier:${this.userContext.membershipTier}`);
      if (tierDiscounts) {
        discounts.push(...tierDiscounts.filter(d =>
          new Date(d.startDate) <= now && new Date(d.endDate) >= now
        ));
      }
    }

    // User segment discounts
    if (this.userContext.segment) {
      const segmentDiscounts = await this.redis.get<any[]>(`discounts:segment:${this.userContext.segment}`);
      if (segmentDiscounts) {
        discounts.push(...segmentDiscounts.filter(d =>
          new Date(d.startDate) <= now && new Date(d.endDate) >= now
        ));
      }
    }

    // First-time buyer discount
    if (this.userContext.previousPurchases?.length === 0) {
      const firstTimeDiscount = await this.redis.get<any>('discounts:first-time');
      if (firstTimeDiscount) {
        discounts.push(firstTimeDiscount);
      }
    }

    // Location-based discounts
    if (this.userContext.location) {
      const locationDiscounts = await this.redis.get<any[]>(`discounts:location:${this.userContext.location}`);
      if (locationDiscounts) {
        discounts.push(...locationDiscounts.filter(d =>
          new Date(d.startDate) <= now && new Date(d.endDate) >= now
        ));
      }
    }

    return discounts;
  }

  /**
   * Get quantity-based discount
   */
  private async getQuantityDiscount(quantity: number) {
    const quantityDiscounts = await this.redis.get<any[]>('discounts:quantity');
    
    if (!quantityDiscounts) return null;

    return quantityDiscounts
      .filter(d => d.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  }

  /**
   * Calculate discount amount based on type
   */
  private calculateDiscountAmount(price: number, discount: any): number {
    if (discount.type === 'percentage') {
      return (price * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      return Math.min(discount.value, price); // Don't go below zero
    }
    return 0;
  }

  /**
   * Calculate tax
   */
  private async calculateTax(price: number): Promise<number> {
    if (!this.product.taxRate) return 0;

    // Get location-based tax adjustments
    if (this.userContext?.location) {
      const taxAdjustments = await this.redis.get<any>(`tax:${this.userContext.location}`);
      if (taxAdjustments) {
        return (price * (this.product.taxRate + taxAdjustments.adjustment)) / 100;
      }
    }

    return (price * this.product.taxRate) / 100;
  }

  /**
   * Calculate shipping cost
   */
  private async calculateShipping(quantity: number): Promise<number> {
    if (!this.product.shippingCost) {
      // Calculate based on weight/dimensions
      if (this.product.weight) {
        return this.calculateWeightBasedShipping(this.product.weight, quantity);
      }
      return 0;
    }

    // Check for free shipping threshold
    const freeShippingThreshold = await this.redis.get<number>('shipping:free-threshold');
    if (freeShippingThreshold && this.product.basePrice >= freeShippingThreshold) {
      return 0;
    }

    return this.product.shippingCost * quantity;
  }

  /**
   * Calculate shipping based on weight
   */
  private calculateWeightBasedShipping(weight: number, quantity: number): number {
    const baseRate = 100; // Base rate per kg
    const totalWeight = weight * quantity;
    
    if (totalWeight <= 1) return 200;
    if (totalWeight <= 5) return 500;
    if (totalWeight <= 10) return 800;
    if (totalWeight <= 20) return 1500;
    return 2000;
  }

  /**
   * Check if product is in flash sale
   */
  async isFlashSale(): Promise<boolean> {
    const now = new Date();
    const flashSales = await this.redis.get<any[]>('discounts:flash-sale');
    
    if (!flashSales) return false;

    return flashSales.some(sale => 
      sale.productIds?.includes(this.product.id) &&
      new Date(sale.startDate) <= now &&
      new Date(sale.endDate) >= now
    );
  }

  /**
   * Get price comparison with competitors
   */
  async getPriceComparison(): Promise<Array<{ competitor: string; price: number; url?: string }>> {
    const cacheKey = `price-comparison:${this.product.id}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In production, this would fetch from price comparison APIs
    const comparisons = [
      { competitor: 'Competitor A', price: this.product.basePrice * 1.1 },
      { competitor: 'Competitor B', price: this.product.basePrice * 0.95 },
      { competitor: 'Competitor C', price: this.product.basePrice * 1.05 },
    ];

    // Cache for 1 hour
    await this.redis.set(cacheKey, comparisons, 3600);

    return comparisons;
  }

  /**
   * Get price history
   */
  async getPriceHistory(days: number = 30): Promise<Array<{ date: string; price: number }>> {
    const cacheKey = `price-history:${this.product.id}:${days}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In production, this would fetch from price history database
    const history = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate price variations
      const variation = Math.random() * 0.2 - 0.1; // -10% to +10%
      const price = this.product.basePrice * (1 + variation);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price),
      });
    }

    // Cache for 1 day
    await this.redis.set(cacheKey, history, 86400);

    return history;
  }

  /**
   * Calculate bulk pricing
   */
  calculateBulkPricing(quantities: number[]): Array<{ quantity: number; unitPrice: number; total: number }> {
    return quantities.map(qty => {
      const total = this.product.basePrice * qty;
      
      // Apply quantity discount
      let discount = 0;
      if (qty >= 100) discount = 0.2;
      else if (qty >= 50) discount = 0.15;
      else if (qty >= 20) discount = 0.1;
      else if (qty >= 10) discount = 0.05;
      
      const discountedTotal = total * (1 - discount);
      const unitPrice = discountedTotal / qty;
      
      return {
        quantity: qty,
        unitPrice: Math.round(unitPrice),
        total: Math.round(discountedTotal),
      };
    });
  }

  /**
   * Validate price rules
   */
  validatePriceRules(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.product.basePrice <= 0) {
      errors.push('Base price must be greater than 0');
    }

    if (this.product.taxRate && (this.product.taxRate < 0 || this.product.taxRate > 100)) {
      errors.push('Tax rate must be between 0 and 100');
    }

    if (this.product.discounts) {
      for (const discount of this.product.discounts) {
        if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
          errors.push(`Discount ${discount.id}: Percentage must be between 0 and 100`);
        }
        
        if (discount.type === 'fixed' && discount.value < 0) {
          errors.push(`Discount ${discount.id}: Fixed amount must be positive`);
        }
        
        if (discount.minQuantity && discount.minQuantity < 1) {
          errors.push(`Discount ${discount.id}: Minimum quantity must be at least 1`);
        }
        
        if (new Date(discount.startDate) > new Date(discount.endDate)) {
          errors.push(`Discount ${discount.id}: Start date must be before end date`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
