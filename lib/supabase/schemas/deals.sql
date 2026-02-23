xarastore/lib/supabase/schemas/deals.sql
-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage < 100),
  original_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_quantity INTEGER,
  sold_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flash sales table
CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_slots INTEGER NOT NULL,
  booked_slots INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flash sale products
CREATE TABLE IF NOT EXISTS flash_sale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage DECIMAL(5,2) NOT NULL,
  max_quantity_per_customer INTEGER,
  stock INTEGER NOT NULL,
  sold INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flash_sale_id, product_id)
);

-- Indexes for performance
CREATE INDEX idx_deals_product_id ON deals(product_id);
CREATE INDEX idx_deals_end_time ON deals(end_time) WHERE is_active = true;
CREATE INDEX idx_deals_active ON deals(is_active) WHERE is_active = true;
CREATE INDEX idx_flash_sales_active ON flash_sales(is_active) WHERE is_active = true;
CREATE INDEX idx_flash_sales_time ON flash_sales(start_time, end_time);
CREATE INDEX idx_flash_sale_products_sale_id ON flash_sale_products(flash_sale_id);
CREATE INDEX idx_flash_sale_products_product_id ON flash_sale_products(product_id);

-- Function to check if deal is active
CREATE OR REPLACE FUNCTION is_deal_active(deal_end_time TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN deal_end_time > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update deal status
CREATE OR REPLACE FUNCTION update_deal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product deal status when deal expires
  IF NEW.is_active = false OR NEW.end_time <= NOW() THEN
    UPDATE products 
    SET 
      is_deal = false,
      deal_ends_at = NULL,
      original_price = NULL,
      updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deal status updates
CREATE TRIGGER update_deal_status_trigger
AFTER UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION update_deal_status();

-- Function to get active deals
CREATE OR REPLACE FUNCTION get_active_deals(
  p_category_id UUID DEFAULT NULL,
  p_min_discount DECIMAL DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  deal_id UUID,
  product_id UUID,
  product_name VARCHAR,
  product_slug VARCHAR,
  brand_name VARCHAR,
  category_name VARCHAR,
  original_price DECIMAL,
  sale_price DECIMAL,
  discount_percentage DECIMAL,
  end_time TIMESTAMP,
  stock INTEGER,
  rating DECIMAL,
  review_count INTEGER,
  images TEXT[],
  is_urgent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    p.id,
    p.name,
    p.slug,
    b.name,
    c.name,
    d.original_price,
    d.sale_price,
    d.discount_percentage,
    d.end_time,
    p.stock,
    p.rating,
    p.review_count,
    p.images,
    (d.end_time - NOW()) <= INTERVAL '24 hours' AS is_urgent
  FROM deals d
  JOIN products p ON d.product_id = p.id
  JOIN brands b ON p.brand_id = b.id
  JOIN categories c ON p.category_id = c.id
  WHERE d.is_active = true
    AND d.end_time > NOW()
    AND p.stock > 0
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND d.discount_percentage >= p_min_discount
  ORDER BY 
    CASE 
      WHEN (d.end_time - NOW()) <= INTERVAL '1 hour' THEN 1
      WHEN (d.end_time - NOW()) <= INTERVAL '24 hours' THEN 2
      ELSE 3
    END,
    d.discount_percentage DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sale_products ENABLE ROW LEVEL SECURITY;

-- Public can read active deals
CREATE POLICY "Public can view active deals" 
ON deals FOR SELECT 
USING (is_active = true AND end_time > NOW());

-- Public can read active flash sales
CREATE POLICY "Public can view active flash sales" 
ON flash_sales FOR SELECT 
USING (is_active = true AND end_time > NOW() AND start_time <= NOW());

-- Public can read flash sale products
CREATE POLICY "Public can view flash sale products" 
ON flash_sale_products FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM flash_sales fs 
  WHERE fs.id = flash_sale_products.flash_sale_id 
  AND fs.is_active = true 
  AND fs.end_time > NOW() 
  AND fs.start_time <= NOW()
));
