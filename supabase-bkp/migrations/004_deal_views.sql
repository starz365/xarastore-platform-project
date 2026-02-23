-- View for today's deals
CREATE OR REPLACE VIEW todays_deals AS
SELECT 
  p.*,
  EXTRACT(DAY FROM p.created_at) as deal_day,
  EXTRACT(MONTH FROM p.created_at) as deal_month,
  EXTRACT(YEAR FROM p.created_at) as deal_year
FROM products p
WHERE p.is_deal = true
  AND p.stock > 0
  AND DATE(p.created_at) = CURRENT_DATE
ORDER BY p.created_at DESC;

-- View for top rated deals (rating >= 4.0, at least 10 reviews)
CREATE OR REPLACE VIEW top_rated_deals AS
SELECT 
  p.*,
  RANK() OVER (ORDER BY p.rating DESC, p.review_count DESC) as rank
FROM products p
WHERE p.is_deal = true
  AND p.stock > 0
  AND p.rating >= 4.0
  AND p.review_count >= 10
ORDER BY p.rating DESC, p.review_count DESC;

-- View for new arrival deals (created within last 7 days)
CREATE OR REPLACE VIEW new_arrival_deals AS
SELECT 
  p.*,
  AGE(NOW(), p.created_at) as age_days
FROM products p
WHERE p.is_deal = true
  AND p.stock > 0
  AND p.created_at >= NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;

-- View for ending soon deals (ends within next 3 days)
CREATE OR REPLACE VIEW ending_soon_deals AS
SELECT 
  p.*,
  EXTRACT(EPOCH FROM (p.deal_ends_at - NOW())) / 3600 as hours_remaining
FROM products p
WHERE p.is_deal = true
  AND p.stock > 0
  AND p.deal_ends_at IS NOT NULL
  AND p.deal_ends_at >= NOW()
  AND p.deal_ends_at <= NOW() + INTERVAL '3 days'
ORDER BY p.deal_ends_at ASC;

-- Function to get deal discount percentage
CREATE OR REPLACE FUNCTION get_deal_discount_percentage(product_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  product_price DECIMAL;
  original_price DECIMAL;
  discount DECIMAL;
BEGIN
  SELECT price, original_price 
  INTO product_price, original_price
  FROM products 
  WHERE id = product_id;
  
  IF original_price IS NULL OR original_price <= 0 THEN
    RETURN 0;
  END IF;
  
  discount := ((original_price - product_price) / original_price) * 100;
  RETURN ROUND(discount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if deal is active
CREATE OR REPLACE FUNCTION is_deal_active(product_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  deal_ends TIMESTAMP;
  is_deal_flag BOOLEAN;
BEGIN
  SELECT deal_ends_at, is_deal 
  INTO deal_ends, is_deal_flag
  FROM products 
  WHERE id = product_id;
  
  RETURN is_deal_flag AND (deal_ends IS NULL OR deal_ends > NOW());
END;
$$ LANGUAGE plpgsql;

-- Materialized view for fast deal queries (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS deal_summary AS
SELECT 
  p.id,
  p.slug,
  p.name,
  p.price,
  p.original_price,
  p.images[1] as main_image,
  p.rating,
  p.review_count,
  p.stock,
  p.deal_ends_at,
  b.name as brand_name,
  b.slug as brand_slug,
  c.name as category_name,
  c.slug as category_slug,
  get_deal_discount_percentage(p.id) as discount_percentage,
  is_deal_active(p.id) as is_active
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_deal = true
  AND p.stock > 0;

-- Indexes for materialized view
CREATE INDEX idx_deal_summary_active ON deal_summary(is_active);
CREATE INDEX idx_deal_summary_discount ON deal_summary(discount_percentage DESC);
CREATE INDEX idx_deal_summary_rating ON deal_summary(rating DESC);
CREATE INDEX idx_deal_summary_category ON deal_summary(category_slug);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_deal_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deal_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh (run this in a cron job)
-- SELECT cron.schedule('refresh-deal-summary', '0 */6 * * *', 'SELECT refresh_deal_summary()');
