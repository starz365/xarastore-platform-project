-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  website TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  cost_price DECIMAL(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  sku TEXT NOT NULL UNIQUE,
  upc TEXT,
  ean TEXT,
  mpn TEXT,
  brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id),
  images TEXT[] DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
  purchase_count INTEGER DEFAULT 0 CHECK (purchase_count >= 0),
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  min_order_quantity INTEGER DEFAULT 1 CHECK (min_order_quantity >= 1),
  max_order_quantity INTEGER CHECK (max_order_quantity IS NULL OR max_order_quantity >= 1),
  weight DECIMAL(10,2) CHECK (weight IS NULL OR weight >= 0),
  dimensions JSONB,
  is_featured BOOLEAN DEFAULT false,
  is_deal BOOLEAN DEFAULT false,
  deal_ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_virtual BOOLEAN DEFAULT false,
  is_digital BOOLEAN DEFAULT false,
  requires_shipping BOOLEAN DEFAULT true,
  tax_class TEXT DEFAULT 'standard',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT original_price_check CHECK (original_price IS NULL OR original_price > price)
);

-- Create product variants table
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  cost_price DECIMAL(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  weight DECIMAL(10,2) CHECK (weight IS NULL OR weight >= 0),
  dimensions JSONB,
  attributes JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT variant_original_price_check CHECK (original_price IS NULL OR original_price > price)
);

-- Create product attributes table
CREATE TABLE product_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'color', 'size')),
  values JSONB DEFAULT '[]',
  is_filterable BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product attribute values junction table
CREATE TABLE product_attribute_values (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (product_id, attribute_id)
);

-- Create indexes for performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_is_deal ON products(is_deal) WHERE is_deal = true;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_published_at ON products(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active) WHERE is_active = true;

CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active) WHERE is_active = true;
CREATE INDEX idx_brands_is_featured ON brands(is_featured) WHERE is_featured = true;

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- Create trigram indexes for search
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING GIN (sku gin_trgm_ops);

-- Create full-text search index
CREATE INDEX idx_products_search ON products 
USING GIN ((
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(sku, '')), 'C')
));

-- Create function to update product_count in categories
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.category_id IS DISTINCT FROM NEW.category_id)) THEN
    -- Update old category count
    IF OLD.category_id IS NOT NULL THEN
      UPDATE categories 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE category_id = OLD.category_id 
        AND is_active = true
      )
      WHERE id = OLD.category_id;
    END IF;
    
    -- Update new category count
    IF NEW.category_id IS NOT NULL THEN
      UPDATE categories 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE category_id = NEW.category_id 
        AND is_active = true
      )
      WHERE id = NEW.category_id;
    END IF;
  END IF;
  
  -- Handle deletions
  IF TG_OP = 'DELETE' THEN
    UPDATE categories 
    SET product_count = (
      SELECT COUNT(*) 
      FROM products 
      WHERE category_id = OLD.category_id 
      AND is_active = true
    )
    WHERE id = OLD.category_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product count updates
CREATE TRIGGER update_category_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_category_product_count();

-- Create function to update brand product_count
CREATE OR REPLACE FUNCTION update_brand_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.brand_id IS DISTINCT FROM NEW.brand_id)) THEN
    -- Update old brand count
    IF OLD.brand_id IS NOT NULL THEN
      UPDATE brands 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE brand_id = OLD.brand_id 
        AND is_active = true
      )
      WHERE id = OLD.brand_id;
    END IF;
    
    -- Update new brand count
    IF NEW.brand_id IS NOT NULL THEN
      UPDATE brands 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE brand_id = NEW.brand_id 
        AND is_active = true
      )
      WHERE id = NEW.brand_id;
    END IF;
  END IF;
  
  -- Handle deletions
  IF TG_OP = 'DELETE' THEN
    UPDATE brands 
    SET product_count = (
      SELECT COUNT(*) 
      FROM products 
      WHERE brand_id = OLD.brand_id 
      AND is_active = true
    )
    WHERE id = OLD.brand_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for brand product count updates
CREATE TRIGGER update_brand_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_brand_product_count();

