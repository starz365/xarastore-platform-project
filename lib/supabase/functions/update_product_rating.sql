-- Function to update product rating based on reviews
CREATE OR REPLACE FUNCTION update_product_rating(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE product_id = p_product_id
        AND is_approved = true
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = p_product_id
        AND is_approved = true
    ),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for automatic rating updates
CREATE OR REPLACE FUNCTION update_product_rating_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's an INSERT or UPDATE, update the specific product
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM update_product_rating(NEW.product_id);
  END IF;
  
  -- If it's a DELETE or UPDATE that changes product_id, update the old product
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.product_id IS DISTINCT FROM NEW.product_id OR TG_OP = 'DELETE' THEN
      PERFORM update_product_rating(OLD.product_id);
    END IF;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reviews table
DROP TRIGGER IF EXISTS update_product_rating_trigger ON reviews;
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating_trigger();

-- Function to update product stock (decrement)
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update variant stock if variant_id is provided
  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET 
      stock = GREATEST(0, stock - p_quantity),
      updated_at = NOW()
    WHERE id = p_variant_id
      AND product_id = p_product_id;
  END IF;
  
  -- Update product stock
  UPDATE products
  SET 
    stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = p_product_id
    ),
    total_sold = total_sold + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Log inventory change
  INSERT INTO inventory_logs (
    product_id,
    variant_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason,
    reference_type,
    user_id
  )
  SELECT 
    p_product_id,
    p_variant_id,
    'sale',
    -p_quantity,
    COALESCE(
      (SELECT stock FROM product_variants WHERE id = p_variant_id),
      (SELECT stock FROM products WHERE id = p_product_id)
    ),
    COALESCE(
      (SELECT stock FROM product_variants WHERE id = p_variant_id),
      (SELECT stock FROM products WHERE id = p_product_id)
    ) - p_quantity,
    'Order sale',
    'order',
    auth.uid()
  WHERE p_quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product stock (increment)
CREATE OR REPLACE FUNCTION increment_product_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update variant stock if variant_id is provided
  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET 
      stock = stock + p_quantity,
      updated_at = NOW()
    WHERE id = p_variant_id
      AND product_id = p_product_id;
  END IF;
  
  -- Update product stock
  UPDATE products
  SET 
    stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = p_product_id
    ),
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Log inventory change
  INSERT INTO inventory_logs (
    product_id,
    variant_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason,
    reference_type,
    user_id
  )
  SELECT 
    p_product_id,
    p_variant_id,
    'restock',
    p_quantity,
    COALESCE(
      (SELECT stock FROM product_variants WHERE id = p_variant_id),
      (SELECT stock FROM products WHERE id = p_product_id)
    ),
    COALESCE(
      (SELECT stock FROM product_variants WHERE id = p_variant_id),
      (SELECT stock FROM products WHERE id = p_product_id)
    ) + p_quantity,
    'Order cancellation',
    'order',
    auth.uid()
  WHERE p_quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check low stock products
CREATE OR REPLACE FUNCTION check_low_stock_products()
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR,
  variant_id UUID,
  variant_name VARCHAR,
  current_stock INTEGER,
  low_stock_threshold INTEGER,
  needs_restock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    pv.id as variant_id,
    pv.name as variant_name,
    COALESCE(pv.stock, p.stock) as current_stock,
    p.low_stock_threshold,
    COALESCE(pv.stock, p.stock) <= p.low_stock_threshold as needs_restock
  FROM products p
  LEFT JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.is_active = true
    AND (
      (pv.id IS NULL AND p.stock <= p.low_stock_threshold)
      OR (pv.id IS NOT NULL AND pv.stock <= p.low_stock_threshold)
    )
  ORDER BY needs_restock DESC, current_stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product price and log history
CREATE OR REPLACE FUNCTION update_product_price(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_new_price DECIMAL,
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_price DECIMAL;
  v_change_type TEXT;
BEGIN
  -- Get old price
  IF p_variant_id IS NOT NULL THEN
    SELECT price INTO v_old_price
    FROM product_variants
    WHERE id = p_variant_id;
    
    -- Update variant price
    UPDATE product_variants
    SET 
      price = p_new_price,
      updated_at = NOW()
    WHERE id = p_variant_id;
  ELSE
    SELECT price INTO v_old_price
    FROM products
    WHERE id = p_product_id;
    
    -- Update product price
    UPDATE products
    SET 
      price = p_new_price,
      updated_at = NOW()
    WHERE id = p_product_id;
  END IF;
  
  -- Determine change type
  IF p_new_price > v_old_price THEN
    v_change_type := 'price_increase';
  ELSIF p_new_price < v_old_price THEN
    v_change_type := 'price_decrease';
  ELSE
    v_change_type := 'price_update';
  END IF;
  
  -- Log price history
  INSERT INTO price_history (
    product_id,
    variant_id,
    old_price,
    new_price,
    change_type,
    user_id,
    notes
  ) VALUES (
    p_product_id,
    p_variant_id,
    v_old_price,
    p_new_price,
    v_change_type,
    COALESCE(p_user_id, auth.uid()),
    p_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price history for a product
CREATE OR REPLACE FUNCTION get_product_price_history(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  old_price DECIMAL,
  new_price DECIMAL,
  change_type VARCHAR,
  change_percentage DECIMAL,
  user_id UUID,
  user_email VARCHAR,
  notes TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.id,
    ph.old_price,
    ph.new_price,
    ph.change_type,
    CASE 
      WHEN ph.old_price > 0 
      THEN ROUND(((ph.new_price - ph.old_price) / ph.old_price) * 100, 2)
      ELSE 0 
    END as change_percentage,
    ph.user_id,
    u.email as user_email,
    ph.notes,
    ph.created_at
  FROM price_history ph
  LEFT JOIN users u ON u.id = ph.user_id
  WHERE ph.product_id = p_product_id
    AND (p_variant_id IS NULL OR ph.variant_id = p_variant_id)
  ORDER BY ph.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product view count
CREATE OR REPLACE FUNCTION increment_product_views(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Log analytics event
  INSERT INTO analytics_events (
    event_type,
    event_data,
    page_url,
    user_id,
    session_id
  ) VALUES (
    'product_view',
    jsonb_build_object('product_id', p_product_id),
    current_setting('request.headers', true)::json->>'referer',
    auth.uid(),
    current_setting('request.headers', true)::json->>'x-session-id'
  );
  
  -- Update product metadata (you could add a view_count column to products)
  -- UPDATE products 
  -- SET metadata = jsonb_set(
  --   COALESCE(metadata, '{}'::jsonb),
  --   '{view_count}',
  --   to_jsonb(COALESCE((metadata->>'view_count')::INTEGER, 0) + 1)
  -- )
  -- WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product sales statistics
CREATE OR REPLACE FUNCTION update_product_sales_stats(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH sales_data AS (
    SELECT 
      COUNT(DISTINCT o.id) as total_orders,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.payment_status = 'paid'
  )
  UPDATE products
  SET 
    total_sold = COALESCE((SELECT total_quantity FROM sales_data), 0),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{sales_stats}',
      jsonb_build_object(
        'total_orders', COALESCE((SELECT total_orders FROM sales_data), 0),
        'total_revenue', COALESCE((SELECT total_revenue FROM sales_data), 0),
        'last_updated', NOW()
      )
    ),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
