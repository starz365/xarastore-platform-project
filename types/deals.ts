export interface DealCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  banner_image?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface DealProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  discount_type: 'percentage' | 'fixed' | 'bogo';
  discount_value: number;
  max_discount_amount?: number;
  min_quantity: number;
  max_quantity?: number;
  stock_limit?: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveDeal {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  original_price: number;
  deal_price: number;
  discount_type: 'percentage' | 'fixed' | 'bogo';
  discount_value: number;
  campaign_name: string;
  campaign_slug: string;
  images: string[];
  rating: number;
  review_count: number;
  stock: number;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}