-- Create function to update product ratings
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_approved = true
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND is_approved = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Create function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_view(product_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment product purchase count
CREATE OR REPLACE FUNCTION increment_product_purchase(product_uuid UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET purchase_count = purchase_count + quantity,
      stock = stock - quantity,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to search products
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT NULL,
  category_ids UUID[] DEFAULT NULL,
  brand_ids UUID[] DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  min_rating DECIMAL DEFAULT NULL,
  in_stock_only BOOLEAN DEFAULT false,
  featured_only BOOLEAN DEFAULT false,
  deal_only BOOLEAN DEFAULT false,
  sort_by TEXT DEFAULT 'created_at_desc',
  page INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL,
  original_price DECIMAL,
  images TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  stock INTEGER,
  brand_name TEXT,
  category_name TEXT,
  is_featured BOOLEAN,
  is_deal BOOLEAN,
  deal_ends_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page - 1) * page_size;
  
  RETURN QUERY
  WITH filtered_products AS (
    SELECT 
      p.id,
      p.slug,
      p.name,
      p.description,
      p.price,
      p.original_price,
      p.images,
      p.rating,
      p.review_count,
      p.stock,
      b.name as brand_name,
      c.name as category_name,
      p.is_featured,
      p.is_deal,
      p.deal_ends_at,
      COUNT(*) OVER() as total_count
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
      AND (search_term IS NULL OR 
           p.name ILIKE '%' || search_term || '%' OR
           p.description ILIKE '%' || search_term || '%' OR
           p.sku ILIKE '%' || search_term || '%')
      AND (category_ids IS NULL OR p.category_id = ANY(category_ids))
      AND (brand_ids IS NULL OR p.brand_id = ANY(brand_ids))
      AND (min_price IS NULL OR p.price >= min_price)
      AND (max_price IS NULL OR p.price <= max_price)
      AND (min_rating IS NULL OR p.rating >= min_rating)
      AND (NOT in_stock_only OR p.stock > 0)
      AND (NOT featured_only OR p.is_featured = true)
      AND (NOT deal_only OR p.is_deal = true)
  )
  SELECT *
  FROM filtered_products
  ORDER BY
    CASE sort_by
      WHEN 'price_asc' THEN price
      WHEN 'price_desc' THEN price DESC
      WHEN 'name_asc' THEN name
      WHEN 'name_desc' THEN name DESC
      WHEN 'rating_desc' THEN rating DESC
      WHEN 'newest' THEN created_at DESC
      WHEN 'featured' THEN is_featured DESC, created_at DESC
      ELSE created_at DESC
    END
  LIMIT page_size
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Create function to get price ranges
CREATE OR REPLACE FUNCTION get_price_ranges()
RETURNS TABLE (
  range_label TEXT,
  min_price DECIMAL,
  max_price DECIMAL,
  product_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN price < 1000 THEN 'Under KES 1,000'
      WHEN price < 5000 THEN 'KES 1,000 - 5,000'
      WHEN price < 10000 THEN 'KES 5,000 - 10,000'
      WHEN price < 50000 THEN 'KES 10,000 - 50,000'
      ELSE 'Over KES 50,000'
    END as range_label,
    CASE 
      WHEN price < 1000 THEN 0
      WHEN price < 5000 THEN 1000
      WHEN price < 10000 THEN 5000
      WHEN price < 50000 THEN 10000
      ELSE 50000
    END as min_price,
    CASE 
      WHEN price < 1000 THEN 1000
      WHEN price < 5000 THEN 5000
      WHEN price < 10000 THEN 10000
      WHEN price < 50000 THEN 50000
      ELSE NULL
    END as max_price,
    COUNT(*) as product_count
  FROM products
  WHERE is_active = true
  GROUP BY 1, 2, 3
  ORDER BY min_price NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view active products" 
ON products FOR SELECT 
USING (is_active = true);

CREATE POLICY "Public can view active categories" 
ON categories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Public can view active brands" 
ON brands FOR SELECT 
USING (is_active = true);

CREATE POLICY "Public can view product variants" 
ON product_variants FOR SELECT 
USING (true);

CREATE POLICY "Public can view product attributes" 
ON product_attributes FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Public can view product attribute values" 
ON product_attribute_values FOR SELECT 
USING (true);

-- Insert/Update/Delete policies for admins (will be added in admin schema)
-- These ensure only admins can modify data

-- Create admin user role
CREATE ROLE admin_user WITH NOLOGIN;
GRANT admin_user TO authenticated;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_attributes_updated_at
BEFORE UPDATE ON product_attributes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
