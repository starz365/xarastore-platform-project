-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- Public can view active collections
CREATE POLICY "Public can view active collections" 
ON collections FOR SELECT 
USING (is_active = true);

-- Public can view collection products
CREATE POLICY "Public can view collection products" 
ON collection_products FOR SELECT 
USING (true);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  product_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  type TEXT DEFAULT 'general',
  view_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_products junction table
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- Indexes for performance
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_featured ON collections(is_featured) WHERE is_featured = true;
CREATE INDEX idx_collections_trending ON collections(is_trending) WHERE is_trending = true;
CREATE INDEX idx_collections_type ON collections(type);
CREATE INDEX idx_collections_active ON collections(is_active) WHERE is_active = true;
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);
CREATE INDEX idx_collections_updated ON collections(updated_at DESC);

-- Function to update collection product count
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

-- Trigger for collection product count
CREATE TRIGGER update_collection_product_count_trigger
AFTER INSERT OR DELETE ON collection_products
FOR EACH ROW EXECUTE FUNCTION update_collection_product_count();

-- Function to search collections
CREATE OR REPLACE FUNCTION search_collections(
  search_term TEXT,
  collection_type TEXT DEFAULT NULL,
  featured_only BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  image TEXT,
  product_count INTEGER,
  is_featured BOOLEAN,
  is_trending BOOLEAN,
  type TEXT,
  view_count INTEGER,
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
    c.product_count,
    c.is_featured,
    c.is_trending,
    c.type,
    c.view_count,
    c.created_at,
    c.updated_at
  FROM collections c
  WHERE c.is_active = true
    AND (search_term IS NULL OR 
         c.name ILIKE '%' || search_term || '%' OR 
         c.description ILIKE '%' || search_term || '%')
    AND (collection_type IS NULL OR c.type = collection_type)
    AND (NOT featured_only OR c.is_featured = true)
  ORDER BY 
    CASE 
      WHEN c.is_featured = true THEN 1
      WHEN c.is_trending = true THEN 2
      ELSE 3
    END,
    c.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
