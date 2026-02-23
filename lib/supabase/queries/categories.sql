-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image TEXT,
  product_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Function to update product count
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product count for old category
  IF OLD.category_id IS NOT NULL THEN
    UPDATE categories
    SET product_count = (
      SELECT COUNT(*) 
      FROM products 
      WHERE category_id = OLD.category_id 
      AND is_active = true
    ),
    updated_at = NOW()
    WHERE id = OLD.category_id;
  END IF;
  
  -- Update product count for new category
  IF NEW.category_id IS NOT NULL THEN
    UPDATE categories
    SET product_count = (
      SELECT COUNT(*) 
      FROM products 
      WHERE category_id = NEW.category_id 
      AND is_active = true
    ),
    updated_at = NOW()
    WHERE id = NEW.category_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for product updates
CREATE TRIGGER update_category_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_category_product_count();

-- Function to get category hierarchy
CREATE OR REPLACE FUNCTION get_category_tree(root_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  parent_id UUID,
  level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Anchor: top-level categories or specific root
    SELECT 
      c.id,
      c.slug,
      c.name,
      c.parent_id,
      1 as level,
      ARRAY[c.slug] as path
    FROM categories c
    WHERE 
      c.is_active = true
      AND (
        root_id IS NULL AND c.parent_id IS NULL
        OR c.id = root_id
      )
    
    UNION ALL
    
    -- Recursive: child categories
    SELECT 
      c.id,
      c.slug,
      c.name,
      c.parent_id,
      ct.level + 1,
      ct.path || c.slug
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT * FROM category_tree
  ORDER BY level, (SELECT sort_order FROM categories WHERE id = category_tree.id);
END;
$$ LANGUAGE plpgsql;

-- Function to search categories
CREATE OR REPLACE FUNCTION search_categories(
  search_term TEXT DEFAULT NULL,
  parent_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  image TEXT,
  product_count INTEGER,
  parent_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.slug,
    c.name,
    c.description,
    c.image,
    c.product_count,
    p.name as parent_name
  FROM categories c
  LEFT JOIN categories p ON c.parent_id = p.id
  WHERE 
    c.is_active = true
    AND (
      search_term IS NULL 
      OR c.name ILIKE '%' || search_term || '%'
      OR c.description ILIKE '%' || search_term || '%'
    )
    AND (
      parent_id IS NULL 
      OR c.parent_id = parent_id
      OR (parent_id IS NOT NULL AND c.parent_id IS NULL AND parent_id = '00000000-0000-0000-0000-000000000000')
    )
  ORDER BY 
    CASE 
      WHEN search_term IS NOT NULL THEN 
        CASE 
          WHEN c.name ILIKE search_term THEN 1
          WHEN c.name ILIKE '%' || search_term || '%' THEN 2
          ELSE 3
        END
      ELSE c.sort_order
    END,
    c.name
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- View for active categories with parent info
CREATE OR REPLACE VIEW active_categories_with_parents AS
SELECT 
  c.id,
  c.slug,
  c.name,
  c.description,
  c.image,
  c.product_count,
  c.sort_order,
  p.name as parent_name,
  p.slug as parent_slug
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id
WHERE c.is_active = true
ORDER BY c.sort_order, c.name;

-- Insert default categories if they don't exist
INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('electronics', 'Electronics', 'Latest gadgets, devices, and electronics', 1),
  ('fashion', 'Fashion', 'Clothing, shoes, and accessories', 2),
  ('home-garden', 'Home & Garden', 'Furniture, decor, and garden supplies', 3),
  ('beauty', 'Beauty', 'Cosmetics, skincare, and personal care', 4),
  ('sports', 'Sports', 'Sports equipment and outdoor gear', 5),
  ('automotive', 'Automotive', 'Car parts and accessories', 6),
  ('books', 'Books', 'Books, magazines, and educational materials', 7),
  ('toys', 'Toys', 'Toys and games for all ages', 8),
  ('grocery', 'Grocery', 'Food, beverages, and household essentials', 9),
  ('health', 'Health', 'Health products and supplements', 10)
ON CONFLICT (slug) DO NOTHING;
