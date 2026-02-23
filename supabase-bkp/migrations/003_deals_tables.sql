-- Deals and promotions tables
CREATE TABLE IF NOT EXISTS deal_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  banner_image VARCHAR(500),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES deal_campaigns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'bogo')),
  discount_value DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  stock_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, product_id)
);

-- Function to update product deal status
CREATE OR REPLACE FUNCTION update_product_deal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product is in any active deal campaign
  UPDATE products
  SET 
    is_deal = EXISTS (
      SELECT 1 FROM deal_products dp
      JOIN deal_campaigns dc ON dp.campaign_id = dc.id
      WHERE dp.product_id = NEW.product_id
        AND dc.is_active = true
        AND dc.start_date <= NOW()
        AND dc.end_date >= NOW()
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for deal products
CREATE TRIGGER update_product_deal_status_on_insert
AFTER INSERT ON deal_products
FOR EACH ROW EXECUTE FUNCTION update_product_deal_status();

CREATE TRIGGER update_product_deal_status_on_update
AFTER UPDATE ON deal_products
FOR EACH ROW EXECUTE FUNCTION update_product_deal_status();

CREATE TRIGGER update_product_deal_status_on_delete
AFTER DELETE ON deal_products
FOR EACH ROW EXECUTE FUNCTION update_product_deal_status();

-- Function to get deal price
CREATE OR REPLACE FUNCTION get_deal_price(
  product_price DECIMAL,
  discount_type VARCHAR,
  discount_value DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  final_price DECIMAL;
BEGIN
  IF discount_type = 'percentage' THEN
    final_price := product_price * (1 - discount_value / 100);
  ELSIF discount_type = 'fixed' THEN
    final_price := product_price - discount_value;
  ELSE
    final_price := product_price;
  END IF;
  
  -- Ensure price doesn't go below 0
  RETURN GREATEST(final_price, 0);
END;
$$ LANGUAGE plpgsql;

-- View for active deals
CREATE OR REPLACE VIEW active_deals AS
SELECT 
  p.*,
  dc.name as campaign_name,
  dc.slug as campaign_slug,
  dp.discount_type,
  dp.discount_value,
  dp.max_discount_amount,
  get_deal_price(p.price, dp.discount_type, dp.discount_value) as deal_price
FROM products p
JOIN deal_products dp ON p.id = dp.product_id
JOIN deal_campaigns dc ON dp.campaign_id = dc.id
WHERE dc.is_active = true
  AND dc.start_date <= NOW()
  AND dc.end_date >= NOW()
  AND p.stock > 0;

-- Indexes for performance
CREATE INDEX idx_deal_campaigns_active ON deal_campaigns(is_active, start_date, end_date);
CREATE INDEX idx_deal_products_product ON deal_products(product_id);
CREATE INDEX idx_deal_products_campaign ON deal_products(campaign_id);
CREATE INDEX idx_products_is_deal ON products(is_deal) WHERE is_deal = true;

-- RLS Policies
ALTER TABLE deal_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;

-- Public can view active deal campaigns
CREATE POLICY "Public can view active deal campaigns" 
ON deal_campaigns FOR SELECT 
USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());

-- Public can view deal products for active campaigns
CREATE POLICY "Public can view active deal products" 
ON deal_products FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM deal_campaigns dc 
  WHERE dc.id = campaign_id 
    AND dc.is_active = true 
    AND dc.start_date <= NOW() 
    AND dc.end_date >= NOW()
));
