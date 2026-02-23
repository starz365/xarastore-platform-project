-- collections Schema Migration
-- This creates production-grade tables, indexes, and constraints for collections

-- Create collection types enum
CREATE TYPE collection_type AS ENUM (
  'seasonal',
  'themed',
  'editorial',
  'trending',
  'featured',
  'new_arrivals',
  'best_sellers',
  'limited_time'
);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  banner_image TEXT,
  type collection_type NOT NULL DEFAULT 'themed',
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT collections_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT collections_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  CONSTRAINT collections_slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 50)
);

-- Create collection_products junction table
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_featured_in_collection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique product per collection
  UNIQUE(collection_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);
CREATE INDEX IF NOT EXISTS idx_collections_display_order ON collections(display_order);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_display_order ON collection_products(display_order);
CREATE INDEX IF NOT EXISTS idx_collection_products_featured ON collection_products(is_featured_in_collection) WHERE is_featured_in_collection = TRUE;

-- Create function to update collection product count
CREATE OR REPLACE FUNCTION update_collection_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET product_count = product_count + 1,
        updated_at = NOW()
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET product_count = product_count - 1,
        updated_at = NOW()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product count updates
DROP TRIGGER IF EXISTS collection_products_count_trigger ON collection_products;
CREATE TRIGGER collection_products_count_trigger
AFTER INSERT OR DELETE ON collection_products
FOR EACH ROW EXECUTE FUNCTION update_collection_product_count();

-- Create function to get active collections with proper filtering
CREATE OR REPLACE FUNCTION get_active_collections(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_type collection_type DEFAULT NULL,
  p_featured_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  image TEXT,
  banner_image TEXT,
  type collection_type,
  is_featured BOOLEAN,
  product_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.slug,
    c.name,
    c.description,
    c.image,
    c.banner_image,
    c.type,
    c.is_featured,
    c.product_count,
    c.created_at,
    c.updated_at
  FROM collections c
  WHERE c.is_active = TRUE
    AND (p_type IS NULL OR c.type = p_type)
    AND (NOT p_featured_only OR c.is_featured = TRUE)
    AND (c.start_date IS NULL OR c.start_date <= NOW())
    AND (c.end_date IS NULL OR c.end_date >= NOW())
  ORDER BY 
    c.display_order ASC,
    c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- Public read access to active collections
CREATE POLICY "Public can view active collections" 
ON collections FOR SELECT 
USING (is_active = TRUE);

-- Public read access to collection products
CREATE POLICY "Public can view collection products" 
ON collection_products FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM collections c 
  WHERE c.id = collection_products.collection_id 
  AND c.is_active = TRUE
));

-- Insert some initial collection types for reference
INSERT INTO collections (slug, name, description, image, type, is_featured, product_count) VALUES
('summer-essentials-2024', 'Summer Essentials 2024', 'Must-have items for the summer season', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136', 'seasonal', TRUE, 24),
('tech-gadgets', 'Latest Tech Gadgets', 'Cutting-edge technology and innovative gadgets', 'https://images.unsplash.com/photo-1498049794561-7780e7231661', 'trending', TRUE, 18),
('home-office-setup', 'Home Office Setup', 'Everything you need for a productive home office', 'https://images.unsplash.com/photo-1585637071663-799845ad5212', 'themed', FALSE, 15),
('fitness-gear', 'Fitness & Workout Gear', 'Equipment and apparel for your fitness journey', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b', 'themed', FALSE, 22),
('kitchen-essentials', 'Kitchen Essentials', 'Must-have items for every modern kitchen', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136', 'editorial', TRUE, 20),
('weekend-getaway', 'Weekend Getaway Pack', 'Travel essentials for short trips and adventures', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828', 'seasonal', FALSE, 12)
ON CONFLICT (slug) DO NOTHING;

-- Update sequences if needed
SELECT setval('collections_id_seq', COALESCE((SELECT MAX(id) FROM collections), 1));
