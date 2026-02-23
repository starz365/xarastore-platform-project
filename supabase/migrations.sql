-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection Products Junction Table
CREATE TABLE IF NOT EXISTS collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- Brand verification status
ALTER TABLE brands ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Collection metadata
ALTER TABLE collections ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

-- Enable Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Brands
CREATE POLICY "Brands are viewable by everyone" 
    ON brands FOR SELECT 
    USING (is_active = TRUE);

CREATE POLICY "Only admins can modify brands" 
    ON brands FOR ALL 
    USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'editor')
    ));

-- RLS Policies for Collections
CREATE POLICY "Collections are viewable by everyone" 
    ON collections FOR SELECT 
    USING (is_active = TRUE);

CREATE POLICY "Only admins can modify collections" 
    ON collections FOR ALL 
    USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'editor')
    ));

-- RLS Policies for Collection Products
CREATE POLICY "Collection products are viewable by everyone" 
    ON collection_products FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM collections 
        WHERE id = collection_products.collection_id 
        AND is_active = TRUE
    ));

CREATE POLICY "Only admins can modify collection products" 
    ON collection_products FOR ALL 
    USING (auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'editor')
    ));

-- Indexes for performance
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_featured ON brands(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_brands_active ON brands(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_brands_product_count ON brands(product_count DESC);

CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_featured ON collections(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_collections_active ON collections(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_collections_type ON collections(type);

CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);
CREATE INDEX idx_collection_products_position ON collection_products(position);

-- Function to update brand product count
CREATE OR REPLACE FUNCTION update_brand_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE brands 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE brand_id = NEW.brand_id 
            AND stock > 0
        ),
        updated_at = NOW()
        WHERE id = NEW.brand_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE brands 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE brand_id = OLD.brand_id 
            AND stock > 0
        ),
        updated_at = NOW()
        WHERE id = OLD.brand_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for product changes affecting brand counts
CREATE TRIGGER update_brand_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_brand_product_count();

-- Function to update collection product count
CREATE OR REPLACE FUNCTION update_collection_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections 
        SET updated_at = NOW()
        WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections 
        SET updated_at = NOW()
        WHERE id = OLD.collection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for collection product changes
CREATE TRIGGER update_collection_product_count_trigger
AFTER INSERT OR DELETE ON collection_products
FOR EACH ROW EXECUTE FUNCTION update_collection_product_count();

-- Function to search brands
CREATE OR REPLACE FUNCTION search_brands(search_term VARCHAR)
RETURNS TABLE (
    id UUID,
    slug VARCHAR,
    name VARCHAR,
    description TEXT,
    logo TEXT,
    product_count INTEGER,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.slug,
        b.name,
        b.description,
        b.logo,
        b.product_count,
        GREATEST(
            CASE WHEN b.name ILIKE '%' || search_term || '%' THEN 1.0 ELSE 0 END,
            CASE WHEN b.description ILIKE '%' || search_term || '%' THEN 0.5 ELSE 0 END
        ) AS relevance
    FROM brands b
    WHERE b.is_active = TRUE
    AND (
        b.name ILIKE '%' || search_term || '%'
        OR b.description ILIKE '%' || search_term || '%'
    )
    ORDER BY relevance DESC, b.product_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get brand statistics
CREATE OR REPLACE FUNCTION get_brand_statistics(brand_id UUID)
RETURNS TABLE (
    total_products INTEGER,
    avg_rating NUMERIC(3,2),
    total_reviews INTEGER,
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id)::INTEGER AS total_products,
        COALESCE(AVG(p.rating), 0)::NUMERIC(3,2) AS avg_rating,
        COALESCE(SUM(p.review_count), 0)::INTEGER AS total_reviews,
        COALESCE(MIN(p.price), 0)::NUMERIC(10,2) AS min_price,
        COALESCE(MAX(p.price), 0)::NUMERIC(10,2) AS max_price
    FROM products p
    WHERE p.brand_id = brand_id
    AND p.stock > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get collection statistics
CREATE OR REPLACE FUNCTION get_collection_statistics(collection_id UUID)
RETURNS TABLE (
    total_products INTEGER,
    avg_price NUMERIC(10,2),
    avg_rating NUMERIC(3,2),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id)::INTEGER AS total_products,
        COALESCE(AVG(p.price), 0)::NUMERIC(10,2) AS avg_price,
        COALESCE(AVG(p.rating), 0)::NUMERIC(3,2) AS avg_rating,
        COALESCE(MIN(p.price), 0)::NUMERIC(10,2) AS min_price,
        COALESCE(MAX(p.price), 0)::NUMERIC(10,2) AS max_price
    FROM collection_products cp
    JOIN products p ON cp.product_id = p.id
    WHERE cp.collection_id = collection_id
    AND p.stock > 0;
END;
$$ LANGUAGE plpgsql;

-- View for featured collections with product count
CREATE OR REPLACE VIEW featured_collections_view AS
SELECT 
    c.*,
    COUNT(cp.id) AS product_count,
    ARRAY_AGG(DISTINCT p.brand_id) AS brand_ids
FROM collections c
LEFT JOIN collection_products cp ON c.id = cp.collection_id
LEFT JOIN products p ON cp.product_id = p.id
WHERE c.is_featured = TRUE
AND c.is_active = TRUE
AND (p.id IS NULL OR p.stock > 0)
GROUP BY c.id;

-- Materialized view for brand performance (refresh daily)
CREATE MATERIALIZED VIEW brand_performance AS
SELECT 
    b.id,
    b.name,
    b.slug,
    COUNT(DISTINCT p.id) AS total_products,
    COUNT(DISTINCT r.id) AS total_reviews,
    COALESCE(AVG(p.rating), 0) AS avg_rating,
    COALESCE(SUM(oi.quantity), 0) AS total_sold,
    COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue,
    MAX(o.created_at) AS last_sale_date
FROM brands b
LEFT JOIN products p ON b.id = p.brand_id
LEFT JOIN reviews r ON p.id = r.product_id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE b.is_active = TRUE
AND (o.id IS NULL OR o.status IN ('delivered', 'shipped'))
GROUP BY b.id
WITH DATA;

CREATE UNIQUE INDEX idx_brand_performance_id ON brand_performance(id);
CREATE INDEX idx_brand_performance_revenue ON brand_performance(total_revenue DESC);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY brand_performance;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to refresh views (runs daily at 3 AM)
SELECT cron.schedule(
    'refresh-brand-performance',
    '0 3 * * *',
    'SELECT refresh_materialized_views();'
);

-- Insert sample brands (for development)
INSERT INTO brands (slug, name, description, logo, is_featured, product_count) VALUES
('apple', 'Apple', 'Innovative technology company creating premium devices', 'https://cdn.xarastore.com/brands/apple.png', TRUE, 45),
('samsung', 'Samsung', 'Global leader in electronics and home appliances', 'https://cdn.xarastore.com/brands/samsung.png', TRUE, 38),
('nike', 'Nike', 'World leader in athletic footwear and apparel', 'https://cdn.xarastore.com/brands/nike.png', TRUE, 62),
('adidas', 'Adidas', 'Sports apparel and footwear manufacturer', 'https://cdn.xarastore.com/brands/adidas.png', TRUE, 54),
('sony', 'Sony', 'Japanese multinational conglomerate', 'https://cdn.xarastore.com/brands/sony.png', TRUE, 29),
('lg', 'LG', 'South Korean electronics company', 'https://cdn.xarastore.com/brands/lg.png', TRUE, 32)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    logo = EXCLUDED.logo,
    is_featured = EXCLUDED.is_featured;

-- Insert sample collections
INSERT INTO collections (slug, name, description, image, is_featured) VALUES
('summer-essentials', 'Summer Essentials', 'Everything you need for the perfect summer', 'https://cdn.xarastore.com/collections/summer.jpg', TRUE),
('work-from-home', 'Work From Home Setup', 'Create the perfect home office', 'https://cdn.xarastore.com/collections/wfh.jpg', TRUE),
('kitchen-upgrade', 'Kitchen Upgrade', 'Modern kitchen appliances and tools', 'https://cdn.xarastore.com/collections/kitchen.jpg', TRUE),
('fitness-gear', 'Fitness Gear', 'Equipment for your home workouts', 'https://cdn.xarastore.com/collections/fitness.jpg', FALSE),
('gaming-setup', 'Gaming Setup', 'Complete gaming station', 'https://cdn.xarastore.com/collections/gaming.jpg', FALSE),
('outdoor-adventure', 'Outdoor Adventure', 'Gear for your next adventure', 'https://cdn.xarastore.com/collections/outdoor.jpg', FALSE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    is_featured = EXCLUDED.is_featured;
