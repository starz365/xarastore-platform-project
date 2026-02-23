-- Trigger function to update product count in categories
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count for new product's category
    UPDATE categories
    SET product_count = product_count + 1,
        updated_at = NOW()
    WHERE id = NEW.category_id;
    
    -- Increment count for new product's brand
    UPDATE brands
    SET product_count = product_count + 1,
        updated_at = NOW()
    WHERE id = NEW.brand_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If category changed, update both old and new categories
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      -- Decrement old category
      UPDATE categories
      SET product_count = GREATEST(0, product_count - 1),
          updated_at = NOW()
      WHERE id = OLD.category_id;
      
      -- Increment new category
      UPDATE categories
      SET product_count = product_count + 1,
          updated_at = NOW()
      WHERE id = NEW.category_id;
    END IF;
    
    -- If brand changed, update both old and new brands
    IF OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
      -- Decrement old brand
      UPDATE brands
      SET product_count = GREATEST(0, product_count - 1),
          updated_at = NOW()
      WHERE id = OLD.brand_id;
      
      -- Increment new brand
      UPDATE brands
      SET product_count = product_count + 1,
          updated_at = NOW()
      WHERE id = NEW.brand_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count for deleted product's category
    UPDATE categories
    SET product_count = GREATEST(0, product_count - 1),
        updated_at = NOW()
    WHERE id = OLD.category_id;
    
    -- Decrement count for deleted product's brand
    UPDATE brands
    SET product_count = GREATEST(0, product_count - 1),
        updated_at = NOW()
    WHERE id = OLD.brand_id;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table
DROP TRIGGER IF EXISTS update_product_count_trigger ON products;
CREATE TRIGGER update_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_category_product_count();

-- Trigger function to update category hierarchy product counts
CREATE OR REPLACE FUNCTION update_category_hierarchy_product_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would update parent category counts recursively
  -- For now, we handle direct updates via the main trigger
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update product total sold count from order items
CREATE OR REPLACE FUNCTION update_product_total_sold()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update product total sold when order item is added
    UPDATE products
    SET total_sold = total_sold + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If quantity changed, update the difference
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      UPDATE products
      SET total_sold = total_sold + (NEW.quantity - OLD.quantity),
          updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    
    -- If product changed, update both old and new products
    IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      -- Decrement old product
      UPDATE products
      SET total_sold = GREATEST(0, total_sold - OLD.quantity),
          updated_at = NOW()
      WHERE id = OLD.product_id;
      
      -- Increment new product
      UPDATE products
      SET total_sold = total_sold + NEW.quantity,
          updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement product total sold when order item is deleted
    UPDATE products
    SET total_sold = GREATEST(0, total_sold - OLD.quantity),
        updated_at = NOW()
    WHERE id = OLD.product_id;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order_items table
DROP TRIGGER IF EXISTS update_product_total_sold_trigger ON order_items;
CREATE TRIGGER update_product_total_sold_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_product_total_sold();

-- Trigger function to update wishlist count
CREATE OR REPLACE FUNCTION update_wishlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Could update a wishlist_count column in products if added
    -- UPDATE products 
    -- SET wishlist_count = COALESCE(wishlist_count, 0) + 1
    -- WHERE id = NEW.product_id;
    NULL;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- UPDATE products 
    -- SET wishlist_count = GREATEST(0, COALESCE(wishlist_count, 0) - 1)
    -- WHERE id = OLD.product_id;
    NULL;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for wishlist table
DROP TRIGGER IF EXISTS update_wishlist_count_trigger ON wishlist;
CREATE TRIGGER update_wishlist_count_trigger
AFTER INSERT OR DELETE ON wishlist
FOR EACH ROW EXECUTE FUNCTION update_wishlist_count();

-- Trigger function to update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET helpful_count = helpful_count + 1,
        updated_at = NOW()
    WHERE id = NEW.review_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET helpful_count = GREATEST(0, helpful_count - 1),
        updated_at = NOW()
    WHERE id = OLD.review_id;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for review_helpful table
DROP TRIGGER IF EXISTS update_review_helpful_count_trigger ON review_helpful;
CREATE TRIGGER update_review_helpful_count_trigger
AFTER INSERT OR DELETE ON review_helpful
FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Trigger function to update discount usage count
CREATE OR REPLACE FUNCTION update_discount_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discounts
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.discount_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discounts
    SET usage_count = GREATEST(0, usage_count - 1),
        updated_at = NOW()
    WHERE id = OLD.discount_id;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for discount_usage table
DROP TRIGGER IF EXISTS update_discount_usage_count_trigger ON discount_usage;
CREATE TRIGGER update_discount_usage_count_trigger
AFTER INSERT OR DELETE ON discount_usage
FOR EACH ROW EXECUTE FUNCTION update_discount_usage_count();

-- Trigger function to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at triggers for all tables that need them
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON user_addresses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discounts_updated_at ON discounts;
CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON discounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_carts_updated_at ON shopping_carts;
CREATE TRIGGER update_shopping_carts_updated_at
BEFORE UPDATE ON shopping_carts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to maintain product stock from variants
CREATE OR REPLACE FUNCTION update_product_stock_from_variants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update product stock when variant is added
    UPDATE products
    SET stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = NEW.product_id
    ),
    updated_at = NOW()
    WHERE id = NEW.product_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update product stock when variant stock changes
    IF OLD.stock IS DISTINCT FROM NEW.stock THEN
      UPDATE products
      SET stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM product_variants
        WHERE product_id = NEW.product_id
      ),
      updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    
    -- If product changed, update both old and new products
    IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      -- Update old product
      UPDATE products
      SET stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM product_variants
        WHERE product_id = OLD.product_id
      ),
      updated_at = NOW()
      WHERE id = OLD.product_id;
      
      -- Update new product
      UPDATE products
      SET stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM product_variants
        WHERE product_id = NEW.product_id
      ),
      updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Update product stock when variant is deleted
    UPDATE products
    SET stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = OLD.product_id
    ),
    updated_at = NOW()
    WHERE id = OLD.product_id;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for product_variants table
DROP TRIGGER IF EXISTS update_product_stock_from_variants_trigger ON product_variants;
CREATE TRIGGER update_product_stock_from_variants_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_product_stock_from_variants();

-- Trigger function to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative. Product: %, Current stock: %, Requested change: %', 
      NEW.id, OLD.stock, NEW.stock - OLD.stock;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table
DROP TRIGGER IF EXISTS prevent_negative_stock_products ON products;
CREATE TRIGGER prevent_negative_stock_products
BEFORE UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- Create trigger for product_variants table
DROP TRIGGER IF EXISTS prevent_negative_stock_variants ON product_variants;
CREATE TRIGGER prevent_negative_stock_variants
BEFORE UPDATE OF stock ON product_variants
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- Trigger function to update search index (simplified example)
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- In a real implementation, this would update a search index
  -- For PostgreSQL full-text search, the tsvector columns would be updated
  
  -- For now, we just return the row
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD 
    ELSE NEW 
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table (search index)
DROP TRIGGER IF EXISTS update_search_index_products ON products;
CREATE TRIGGER update_search_index_products
AFTER INSERT OR UPDATE OF name, description ON products
FOR EACH ROW EXECUTE FUNCTION update_search_index();
