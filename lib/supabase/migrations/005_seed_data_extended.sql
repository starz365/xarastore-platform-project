BEGIN;

-- ============================================================================
-- 1. PRE-SEED VALIDATION & TABLE SETUP
-- ============================================================================

DO $$ 
BEGIN
    -- Verify required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
        CREATE TABLE site_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            currency VARCHAR(3) NOT NULL DEFAULT 'KES',
            vat_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00,
            free_shipping_threshold INTEGER NOT NULL DEFAULT 2000,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
        CREATE TABLE categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            parent_id UUID REFERENCES categories(id),
            image_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
        CREATE INDEX idx_categories_slug ON categories(slug);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        CREATE TABLE brands (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            logo_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_brands_slug ON brands(slug);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(500) NOT NULL,
            slug VARCHAR(500) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            short_description VARCHAR(1000),
            brand_id UUID REFERENCES brands(id) NOT NULL,
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft', 'archived')),
            is_published BOOLEAN DEFAULT TRUE,
            is_featured BOOLEAN DEFAULT FALSE,
            is_deal BOOLEAN DEFAULT FALSE,
            deal_end_date TIMESTAMPTZ,
            meta_title VARCHAR(500),
            meta_description TEXT,
            search_keywords TEXT[],
            weight_kg DECIMAL(10,2),
            dimensions_cm JSONB,
            rating DECIMAL(3,2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            view_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_products_slug ON products(slug);
        CREATE INDEX idx_products_brand ON products(brand_id);
        CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
        CREATE INDEX idx_products_published ON products(is_published) WHERE is_published = TRUE;
        CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
        CREATE INDEX idx_products_deal ON products(is_deal) WHERE is_deal = TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants') THEN
        CREATE TABLE product_variants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
            sku VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(100),
            size VARCHAR(50),
            material VARCHAR(100),
            attributes JSONB DEFAULT '{}',
            barcode VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, name)
        );
        CREATE INDEX idx_variants_product ON product_variants(product_id);
        CREATE INDEX idx_variants_sku ON product_variants(sku);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images') THEN
        CREATE TABLE product_images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
            variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            alt_text VARCHAR(500),
            display_order INTEGER DEFAULT 0,
            is_primary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_images_product ON product_images(product_id);
        CREATE INDEX idx_images_variant ON product_images(variant_id);
        CREATE INDEX idx_images_order ON product_images(product_id, display_order);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        CREATE TABLE product_categories (
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
            is_primary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (product_id, category_id)
        );
        CREATE INDEX idx_product_cats_product ON product_categories(product_id);
        CREATE INDEX idx_product_cats_category ON product_categories(category_id);
    END IF;

	-- ============================================
	-- 1. Create pricing table if it doesn't exist
	-- ============================================
	CREATE TABLE IF NOT EXISTS pricing (
	    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
	    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
	    base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
	    sale_price DECIMAL(12,2) CHECK (sale_price >= 0),
	    currency VARCHAR(3) DEFAULT 'KES',
	    vat_inclusive BOOLEAN DEFAULT TRUE,
	    vat_rate DECIMAL(5,2) DEFAULT 16.00,
	    cost_price DECIMAL(12,2),
	    price_valid_from TIMESTAMPTZ DEFAULT NOW(),
	    price_valid_to TIMESTAMPTZ,
	    created_at TIMESTAMPTZ DEFAULT NOW(),
	    updated_at TIMESTAMPTZ DEFAULT NOW(),
	    -- Ensure sale_price is <= base_price
	    CONSTRAINT valid_price_range CHECK (sale_price IS NULL OR sale_price <= base_price),
	    -- Column to track active prices
	    is_active BOOLEAN DEFAULT TRUE
	);

	-- ============================================
	-- 2. Indexes
	-- ============================================
	CREATE INDEX IF NOT EXISTS idx_pricing_product ON pricing(product_id);
	CREATE INDEX IF NOT EXISTS idx_pricing_variant ON pricing(variant_id);
	CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(product_id)
	WHERE is_active = TRUE;

	-- ============================================
	-- 3. Trigger function to update is_active
	-- ============================================
	CREATE OR REPLACE FUNCTION update_pricing_is_active()
	RETURNS TRIGGER AS $$
	BEGIN
	    NEW.is_active := (NEW.price_valid_to IS NULL OR NEW.price_valid_to > NOW());
	    RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;

	-- ============================================
	-- 4. Trigger to call the function before insert or update
	-- ============================================
	DROP TRIGGER IF EXISTS trg_pricing_is_active ON pricing;

	CREATE TRIGGER trg_pricing_is_active
	BEFORE INSERT OR UPDATE ON pricing
	FOR EACH ROW
	EXECUTE FUNCTION update_pricing_is_active();




    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
        CREATE TABLE inventory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
            available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
            low_stock_threshold INTEGER DEFAULT 10,
            warehouse_location VARCHAR(100),
            last_restocked TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, variant_id)
        );
        CREATE INDEX idx_inventory_product ON inventory(product_id);
        CREATE INDEX idx_inventory_variant ON inventory(variant_id);
        CREATE INDEX idx_inventory_available ON inventory(product_id, variant_id) 
            WHERE available_quantity > 0;
    END IF;

    -- Enable Row Level Security if not already enabled
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
    ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for public read access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public can view active products') THEN
        CREATE POLICY "Public can view active products" ON products
            FOR SELECT USING (status = 'active' AND is_published = TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'Public can view product variants') THEN
        CREATE POLICY "Public can view product variants" ON product_variants
            FOR SELECT USING (EXISTS (
                SELECT 1 FROM products p 
                WHERE p.id = product_variants.product_id 
                AND p.status = 'active' 
                AND p.is_published = TRUE
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'Public can view product images') THEN
        CREATE POLICY "Public can view product images" ON product_images
            FOR SELECT USING (EXISTS (
                SELECT 1 FROM products p 
                WHERE p.id = product_images.product_id 
                AND p.status = 'active' 
                AND p.is_published = TRUE
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Public can view active categories') THEN
        CREATE POLICY "Public can view active categories" ON categories
            FOR SELECT USING (is_active = TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'Public can view active brands') THEN
        CREATE POLICY "Public can view active brands" ON brands
            FOR SELECT USING (is_active = TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Public can view product categories') THEN
        CREATE POLICY "Public can view product categories" ON product_categories
            FOR SELECT USING (EXISTS (
                SELECT 1 FROM products p 
                WHERE p.id = product_categories.product_id 
                AND p.status = 'active' 
                AND p.is_published = TRUE
            ) AND EXISTS (
                SELECT 1 FROM categories c 
                WHERE c.id = product_categories.category_id 
                AND c.is_active = TRUE
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricing' AND policyname = 'Public can view active pricing') THEN
        CREATE POLICY "Public can view active pricing" ON pricing
            FOR SELECT USING (
                (price_valid_to IS NULL OR price_valid_to > NOW())
                AND EXISTS (
                    SELECT 1 FROM products p 
                    WHERE p.id = pricing.product_id 
                    AND p.status = 'active' 
                    AND p.is_published = TRUE
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Public can view inventory with stock') THEN
        CREATE POLICY "Public can view inventory with stock" ON inventory
            FOR SELECT USING (
                available_quantity > 0
                AND EXISTS (
                    SELECT 1 FROM products p 
                    WHERE p.id = inventory.product_id 
                    AND p.status = 'active' 
                    AND p.is_published = TRUE
                )
            );
    END IF;

    -- Ensure site_settings has exactly one row
    IF (SELECT COUNT(*) FROM site_settings) = 0 THEN
        INSERT INTO site_settings (currency, vat_rate, free_shipping_threshold)
        VALUES ('KES', 16.00, 2000);
    END IF;
END $$;

-- ============================================================================
-- 2. INSERT BRANDS (with conflict handling)
-- ============================================================================

INSERT INTO brands (id, name, slug, description, logo_url, is_active) VALUES
-- Electronics Brands
('b1e5a7d0-3c8f-4b5e-9a2d-6c3f9b8e1a4d', 'Samsung', 'samsung', 'Global leader in electronics and appliances', 'https://storage.googleapis.com/xarastore-brands/samsung-logo.png', TRUE),
('c2f6b8e1-4d9g-5c6f-0b3e-7d4a0c9f2b5e', 'Apple', 'apple', 'Premium technology and innovation', 'https://storage.googleapis.com/xarastore-brands/apple-logo.png', TRUE),
('d3a7c9f2-5e0h-6d7g-1c4f-8e5b1d0a3c6f', 'LG', 'lg', 'Innovative home appliances and electronics', 'https://storage.googleapis.com/xarastore-brands/lg-logo.png', TRUE),
('e4b8d0a3-6f1i-7e8h-2d5g-9f6c2e1b4d7g', 'Sony', 'sony', 'Premium audio, video, and gaming electronics', 'https://storage.googleapis.com/xarastore-brands/sony-logo.png', TRUE),
('f5c9e1b4-7g2j-8f9i-3e6h-0g7d3f2c5e8h', 'HP', 'hp', 'Computers, printers, and accessories', 'https://storage.googleapis.com/xarastore-brands/hp-logo.png', TRUE),
('a6d0f2c5-8h3k-9g0j-4f7i-1h8e4g3d6f9i', 'Dell', 'dell', 'Business and consumer computing solutions', 'https://storage.googleapis.com/xarastore-brands/dell-logo.png', TRUE),

-- Home & Living Brands
('b7e1g3d6-9i4l-0h1k-5g8j-2i9f5h4e7g0j', 'Bosch', 'bosch', 'Premium German home appliances', 'https://storage.googleapis.com/xarastore-brands/bosch-logo.png', TRUE),
('c8f2h4e7-0j5m-1i2l-6h9k-3j0g6i5f8h1k', 'Samsung Home', 'samsung-home', 'Smart home appliances and solutions', 'https://storage.googleapis.com/xarastore-brands/samsung-home-logo.png', TRUE),
('d9g3i5f8-1k6n-2j3m-7i0l-4k1h7j6g9i2l', 'LG Home', 'lg-home', 'Innovative home and kitchen appliances', 'https://storage.googleapis.com/xarastore-brands/lg-home-logo.png', TRUE),

-- Fashion Brands
('e0h4j6g9-2l7o-3k4n-8j1m-5l2i8k7h0j3m', 'Adidas', 'adidas', 'Sportswear and athletic footwear', 'https://storage.googleapis.com/xarastore-brands/adidas-logo.png', TRUE),
('f1i5k7h0-3m8p-4l5o-9k2n-6m3j9l8i1k4n', 'Nike', 'nike', 'Athletic shoes, apparel, and equipment', 'https://storage.googleapis.com/xarastore-brands/nike-logo.png', TRUE),
('a2j6l8i1-4n9q-5m6p-0l3o-7n4k0m9j2l5o', 'Levi''s', 'levis', 'Denim jeans and casual wear', 'https://storage.googleapis.com/xarastore-brands/levis-logo.png', TRUE),
('b3k7m9j2-5o0r-6n7q-1m4p-8o5l1n0k3m6p', 'Zara', 'zara', 'Fast fashion and contemporary clothing', 'https://storage.googleapis.com/xarastore-brands/zara-logo.png', TRUE),

-- Furniture Brands
('c4l8n0k3-6p1s-7o8r-2n5q-9p6m2o1l4n7q', 'Ikea', 'ikea', 'Affordable modern furniture and home accessories', 'https://storage.googleapis.com/xarastore-brands/ikea-logo.png', TRUE),
('d5m9o1l4-7q2t-8p9s-3o6r-0q7n3p2m5o8r', 'Ashley Furniture', 'ashley-furniture', 'Quality home furniture and decor', 'https://storage.googleapis.com/xarastore-brands/ashley-furniture-logo.png', TRUE),

-- Baby & Kids Brands
('e6n0p2m5-8r3u-9q0t-4p7s-1r8o4q3n6p9s', 'Pampers', 'pampers', 'Baby care products and diapers', 'https://storage.googleapis.com/xarastore-brands/pampers-logo.png', TRUE),
('f7o1q3n6-9s4v-0r1u-5q8t-2s9p5r4o7q0t', 'Fisher-Price', 'fisher-price', 'Educational toys for children', 'https://storage.googleapis.com/xarastore-brands/fisher-price-logo.png', TRUE),

-- Beauty & Personal Care
('a8p2r4o7-0t5w-1s2v-6r9u-3t0q6s5p8r1u', 'L''Oréal', 'loreal', 'Cosmetics, hair care, and skincare', 'https://storage.googleapis.com/xarastore-brands/loreal-logo.png', TRUE),
('b9q3s5p8-1u6x-2t3w-7s0v-4u1r7t6q9s2v', 'Nivea', 'nivea', 'Skin and body care products', 'https://storage.googleapis.com/xarastore-brands/nivea-logo.png', TRUE),

-- Luxury Brands
('c0r4t6q9-2v7y-3u4x-8t1w-5v2s8u7r0t3w', 'Rolex', 'rolex', 'Swiss luxury watches and accessories', 'https://storage.googleapis.com/xarastore-brands/rolex-logo.png', TRUE),
('d1s5u7r0-3w8z-4v5y-9u2x-6w3t9v8s1u4x', 'Gucci', 'gucci', 'Italian luxury fashion house', 'https://storage.googleapis.com/xarastore-brands/gucci-logo.png', TRUE)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- 3. INSERT CATEGORIES (hierarchical structure)
-- ============================================================================

WITH category_data AS (
    SELECT * FROM (VALUES
        -- Level 1 Categories
        ('Electronics', 'electronics', 'Latest gadgets, devices, and electronics', NULL, 'https://storage.googleapis.com/xarastore-categories/electronics.jpg', 1),
        ('Fashion', 'fashion', 'Clothing, footwear, and accessories for all', NULL, 'https://storage.googleapis.com/xarastore-categories/fashion.jpg', 2),
        ('Home & Living', 'home-living', 'Furniture, decor, and home essentials', NULL, 'https://storage.googleapis.com/xarastore-categories/home-living.jpg', 3),
        ('Beauty & Personal Care', 'beauty-personal-care', 'Cosmetics, skincare, and grooming', NULL, 'https://storage.googleapis.com/xarastore-categories/beauty.jpg', 4),
        ('Baby & Kids', 'baby-kids', 'Products for babies and children', NULL, 'https://storage.googleapis.com/xarastore-categories/baby-kids.jpg', 5),
        ('Sports & Outdoors', 'sports-outdoors', 'Sporting goods and outdoor equipment', NULL, 'https://storage.googleapis.com/xarastore-categories/sports.jpg', 6),
        ('Automotive', 'automotive', 'Car accessories and maintenance', NULL, 'https://storage.googleapis.com/xarastore-categories/automotive.jpg', 7),
        ('Travel & Luggage', 'travel-luggage', 'Travel gear and luggage', NULL, 'https://storage.googleapis.com/xarastore-categories/travel.jpg', 8),
        ('Luxury', 'luxury', 'Premium and luxury products', NULL, 'https://storage.googleapis.com/xarastore-categories/luxury.jpg', 9),
        
        -- Electronics Subcategories
        ('Smartphones', 'smartphones', 'Latest mobile phones and smartphones', 'electronics', 'https://storage.googleapis.com/xarastore-categories/smartphones.jpg', 1),
        ('Laptops & Computers', 'laptops-computers', 'Laptops, desktops, and computing devices', 'electronics', 'https://storage.googleapis.com/xarastore-categories/laptops.jpg', 2),
        ('Televisions', 'televisions', 'Smart TVs, OLED, and LED televisions', 'electronics', 'https://storage.googleapis.com/xarastore-categories/tvs.jpg', 3),
        ('Audio & Headphones', 'audio-headphones', 'Speakers, headphones, and audio systems', 'electronics', 'https://storage.googleapis.com/xarastore-categories/audio.jpg', 4),
        ('Cameras', 'cameras', 'DSLR, mirrorless, and action cameras', 'electronics', 'https://storage.googleapis.com/xarastore-categories/cameras.jpg', 5),
        ('Gaming', 'gaming', 'Gaming consoles, accessories, and games', 'electronics', 'https://storage.googleapis.com/xarastore-categories/gaming.jpg', 6),
        ('Wearables', 'wearables', 'Smart watches and fitness trackers', 'electronics', 'https://storage.googleapis.com/xarastore-categories/wearables.jpg', 7),
        ('Home Appliances', 'home-appliances', 'Kitchen and home appliances', 'electronics', 'https://storage.googleapis.com/xarastore-categories/home-appliances.jpg', 8),
        
        -- Fashion Subcategories
        ('Men''s Clothing', 'mens-clothing', 'Clothing for men', 'fashion', 'https://storage.googleapis.com/xarastore-categories/mens-clothing.jpg', 1),
        ('Women''s Clothing', 'womens-clothing', 'Clothing for women', 'fashion', 'https://storage.googleapis.com/xarastore-categories/womens-clothing.jpg', 2),
        ('Kids'' Clothing', 'kids-clothing', 'Clothing for children', 'fashion', 'https://storage.googleapis.com/xarastore-categories/kids-clothing.jpg', 3),
        ('Footwear', 'footwear', 'Shoes and footwear for all', 'fashion', 'https://storage.googleapis.com/xarastore-categories/footwear.jpg', 4),
        ('Accessories', 'accessories', 'Bags, watches, and fashion accessories', 'fashion', 'https://storage.googleapis.com/xarastore-categories/accessories.jpg', 5),
        ('Watches', 'watches', 'Wrist watches and timepieces', 'fashion', 'https://storage.googleapis.com/xarastore-categories/watches.jpg', 6),
        ('Jewelry', 'jewelry', 'Necklaces, rings, and bracelets', 'fashion', 'https://storage.googleapis.com/xarastore-categories/jewelry.jpg', 7),
        ('Bags & Luggage', 'bags-luggage', 'Handbags, backpacks, and travel bags', 'fashion', 'https://storage.googleapis.com/xarastore-categories/bags.jpg', 8),
        
        -- Home & Living Subcategories
        ('Furniture', 'furniture', 'Home and office furniture', 'home-living', 'https://storage.googleapis.com/xarastore-categories/furniture.jpg', 1),
        ('Kitchen & Dining', 'kitchen-dining', 'Kitchenware and dining sets', 'home-living', 'https://storage.googleapis.com/xarastore-categories/kitchen.jpg', 2),
        ('Bedding & Bath', 'bedding-bath', 'Bed sheets, towels, and bathroom accessories', 'home-living', 'https://storage.googleapis.com/xarastore-categories/bedding.jpg', 3),
        ('Home Decor', 'home-decor', 'Wall art, lighting, and home accents', 'home-living', 'https://storage.googleapis.com/xarastore-categories/decor.jpg', 4),
        ('Garden & Outdoor', 'garden-outdoor', 'Outdoor furniture and gardening tools', 'home-living', 'https://storage.googleapis.com/xarastore-categories/garden.jpg', 5),
        ('Storage & Organization', 'storage-organization', 'Storage solutions and organizers', 'home-living', 'https://storage.googleapis.com/xarastore-categories/storage.jpg', 6),
        
        -- Beauty Subcategories
        ('Skincare', 'skincare', 'Face creams, serums, and treatments', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/skincare.jpg', 1),
        ('Makeup', 'makeup', 'Cosmetics and beauty products', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/makeup.jpg', 2),
        ('Hair Care', 'hair-care', 'Shampoos, conditioners, and styling', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/hair-care.jpg', 3),
        ('Fragrances', 'fragrances', 'Perfumes and colognes', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/fragrances.jpg', 4),
        ('Personal Care', 'personal-care', 'Shaving, grooming, and hygiene', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/personal-care.jpg', 5),
        ('Bath & Body', 'bath-body', 'Body wash, lotions, and bath products', 'beauty-personal-care', 'https://storage.googleapis.com/xarastore-categories/bath-body.jpg', 6),
        
        -- Baby & Kids Subcategories
        ('Baby Clothing', 'baby-clothing', 'Clothing for infants and toddlers', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/baby-clothing.jpg', 1),
        ('Diapering', 'diapering', 'Diapers and changing essentials', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/diapering.jpg', 2),
        ('Nursery', 'nursery', 'Cribs, strollers, and nursery furniture', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/nursery.jpg', 3),
        ('Toys & Games', 'toys-games', 'Educational toys and games', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/toys.jpg', 4),
        ('Feeding', 'feeding', 'Bottles, formula, and feeding accessories', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/feeding.jpg', 5),
        ('Safety', 'safety', 'Baby monitors and safety gates', 'baby-kids', 'https://storage.googleapis.com/xarastore-categories/safety.jpg', 6),
        
        -- Luxury Subcategories
        ('Luxury Watches', 'luxury-watches', 'Premium Swiss and designer watches', 'luxury', 'https://storage.googleapis.com/xarastore-categories/luxury-watches.jpg', 1),
        ('Designer Handbags', 'designer-handbags', 'Luxury bags from top fashion houses', 'luxury', 'https://storage.googleapis.com/xarastore-categories/designer-bags.jpg', 2),
        ('Fine Jewelry', 'fine-jewelry', 'Diamonds, gold, and precious stones', 'luxury', 'https://storage.googleapis.com/xarastore-categories/fine-jewelry.jpg', 3),
        ('Luxury Fashion', 'luxury-fashion', 'High-end clothing and accessories', 'luxury', 'https://storage.googleapis.com/xarastore-categories/luxury-fashion.jpg', 4),
        ('Premium Electronics', 'premium-electronics', 'High-end gadgets and devices', 'luxury', 'https://storage.googleapis.com/xarastore-categories/premium-electronics.jpg', 5),
        
        -- Wardrobe Collections
        ('Office Wear', 'office-wear', 'Professional attire for work', 'fashion', 'https://storage.googleapis.com/xarastore-categories/office-wear.jpg', 9),
        ('Casual Wear', 'casual-wear', 'Everyday comfortable clothing', 'fashion', 'https://storage.googleapis.com/xarastore-categories/casual-wear.jpg', 10),
        ('Evening Wear', 'evening-wear', 'Formal and evening attire', 'fashion', 'https://storage.googleapis.com/xarastore-categories/evening-wear.jpg', 11),
        ('Sports Wear', 'sports-wear', 'Activewear and gym clothing', 'fashion', 'https://storage.googleapis.com/xarastore-categories/sports-wear.jpg', 12),
        ('Seasonal Collections', 'seasonal-collections', 'Season-specific fashion', 'fashion', 'https://storage.googleapis.com/xarastore-categories/seasonal.jpg', 13)
    ) AS t(name, slug, description, parent_slug, image_url, display_order)
)
INSERT INTO categories (id, name, slug, description, parent_id, image_url, is_active, display_order)
SELECT 
    gen_random_uuid(),
    cd.name,
    cd.slug,
    cd.description,
    p.id,
    cd.image_url,
    TRUE,
    cd.display_order
FROM category_data cd
LEFT JOIN categories p ON p.slug = cd.parent_slug
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = cd.slug)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id,
    image_url = EXCLUDED.image_url,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- ============================================================================
-- 4. INSERT PRODUCTS (real, commercially valid products with Kenyan pricing)
-- ============================================================================

-- First, insert all products
WITH product_data AS (
    SELECT * FROM (VALUES
        -- Electronics Category Products
        ('SAMSUNG-GALAXY-S24-ULTRA', 'Samsung Galaxy S24 Ultra 5G', 'samsung-galaxy-s24-ultra', 'Experience the pinnacle of smartphone technology with the Samsung Galaxy S24 Ultra. Featuring a 6.8-inch Dynamic AMOLED 2X display with 120Hz refresh rate, Snapdragon 8 Gen 3 processor, 12GB RAM, and 256GB storage. Quad camera system with 200MP main sensor, 10x optical zoom, and S Pen support.', 'Flagship smartphone with revolutionary AI features and camera capabilities', 'b1e5a7d0-3c8f-4b5e-9a2d-6c3f9b8e1a4d', TRUE, FALSE, NULL, 'Samsung Galaxy S24 Ultra | Xarastore Kenya', 'Premium smartphone with AI features, best camera phone in Kenya', ARRAY['samsung', 'galaxy', 'smartphone', '5g', 'kenya', 'nairobi']::TEXT[], 0.228, '{"height": "16.3", "width": "7.8", "depth": "0.88"}'),
        
        ('LG-OLED65C3', 'LG 65" C3 Series OLED evo 4K Smart TV', 'lg-65-c3-oled-tv', 'Immerse yourself in cinematic brilliance with the LG C3 OLED TV. Featuring self-lit pixels for perfect blacks, infinite contrast, and α9 AI Processor Gen6 for optimized picture and sound. Supports Dolby Vision, Dolby Atmos, and webOS smart platform with all major streaming apps.', 'Premium 65-inch OLED TV with AI processing and stunning picture quality', 'd3a7c9f2-5e0h-6d7g-1c4f-8e5b1d0a3c6f', TRUE, TRUE, NULL, 'LG OLED 65" TV | 4K Smart TV Kenya', 'Best OLED TV in Kenya, perfect for home entertainment', ARRAY['lg', 'oled', 'tv', '4k', 'smart', 'kenya', 'television']::TEXT[], 28.5, '{"height": "83.8", "width": "144.9", "depth": "4.1"}'),
        
        ('APPLE-MACBOOK-PRO-14', 'Apple MacBook Pro 14" M3 Pro Chip', 'apple-macbook-pro-14-m3', 'Power through professional workflows with the MacBook Pro 14" featuring the revolutionary M3 Pro chip. Liquid Retina XDR display, up to 18-core CPU, 14-core GPU, 18GB unified memory, and 512GB SSD. Perfect for creative professionals, developers, and power users in Kenya.', 'Professional laptop with Apple M3 Pro chip for ultimate performance', 'c2f6b8e1-4d9g-5c6f-0b3e-7d4a0c9f2b5e', TRUE, TRUE, NULL, 'Apple MacBook Pro 14" Kenya | M3 Pro Laptop', 'Professional laptop for creatives and developers in Nairobi', ARRAY['apple', 'macbook', 'laptop', 'm3', 'pro', 'kenya', 'nairobi']::TEXT[], 1.61, '{"height": "0.61", "width": "31.26", "depth": "22.12"}'),
        
        ('SONY-WH1000XM5', 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', 'sony-wh-1000xm5-headphones', 'Industry-leading noise cancellation with new Integrated Processor V1 and Dual Noise Sensor technology. 30-hour battery life, multipoint connection, and exceptional sound quality with LDAC support. Perfect for travel, work, or immersive listening in Kenya.', 'Premium wireless headphones with best-in-class noise cancellation', 'e4b8d0a3-6f1i-7e8h-2d5g-9f6c2e1b4d7g', TRUE, FALSE, NULL, 'Sony WH-1000XM5 Headphones Kenya | Noise Cancelling', 'Best noise cancelling headphones available in Kenya', ARRAY['sony', 'headphones', 'wireless', 'noise-cancelling', 'audio', 'kenya']::TEXT[], 0.25, '{"height": "21.5", "width": "16.5", "depth": "7.5"}'),
        
        -- Home Appliances
        ('BOSCH-WASHING-MACHINE', 'Bosch Series 6 Washing Machine 9kg', 'bosch-washing-machine-9kg', 'German-engineered washing machine with ActiveWater Plus technology saving up to 40% water. EcoSilence Drive motor, AntiVibration design, and i-DOS automatic dosing system. Perfect for Kenyan households with reliable performance and energy efficiency.', 'Front load washing machine with German engineering for Kenyan homes', 'b7e1g3d6-9i4l-0h1k-5g8j-2i9f5h4e7g0j', TRUE, TRUE, NULL, 'Bosch Washing Machine Kenya | 9kg Front Load', 'Energy efficient washing machine for Nairobi homes', ARRAY['bosch', 'washing-machine', 'home-appliances', 'kenya', 'nairobi']::TEXT[], 68.0, '{"height": "84.8", "width": "59.8", "depth": "59.0"}'),
        
        ('LG-FRIDGE-DOOR', 'LG InstaView Door-in-Door Refrigerator 613L', 'lg-refrigerator-instaview', 'Smart refrigerator with InstaView technology - knock twice to see inside without opening. Linear Cooling for optimal freshness, Door Cooling+ for even cooling, and SmartThinQ app control. Perfect for large Kenyan families with spacious 613L capacity.', 'Smart refrigerator with InstaView technology and spacious design', 'd9g3i5f8-1k6n-2j3m-7i0l-4k1h7j6g9i2l', TRUE, FALSE, NULL, 'LG Refrigerator Kenya | InstaView Door-in-Door', 'Large capacity smart fridge for Kenyan households', ARRAY['lg', 'refrigerator', 'fridge', 'smart', 'kenya', 'appliances']::TEXT[], 105.0, '{"height": "179.0", "width": "91.2", "depth": "73.7"}'),
        
        -- Fashion Products
        ('NIKE-AIR-JORDAN-1', 'Nike Air Jordan 1 Retro High OG', 'nike-air-jordan-1-retro', 'Iconic basketball sneakers reimagined for modern style. Premium leather construction, Air-Sole unit for cushioning, and classic high-top design. Available in multiple colorways. Perfect for sneaker enthusiasts and fashion-forward individuals in Kenya.', 'Iconic basketball sneakers with premium leather construction', 'f1i5k7h0-3m8p-4l5o-9k2n-6m3j9l8i1k4n', TRUE, TRUE, NULL, 'Nike Air Jordan 1 Kenya | Retro High OG Sneakers', 'Original Air Jordan 1 sneakers available in Nairobi', ARRAY['nike', 'jordan', 'sneakers', 'shoes', 'fashion', 'kenya']::TEXT[], 1.2, '{"height": "15", "width": "25", "depth": "10"}'),
        
        ('LEVIS-501-JEANS', 'Levi''s 501 Original Fit Jeans', 'levis-501-original-jeans', 'The original blue jeans since 1873. Straight leg, button fly, and signature leather patch. Made from durable denim that softens with wear. Available in multiple washes and sizes. Essential wardrobe piece for every Kenyan.', 'Classic straight leg jeans with original fit and button fly', 'a2j6l8i1-4n9q-5m6p-0l3o-7n4k0m9j2l5o', TRUE, FALSE, NULL, 'Levi''s 501 Jeans Kenya | Original Fit Denim', 'Original Levi''s 501 jeans available in various sizes', ARRAY['levis', 'jeans', 'denim', '501', 'fashion', 'kenya']::TEXT[], 0.5, '{"height": "3", "width": "30", "depth": "20"}'),
        
        -- Furniture Products
        ('IKEA-MALM-BED', 'IKEA MALM Bed Frame with Storage', 'ikea-malm-bed-frame', 'Modern bed frame with generous storage options. High-gloss white finish, 4 large drawers, and sturdy construction. Easy to assemble with included instructions. Perfect for maximizing space in Kenyan bedrooms.', 'Bed frame with built-in storage drawers in high-gloss finish', 'c4l8n0k3-6p1s-7o8r-2n5q-9p6m2o1l4n7q', TRUE, TRUE, NULL, 'IKEA MALM Bed Frame Kenya | Storage Bed', 'Space-saving bed with storage for Nairobi apartments', ARRAY['ikea', 'bed', 'furniture', 'storage', 'kenya', 'nairobi']::TEXT[], 45.0, '{"height": "90", "width": "209", "depth": "166"}'),
        
        ('ASHLEY-DINING-SET', 'Ashley Furniture 6-Seater Dining Set', 'ashley-dining-table-set', 'Elegant dining set with extendable table and upholstered chairs. Solid wood construction, scratch-resistant surface, and comfortable seating. Extends from 180cm to 220cm to accommodate guests. Perfect for Kenyan family dining rooms.', 'Extendable dining table with 6 upholstered chairs', 'd5m9o1l4-7q2t-8p9s-3o6r-0q7n3p2m5o8r', TRUE, FALSE, NULL, 'Ashley Dining Set Kenya | 6 Seater Table', 'Family dining set with extendable table for Nairobi homes', ARRAY['ashley', 'dining', 'furniture', 'table', 'chairs', 'kenya']::TEXT[], 85.0, '{"height": "75", "width": "180", "depth": "100"}'),
        
        -- Baby & Kids Products
        ('PAMPERS-PREMIUM', 'Pampers Premium Care Diapers Size 4', 'pampers-premium-care-diapers', 'Ultra-absorbent diapers with wetness indicator and breathable materials. Up to 12 hours of protection, soft cotton-like cover, and hypoallergenic. Trusted by Kenyan parents for baby comfort and protection.', 'Premium diapers with wetness indicator and 12-hour protection', 'e6n0p2m5-8r3u-9q0t-4p7s-1r8o4q3n6p9s', TRUE, TRUE, NULL, 'Pampers Diapers Kenya | Premium Care Size 4', 'High-quality diapers for babies available in Nairobi', ARRAY['pampers', 'diapers', 'baby', 'kids', 'kenya', 'nairobi']::TEXT[], 2.5, '{"height": "30", "width": "25", "depth": "15"}'),
        
        ('FISHER-PRICE-PIANO', 'Fisher-Price Deluxe Kick & Play Piano Gym', 'fisher-price-baby-piano-gym', 'Interactive play gym with 4 modes of play from lay & play to sit & play. Includes lights, sounds, and 5 easy-play piano keys. Develops motor skills, senses, and cognitive abilities. Perfect gift for Kenyan babies.', 'Interactive baby play gym with piano and developmental toys', 'f7o1q3n6-9s4v-0r1u-5q8t-2s9p5r4o7q0t', TRUE, FALSE, NULL, 'Fisher-Price Piano Gym Kenya | Baby Play Mat', 'Educational baby toy with piano for developmental play', ARRAY['fisher-price', 'baby', 'toy', 'piano', 'gym', 'kenya']::TEXT[], 3.0, '{"height": "10", "width": "70", "depth": "70"}'),
        
        -- Beauty Products
        ('LOREAL-REVITALIFT', 'L''Oréal Paris Revitalift Laser X3 Anti-Aging Cream', 'loreal-revitalift-cream', 'Advanced anti-aging cream with Pro-Xylane and Hyaluronic Acid. Reduces wrinkles, firms skin, and provides 24-hour hydration. Clinically proven results for Kenyan women of all ages. Suitable for all skin types.', 'Anti-aging cream with Pro-Xylane and Hyaluronic Acid', 'a8p2r4o7-0t5w-1s2v-6r9u-3t0q6s5p8r1u', TRUE, TRUE, NULL, 'L''Oréal Revitalift Kenya | Anti-Aging Cream', 'Advanced skincare cream for women in Nairobi', ARRAY['loreal', 'skincare', 'anti-aging', 'cream', 'beauty', 'kenya']::TEXT[], 0.3, '{"height": "8", "width": "8", "depth": "8"}'),
        
        ('NIVEA-MEN-CREAM', 'Nivea Men Protective Moisturizer SPF 15', 'nivea-men-moisturizer', 'Daily face cream for men with SPF 15 protection. Non-greasy formula with Vitamin E and Hydra IQ technology. Protects from sun damage while moisturizing. Essential grooming product for Kenyan men.', 'Daily face moisturizer for men with SPF 15 protection', 'b9q3s5p8-1u6x-2t3w-7s0v-4u1r7t6q9s2v', TRUE, FALSE, NULL, 'Nivea Men Moisturizer Kenya | SPF 15 Cream', 'Men''s skincare with sun protection for Nairobi climate', ARRAY['nivea', 'men', 'skincare', 'moisturizer', 'spf', 'kenya']::TEXT[], 0.2, '{"height": "5", "width": "5", "depth": "10"}'),
        
        -- Luxury Products
        ('ROLEX-DATEJUST', 'Rolex Datejust 41mm Stainless Steel Watch', 'rolex-datejust-41-watch', 'Iconic Rolex Datejust with 41mm Oyster case, Jubilee bracelet, and fluted bezel. Self-winding mechanical movement, date display with Cyclops lens, and 100m water resistance. Ultimate luxury timepiece for Kenyan collectors.', 'Luxury Swiss watch with stainless steel and classic design', 'c0r4t6q9-2v7y-3u4x-8t1w-5v2s8u7r0t3w', TRUE, TRUE, NULL, 'Rolex Datejust Kenya | 41mm Luxury Watch', 'Authentic Rolex watches available in Nairobi', ARRAY['rolex', 'watch', 'luxury', 'swiss', 'kenya', 'nairobi']::TEXT[], 0.15, '{"height": "5", "width": "4", "depth": "1.5"}'),
        
        ('GUCCI-GG-MARMONT', 'Gucci GG Marmont Matelassé Shoulder Bag', 'gucci-gg-marmont-bag', 'Iconic GG Marmont bag with matelassé chevron pattern. Leather construction, antique gold-toned hardware, and chain shoulder strap. Timeless design that elevates any outfit. Luxury fashion staple for Kenyan style enthusiasts.', 'Luxury leather shoulder bag with iconic GG Marmont design', 'd1s5u7r0-3w8z-4v5y-9u2x-6w3t9v8s1u4x', TRUE, FALSE, NULL, 'Gucci GG Marmont Bag Kenya | Luxury Handbag', 'Authentic Gucci bags available in Nairobi boutiques', ARRAY['gucci', 'bag', 'luxury', 'handbag', 'fashion', 'kenya']::TEXT[], 0.8, '{"height": "18", "width": "25", "depth": "8"}'),
        
        -- Additional Products for Category Diversity
        ('DELL-XPS-15', 'Dell XPS 15 9530 Laptop', 'dell-xps-15-laptop', 'Professional laptop with 15.6" OLED display, Intel Core i7, 16GB RAM, 1TB SSD, and NVIDIA RTX 4050 graphics. Perfect for content creation and business in Kenya.', 'Powerful laptop with OLED display for professionals', 'a6d0f2c5-8h3k-9g0j-4f7i-1h8e4g3d6f9i', TRUE, TRUE, NULL, 'Dell XPS 15 Kenya | Professional Laptop', 'High-performance laptop for Kenyan professionals', ARRAY['dell', 'laptop', 'xps', 'professional', 'kenya']::TEXT[], 2.2, '{"height": "1.8", "width": "35.7", "depth": "23.5"}'),
        
        ('ADIDAS-ULTRABOOST', 'Adidas Ultraboost 22 Running Shoes', 'adidas-ultraboost-running', 'Premium running shoes with Boost cushioning, Primeknit upper, and Continental rubber outsole. Perfect for running enthusiasts and athletes in Kenya.', 'Running shoes with Boost technology for maximum comfort', 'e0h4j6g9-2l7o-3k4n-8j1m-5l2i8k7h0j3m', TRUE, FALSE, NULL, 'Adidas Ultraboost Kenya | Running Shoes', 'Performance running shoes for Kenyan athletes', ARRAY['adidas', 'running', 'shoes', 'ultraboost', 'sports', 'kenya']::TEXT[], 0.31, '{"height": "12", "width": "25", "depth": "10"}'),
        
        ('ZARA-TRENCH-COAT', 'Zara Double-Breasted Trench Coat', 'zara-trench-coat', 'Classic trench coat with double-breasted design, belt, and waterproof material. Perfect for Nairobi''s rainy season and formal occasions.', 'Waterproof trench coat for formal and casual wear', 'b3k7m9j2-5o0r-6n7q-1m4p-8o5l1n0k3m6p', TRUE, TRUE, NULL, 'Zara Trench Coat Kenya | Classic Outerwear', 'Stylish trench coat for Nairobi weather', ARRAY['zara', 'coat', 'trench', 'fashion', 'outerwear', 'kenya']::TEXT[], 1.1, '{"height": "5", "width": "50", "depth": "40"}'),
        
        ('HP-PRINTER-OFFICEJET', 'HP OfficeJet Pro 9025e All-in-One Printer', 'hp-officejet-printer', 'Wireless all-in-one printer with print, scan, copy, and fax. Automatic document feeder, two-sided printing, and HP Instant Ink ready. Perfect for Kenyan home offices and small businesses.', 'All-in-one printer for home office and small business', 'f5c9e1b4-7g2j-8f9i-3e6h-0g7d3f2c5e8h', TRUE, FALSE, NULL, 'HP Printer Kenya | OfficeJet Pro All-in-One', 'Wireless printer for Nairobi offices and homes', ARRAY['hp', 'printer', 'office', 'all-in-one', 'kenya']::TEXT[], 10.5, '{"height": "42", "width": "46", "depth": "36"}')
    ) AS t(sku, name, slug, description, short_description, brand_id, is_published, is_featured, deal_end_date, meta_title, meta_description, search_keywords, weight_kg, dimensions_cm)
)
INSERT INTO products (id, sku, name, slug, description, short_description, brand_id, status, is_published, is_featured, is_deal, deal_end_date, meta_title, meta_description, search_keywords, weight_kg, dimensions_cm, rating, review_count, view_count)
SELECT 
    gen_random_uuid(),
    pd.sku,
    pd.name,
    pd.slug,
    pd.description,
    pd.short_description,
    b.id,
    'active',
    pd.is_published,
    pd.is_featured,
    CASE WHEN pd.deal_end_date IS NOT NULL THEN TRUE ELSE FALSE END,
    pd.deal_end_date,
    pd.meta_title,
    pd.meta_description,
    pd.search_keywords,
    pd.weight_kg,
    pd.dimensions_cm::JSONB,
    4.5 + random() * 0.5, -- Random rating between 4.5-5.0
    floor(random() * 100) + 50, -- Random review count 50-150
    floor(random() * 1000) + 500 -- Random view count 500-1500
FROM product_data pd
JOIN brands b ON b.id::TEXT = pd.brand_id
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.slug = pd.slug)
ON CONFLICT (slug) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    brand_id = EXCLUDED.brand_id,
    is_published = EXCLUDED.is_published,
    is_featured = EXCLUDED.is_featured,
    is_deal = EXCLUDED.is_deal,
    deal_end_date = EXCLUDED.deal_end_date,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description,
    search_keywords = EXCLUDED.search_keywords,
    weight_kg = EXCLUDED.weight_kg,
    dimensions_cm = EXCLUDED.dimensions_cm,
    updated_at = NOW();

-- ============================================================================
-- 5. INSERT PRODUCT VARIANTS (multiple variants per product)
-- ============================================================================

DO $$ 
DECLARE
    product_record RECORD;
    variant_counter INTEGER;
    color_options TEXT[] := ARRAY['Black', 'White', 'Blue', 'Red', 'Gray', 'Silver', 'Gold', 'Space Gray', 'Midnight', 'Starlight', 'Green', 'Graphite'];
    size_options TEXT[] := ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42'];
    material_options TEXT[] := ARRAY['Leather', 'Canvas', 'Denim', 'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Synthetic'];
BEGIN
    FOR product_record IN SELECT id, name FROM products ORDER BY created_at LOOP
        -- Determine variant count based on product type
        variant_counter := 2 + floor(random() * 3)::INTEGER; -- 2-4 variants per product
        
        FOR i IN 1..variant_counter LOOP
            INSERT INTO product_variants (id, product_id, sku, name, color, size, material, attributes)
            VALUES (
                gen_random_uuid(),
                product_record.id,
                product_record.id || '-V' || LPAD(i::TEXT, 2, '0'),
                CASE 
                    WHEN product_record.name LIKE '%Phone%' OR product_record.name LIKE '%Samsung%' THEN 
                        color_options[1 + floor(random() * array_length(color_options, 1))::INTEGER] || ' ' || 
                        CASE floor(random() * 3)::INTEGER
                            WHEN 0 THEN '128GB'
                            WHEN 1 THEN '256GB'
                            ELSE '512GB'
                        END
                    WHEN product_record.name LIKE '%Laptop%' OR product_record.name LIKE '%MacBook%' THEN 
                        color_options[1 + floor(random() * 5)::INTEGER] || ' ' || 
                        CASE floor(random() * 3)::INTEGER
                            WHEN 0 THEN '8GB/256GB'
                            WHEN 1 THEN '16GB/512GB'
                            ELSE '32GB/1TB'
                        END
                    WHEN product_record.name LIKE '%Jeans%' OR product_record.name LIKE '%Clothing%' THEN 
                        size_options[1 + floor(random() * array_length(size_options, 1))::INTEGER] || ' - ' || 
                        color_options[1 + floor(random() * array_length(color_options, 1))::INTEGER]
                    WHEN product_record.name LIKE '%Shoes%' THEN 
                        size_options[7 + floor(random() * 6)::INTEGER] || ' - ' || 
                        color_options[1 + floor(random() * array_length(color_options, 1))::INTEGER]
                    WHEN product_record.name LIKE '%TV%' THEN '65"'
                    WHEN product_record.name LIKE '%Refrigerator%' THEN '613L - ' || color_options[6]
                    WHEN product_record.name LIKE '%Washing Machine%' THEN '9kg - ' || color_options[2]
                    ELSE 'Standard - ' || color_options[1 + floor(random() * array_length(color_options, 1))::INTEGER]
                END,
                CASE WHEN random() > 0.3 THEN color_options[1 + floor(random() * array_length(color_options, 1))::INTEGER] ELSE NULL END,
                CASE WHEN product_record.name LIKE '%Clothing%' OR product_record.name LIKE '%Shoes%' THEN 
                    size_options[1 + floor(random() * array_length(size_options, 1))::INTEGER] 
                ELSE NULL END,
                CASE WHEN product_record.name LIKE '%Bag%' OR product_record.name LIKE '%Shoes%' THEN 
                    material_options[1 + floor(random() * array_length(material_options, 1))::INTEGER] 
                ELSE NULL END,
                jsonb_build_object(
                    'warranty', CASE 
                        WHEN product_record.name LIKE '%Phone%' THEN '2 Years'
                        WHEN product_record.name LIKE '%Laptop%' THEN '3 Years'
                        WHEN product_record.name LIKE '%TV%' THEN '2 Years'
                        WHEN product_record.name LIKE '%Watch%' THEN '5 Years'
                        ELSE '1 Year'
                    END,
                    'origin', CASE 
                        WHEN product_record.name LIKE '%Samsung%' THEN 'South Korea'
                        WHEN product_record.name LIKE '%Apple%' THEN 'USA'
                        WHEN product_record.name LIKE '%LG%' THEN 'South Korea'
                        WHEN product_record.name LIKE '%Sony%' THEN 'Japan'
                        WHEN product_record.name LIKE '%Bosch%' THEN 'Germany'
                        WHEN product_record.name LIKE '%Rolex%' THEN 'Switzerland'
                        WHEN product_record.name LIKE '%Gucci%' THEN 'Italy'
                        ELSE 'Various'
                    END
                )
            ) ON CONFLICT (sku) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 6. INSERT PRODUCT IMAGES (multiple images per product)
-- ============================================================================

DO $$ 
DECLARE
    product_record RECORD;
    variant_record RECORD;
    image_counter INTEGER;
    image_urls TEXT[][] := ARRAY[
        ARRAY['https://storage.googleapis.com/xarastore-products/electronics/samsung-galaxy-s24-ultra-1.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/samsung-galaxy-s24-ultra-2.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/samsung-galaxy-s24-ultra-3.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/samsung-galaxy-s24-ultra-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/electronics/lg-oled-tv-1.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/lg-oled-tv-2.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/lg-oled-tv-3.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/lg-oled-tv-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/electronics/macbook-pro-1.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/macbook-pro-2.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/macbook-pro-3.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/macbook-pro-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/electronics/sony-headphones-1.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/sony-headphones-2.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/sony-headphones-3.jpg', 'https://storage.googleapis.com/xarastore-products/electronics/sony-headphones-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/home-appliances/bosch-washer-1.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/bosch-washer-2.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/bosch-washer-3.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/bosch-washer-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/home-appliances/lg-fridge-1.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/lg-fridge-2.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/lg-fridge-3.jpg', 'https://storage.googleapis.com/xarastore-products/home-appliances/lg-fridge-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/fashion/nike-jordan-1.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/nike-jordan-2.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/nike-jordan-3.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/nike-jordan-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/fashion/levis-jeans-1.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/levis-jeans-2.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/levis-jeans-3.jpg', 'https://storage.googleapis.com/xarastore-products/fashion/levis-jeans-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/furniture/ikea-bed-1.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ikea-bed-2.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ikea-bed-3.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ikea-bed-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/furniture/ashley-dining-1.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ashley-dining-2.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ashley-dining-3.jpg', 'https://storage.googleapis.com/xarastore-products/furniture/ashley-dining-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/baby/pampers-1.jpg', 'https://storage.googleapis.com/xarastore-products/baby/pampers-2.jpg', 'https://storage.googleapis.com/xarastore-products/baby/pampers-3.jpg', 'https://storage.googleapis.com/xarastore-products/baby/pampers-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/baby/fisher-price-1.jpg', 'https://storage.googleapis.com/xarastore-products/baby/fisher-price-2.jpg', 'https://storage.googleapis.com/xarastore-products/baby/fisher-price-3.jpg', 'https://storage.googleapis.com/xarastore-products/baby/fisher-price-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/beauty/loreal-cream-1.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/loreal-cream-2.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/loreal-cream-3.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/loreal-cream-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/beauty/nivea-men-1.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/nivea-men-2.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/nivea-men-3.jpg', 'https://storage.googleapis.com/xarastore-products/beauty/nivea-men-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/luxury/rolex-watch-1.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/rolex-watch-2.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/rolex-watch-3.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/rolex-watch-4.jpg'],
        ARRAY['https://storage.googleapis.com/xarastore-products/luxury/gucci-bag-1.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/gucci-bag-2.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/gucci-bag-3.jpg', 'https://storage.googleapis.com/xarastore-products/luxury/gucci-bag-4.jpg']
    ];
    current_image_set TEXT[];
    image_index INTEGER := 1;
BEGIN
    FOR product_record IN SELECT id, name, row_number() OVER (ORDER BY created_at) as rn FROM products ORDER BY created_at LOOP
        -- Select image set based on rotation
        current_image_set := image_urls[((image_index - 1) % array_length(image_urls, 1)) + 1];
        image_index := image_index + 1;
        
        -- Insert 3-4 images for each product
        FOR i IN 1..(3 + floor(random() * 2)::INTEGER) LOOP
            IF i <= array_length(current_image_set, 1) THEN
                INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary)
                VALUES (
                    gen_random_uuid(),
                    product_record.id,
                    current_image_set[i],
                    product_record.name || ' - Image ' || i,
                    i,
                    i = 1
                ) ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        
        -- Insert variant-specific images
        FOR variant_record IN SELECT id FROM product_variants WHERE product_id = product_record.id LIMIT 2 LOOP
            INSERT INTO product_images (id, product_id, variant_id, image_url, alt_text, display_order)
            VALUES (
                gen_random_uuid(),
                product_record.id,
                variant_record.id,
                'https://storage.googleapis.com/xarastore-products/variants/variant-' || substring(variant_record.id::TEXT from 1 for 8) || '.jpg',
                product_record.name || ' - Variant Detail',
                5
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 7. INSERT PRODUCT CATEGORIES (each product in 3+ categories)
-- ============================================================================

DO $$ 
DECLARE
    product_record RECORD;
    category_record RECORD;
    category_count INTEGER;
    selected_categories UUID[];
    primary_category_set BOOLEAN;
BEGIN
    FOR product_record IN SELECT id, name FROM products ORDER BY created_at LOOP
        selected_categories := ARRAY[]::UUID[];
        primary_category_set := FALSE;
        
        -- Determine appropriate categories based on product type
        IF product_record.name LIKE '%Phone%' OR product_record.name LIKE '%Samsung%' OR product_record.name LIKE '%Apple%' THEN
            -- Electronics products
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('smartphones', 'electronics', 'wearables', 'premium-electronics')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Laptop%' OR product_record.name LIKE '%MacBook%' OR product_record.name LIKE '%Dell%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('laptops-computers', 'electronics', 'office-wear', 'premium-electronics')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%TV%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('televisions', 'electronics', 'home-living', 'premium-electronics')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Headphones%' OR product_record.name LIKE '%Audio%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('audio-headphones', 'electronics', 'wearables', 'sports-wear')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Washing%' OR product_record.name LIKE '%Refrigerator%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('home-appliances', 'home-living', 'kitchen-dining', 'storage-organization')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Jeans%' OR product_record.name LIKE '%Clothing%' OR product_record.name LIKE '%Coat%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('mens-clothing', 'womens-clothing', 'fashion', 'casual-wear', 'office-wear', 'seasonal-collections')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Shoes%' OR product_record.name LIKE '%Nike%' OR product_record.name LIKE '%Adidas%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('footwear', 'fashion', 'sports-wear', 'casual-wear', 'sports-outdoors')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Bed%' OR product_record.name LIKE '%Furniture%' OR product_record.name LIKE '%Table%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('furniture', 'home-living', 'home-decor', 'bedding-bath')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Diapers%' OR product_record.name LIKE '%Baby%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('diapering', 'baby-kids', 'baby-clothing', 'safety')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Toy%' OR product_record.name LIKE '%Fisher%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('toys-games', 'baby-kids', 'nursery')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Cream%' OR product_record.name LIKE '%Skincare%' OR product_record.name LIKE '%Beauty%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('skincare', 'beauty-personal-care', 'personal-care', 'bath-body')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Watch%' OR product_record.name LIKE '%Rolex%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('luxury-watches', 'watches', 'luxury', 'accessories')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSIF product_record.name LIKE '%Bag%' OR product_record.name LIKE '%Gucci%' THEN
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE slug IN ('designer-handbags', 'bags-luggage', 'luxury', 'accessories', 'luxury-fashion')
            LIMIT 3 + floor(random() * 2)::INTEGER;
            
        ELSE
            -- Default categories for other products
            SELECT array_agg(id) INTO selected_categories 
            FROM categories 
            WHERE is_active = TRUE 
            ORDER BY random() 
            LIMIT 3 + floor(random() * 2)::INTEGER;
        END IF;
        
        -- Insert category associations
        FOR i IN 1..array_length(selected_categories, 1) LOOP
            INSERT INTO product_categories (product_id, category_id, is_primary)
            VALUES (
                product_record.id,
                selected_categories[i],
                NOT primary_category_set
            ) ON CONFLICT (product_id, category_id) DO UPDATE SET
                is_primary = EXCLUDED.is_primary;
            
            IF NOT primary_category_set THEN
                primary_category_set := TRUE;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 8. INSERT PRICING (KES currency with realistic Kenyan market prices)
-- ============================================================================

DO $$ 
DECLARE
    product_record RECORD;
    variant_record RECORD;
    base_price DECIMAL;
    sale_price DECIMAL;
    price_multiplier DECIMAL;
    vat_rate DECIMAL;
BEGIN
    -- Get VAT rate from site_settings
    SELECT vat_rate INTO vat_rate FROM site_settings LIMIT 1;
    
    FOR product_record IN SELECT id, name FROM products ORDER BY created_at LOOP
        -- Determine base price multiplier based on product type
        IF product_record.name LIKE '%Rolex%' OR product_record.name LIKE '%Gucci%' THEN
            price_multiplier := 150000 + random() * 50000; -- Luxury items: 150K-200K KES
        ELSIF product_record.name LIKE '%Samsung Galaxy%' OR product_record.name LIKE '%MacBook%' THEN
            price_multiplier := 120000 + random() * 30000; -- Premium electronics: 120K-150K KES
        ELSIF product_record.name LIKE '%LG OLED%' THEN
            price_multiplier := 180000 + random() * 40000; -- Premium TV: 180K-220K KES
        ELSIF product_record.name LIKE '%Dell XPS%' THEN
            price_multiplier := 140000 + random() * 30000; -- Premium laptop: 140K-170K KES
        ELSIF product_record.name LIKE '%Bosch%' OR product_record.name LIKE '%LG Refrigerator%' THEN
            price_multiplier := 80000 + random() * 20000; -- Large appliances: 80K-100K KES
        ELSIF product_record.name LIKE '%Sony Headphones%' THEN
            price_multiplier := 35000 + random() * 10000; -- Premium headphones: 35K-45K KES
        ELSIF product_record.name LIKE '%IKEA Bed%' OR product_record.name LIKE '%Ashley Dining%' THEN
            price_multiplier := 45000 + random() * 15000; -- Furniture: 45K-60K KES
        ELSIF product_record.name LIKE '%Nike%' OR product_record.name LIKE '%Adidas%' THEN
            price_multiplier := 12000 + random() * 5000; -- Premium shoes: 12K-17K KES
        ELSIF product_record.name LIKE '%Levi''s%' OR product_record.name LIKE '%Zara%' THEN
            price_multiplier := 4000 + random() * 2000; -- Clothing: 4K-6K KES
        ELSIF product_record.name LIKE '%L''Oréal%' OR product_record.name LIKE '%Nivea%' THEN
            price_multiplier := 1500 + random() * 1000; -- Beauty products: 1.5K-2.5K KES
        ELSIF product_record.name LIKE '%Pampers%' THEN
            price_multiplier := 2500 + random() * 500; -- Baby products: 2.5K-3K KES
        ELSIF product_record.name LIKE '%Fisher-Price%' THEN
            price_multiplier := 6000 + random() * 2000; -- Toys: 6K-8K KES
        ELSIF product_record.name LIKE '%HP Printer%' THEN
            price_multiplier := 25000 + random() * 5000; -- Office equipment: 25K-30K KES
        ELSE
            price_multiplier := 10000 + random() * 5000; -- Default: 10K-15K KES
        END IF;
        
        -- Insert pricing for each variant
        FOR variant_record IN SELECT id FROM product_variants WHERE product_id = product_record.id LOOP
            -- Base price with slight variation per variant
            base_price := ROUND(price_multiplier * (0.9 + random() * 0.2), -2); -- ±10% variation rounded to nearest 100
            
            -- Determine if this variant has a sale price (30% chance)
            IF random() < 0.3 THEN
                sale_price := ROUND(base_price * (0.7 + random() * 0.2), -2); -- 20-30% discount
            ELSE
                sale_price := NULL;
            END IF;
            
            INSERT INTO pricing (id, product_id, variant_id, base_price, sale_price, currency, vat_inclusive, vat_rate, cost_price, price_valid_from)
            VALUES (
                gen_random_uuid(),
                product_record.id,
                variant_record.id,
                base_price,
                sale_price,
                'KES',
                TRUE,
                vat_rate,
                ROUND(base_price * 0.6, -2), -- Cost price at 60% of base
                NOW() - INTERVAL '1 day' * floor(random() * 30)::INTEGER -- Valid from 0-30 days ago
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 9. INSERT INVENTORY (realistic stock levels)
-- ============================================================================

DO $$ 
DECLARE
    product_record RECORD;
    variant_record RECORD;
    stock_quantity INTEGER;
    reserved_quantity INTEGER;
    low_stock_threshold INTEGER;
BEGIN
    FOR product_record IN SELECT id, name FROM products ORDER BY created_at LOOP
        FOR variant_record IN SELECT id FROM product_variants WHERE product_id = product_record.id LOOP
            -- Determine stock levels based on product type
            IF product_record.name LIKE '%Rolex%' OR product_record.name LIKE '%Gucci%' THEN
                stock_quantity := 2 + floor(random() * 3)::INTEGER; -- Luxury: 2-4 units
                low_stock_threshold := 1;
            ELSIF product_record.name LIKE '%Samsung Galaxy%' OR product_record.name LIKE '%MacBook%' THEN
                stock_quantity := 15 + floor(random() * 10)::INTEGER; -- Premium electronics: 15-25 units
                low_stock_threshold := 3;
            ELSIF product_record.name LIKE '%LG OLED%' THEN
                stock_quantity := 8 + floor(random() * 7)::INTEGER; -- Large TVs: 8-15 units
                low_stock_threshold := 2;
            ELSIF product_record.name LIKE '%Bosch%' OR product_record.name LIKE '%LG Refrigerator%' THEN
                stock_quantity := 12 + floor(random() * 8)::INTEGER; -- Appliances: 12-20 units
                low_stock_threshold := 3;
            ELSIF product_record.name LIKE '%IKEA%' OR product_record.name LIKE '%Ashley%' THEN
                stock_quantity := 20 + floor(random() * 15)::INTEGER; -- Furniture: 20-35 units
                low_stock_threshold := 5;
            ELSIF product_record.name LIKE '%Nike%' OR product_record.name LIKE '%Adidas%' THEN
                stock_quantity := 50 + floor(random() * 50)::INTEGER; -- Shoes: 50-100 units
                low_stock_threshold := 10;
            ELSIF product_record.name LIKE '%Levi''s%' OR product_record.name LIKE '%Zara%' THEN
                stock_quantity := 100 + floor(random() * 100)::INTEGER; -- Clothing: 100-200 units
                low_stock_threshold := 20;
            ELSIF product_record.name LIKE '%L''Oréal%' OR product_record.name LIKE '%Nivea%' THEN
                stock_quantity := 200 + floor(random() * 150)::INTEGER; -- Beauty: 200-350 units
                low_stock_threshold := 30;
            ELSIF product_record.name LIKE '%Pampers%' THEN
                stock_quantity := 300 + floor(random() * 200)::INTEGER; -- Baby products: 300-500 units
                low_stock_threshold := 50;
            ELSIF product_record.name LIKE '%Fisher-Price%' THEN
                stock_quantity := 40 + floor(random() * 30)::INTEGER; -- Toys: 40-70 units
                low_stock_threshold := 8;
            ELSIF product_record.name LIKE '%HP Printer%' THEN
                stock_quantity := 25 + floor(random() * 20)::INTEGER; -- Office: 25-45 units
                low_stock_threshold := 5;
            ELSE
                stock_quantity := 30 + floor(random() * 40)::INTEGER; -- Default: 30-70 units
                low_stock_threshold := 8;
            END IF;
            
            -- Some reserved quantity (simulating orders in progress)
            reserved_quantity := floor(random() * 5)::INTEGER; -- 0-4 units reserved
            
            INSERT INTO inventory (id, product_id, variant_id, quantity, reserved_quantity, low_stock_threshold, warehouse_location, last_restocked)
            VALUES (
                gen_random_uuid(),
                product_record.id,
                variant_record.id,
                stock_quantity,
                reserved_quantity,
                low_stock_threshold,
                CASE floor(random() * 3)::INTEGER
                    WHEN 0 THEN 'Nairobi Main Warehouse'
                    WHEN 1 THEN 'Mombasa Distribution Center'
                    ELSE 'Kisumu Regional Warehouse'
                END,
                NOW() - INTERVAL '1 day' * floor(random() * 60)::INTEGER -- Restocked 0-60 days ago
            ) ON CONFLICT (product_id, variant_id) DO UPDATE SET
                quantity = EXCLUDED.quantity,
                reserved_quantity = EXCLUDED.reserved_quantity,
                low_stock_threshold = EXCLUDED.low_stock_threshold,
                warehouse_location = EXCLUDED.warehouse_location,
                last_restocked = EXCLUDED.last_restocked,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 10. FINAL VERIFICATION & DATA INTEGRITY CHECKS
-- ============================================================================

DO $$ 
DECLARE
    total_products INTEGER;
    products_with_variants INTEGER;
    products_with_images INTEGER;
    products_with_pricing INTEGER;
    products_with_inventory INTEGER;
    products_with_categories INTEGER;
    publicly_visible_products INTEGER;
    vat_rate DECIMAL;
BEGIN
    -- Get VAT rate for verification
    SELECT vat_rate INTO vat_rate FROM site_settings LIMIT 1;
    
    -- Count totals for verification
    SELECT COUNT(*) INTO total_products FROM products WHERE status = 'active' AND is_published = TRUE;
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_variants 
    FROM products p 
    JOIN product_variants pv ON p.id = pv.product_id 
    WHERE p.status = 'active' AND p.is_published = TRUE;
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_images 
    FROM products p 
    JOIN product_images pi ON p.id = pi.product_id 
    WHERE p.status = 'active' AND p.is_published = TRUE;
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_pricing 
    FROM products p 
    JOIN pricing pr ON p.id = pr.product_id 
    WHERE p.status = 'active' AND p.is_published = TRUE 
    AND pr.price_valid_to IS NULL OR pr.price_valid_to > NOW();
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_inventory 
    FROM products p 
    JOIN inventory i ON p.id = i.product_id 
    WHERE p.status = 'active' AND p.is_published = TRUE 
    AND i.available_quantity > 0;
    
    SELECT COUNT(DISTINCT p.id) INTO products_with_categories 
    FROM products p 
    JOIN product_categories pc ON p.id = pc.product_id 
    JOIN categories c ON pc.category_id = c.id 
    WHERE p.status = 'active' AND p.is_published = TRUE 
    AND c.is_active = TRUE;
    
    -- Verify all products have complete data
    IF total_products = 0 THEN
        RAISE EXCEPTION 'No active, published products found after seeding';
    END IF;
    
    IF products_with_variants < total_products THEN
        RAISE EXCEPTION 'Not all products have variants. Missing variants for % products', 
            total_products - products_with_variants;
    END IF;
    
    IF products_with_images < total_products THEN
        RAISE EXCEPTION 'Not all products have images. Missing images for % products', 
            total_products - products_with_images;
    END IF;
    
    IF products_with_pricing < total_products THEN
        RAISE EXCEPTION 'Not all products have pricing. Missing pricing for % products', 
            total_products - products_with_pricing;
    END IF;
    
    IF products_with_inventory < total_products THEN
        RAISE EXCEPTION 'Not all products have inventory. Missing inventory for % products', 
            total_products - products_with_inventory;
    END IF;
    
    IF products_with_categories < total_products THEN
        RAISE EXCEPTION 'Not all products have categories. Missing categories for % products', 
            total_products - products_with_categories;
    END IF;
    
    -- Verify pricing consistency
    IF EXISTS (
        SELECT 1 FROM pricing 
        WHERE currency != 'KES' 
        AND (price_valid_to IS NULL OR price_valid_to > NOW())
    ) THEN
        RAISE EXCEPTION 'Found pricing records with non-KES currency';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pricing 
        WHERE vat_rate != vat_rate 
        AND (price_valid_to IS NULL OR price_valid_to > NOW())
    ) THEN
        RAISE EXCEPTION 'Pricing VAT rate does not match site settings';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pricing 
        WHERE sale_price IS NOT NULL AND sale_price > base_price
    ) THEN
        RAISE EXCEPTION 'Found sale prices higher than base prices';
    END IF;
    
    -- Verify inventory consistency
    IF EXISTS (
        SELECT 1 FROM inventory 
        WHERE available_quantity < 0
    ) THEN
        RAISE EXCEPTION 'Found negative available quantity in inventory';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM inventory 
        WHERE reserved_quantity > quantity
    ) THEN
        RAISE EXCEPTION 'Found reserved quantity exceeding total quantity';
    END IF;
    
    -- Log successful verification
    RAISE NOTICE 'Seed verification completed successfully:';
    RAISE NOTICE 'Total products: %', total_products;
    RAISE NOTICE 'Products with variants: %', products_with_variants;
    RAISE NOTICE 'Products with images: %', products_with_images;
    RAISE NOTICE 'Products with pricing: %', products_with_pricing;
    RAISE NOTICE 'Products with inventory: %', products_with_inventory;
    RAISE NOTICE 'Products with categories: %', products_with_categories;
    
    -- Final check: Products visible to public
    SELECT COUNT(*) INTO publicly_visible_products FROM products 
    WHERE status = 'active' 
    AND is_published = TRUE 
    AND EXISTS (
        SELECT 1 FROM pricing p 
        WHERE p.product_id = products.id 
        AND (p.price_valid_to IS NULL OR p.price_valid_to > NOW())
    )
    AND EXISTS (
        SELECT 1 FROM inventory i 
        WHERE i.product_id = products.id 
        AND i.available_quantity > 0
    )
    AND EXISTS (
        SELECT 1 FROM product_images pi 
        WHERE pi.product_id = products.id
    )
    AND EXISTS (
        SELECT 1 FROM product_categories pc 
        JOIN categories c ON pc.category_id = c.id 
        WHERE pc.product_id = products.id 
        AND c.is_active = TRUE
    );
    
    RAISE NOTICE 'Publicly visible products ready for e-commerce: %', publicly_visible_products;
    
    IF publicly_visible_products = 0 THEN
        RAISE EXCEPTION 'No products are fully ready for public display. Check data completeness.';
    END IF;
END $$;

-- ============================================================================
-- 11. CREATE SEARCH INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create full-text search index for products
-- Full-text search index for products
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin (
    (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(coalesce(search_keywords, '{}'::text[]), ' ')), 'C')
    )
);

-- Create index for product filtering performance
CREATE INDEX IF NOT EXISTS idx_products_filter ON products (status, is_published, is_featured, is_deal, rating)
WHERE status = 'active' AND is_published = TRUE;

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS idx_product_categories_filter ON product_categories (category_id, is_primary)
WHERE is_primary = TRUE;

-- Create index for price range queries
CREATE INDEX IF NOT EXISTS idx_pricing_range ON pricing (product_id, base_price, sale_price)
WHERE (price_valid_to IS NULL OR price_valid_to > NOW());

-- Create index for inventory availability
CREATE INDEX IF NOT EXISTS idx_inventory_availability ON inventory (product_id, available_quantity)
WHERE available_quantity > 0;

-- ============================================================================
-- 12. UPDATE BRAND AND CATEGORY COUNTERS
-- ============================================================================

-- Update product counts in brands
UPDATE brands b
SET product_count = (
    SELECT COUNT(*) 
    FROM products p 
    WHERE p.brand_id = b.id 
    AND p.status = 'active' 
    AND p.is_published = TRUE
);

-- Update product counts in categories
UPDATE categories c
SET product_count = (
    SELECT COUNT(DISTINCT pc.product_id)
    FROM product_categories pc
    JOIN products p ON pc.product_id = p.id
    WHERE pc.category_id = c.id
    AND p.status = 'active'
    AND p.is_published = TRUE
);

-- ============================================================================
-- 13. CREATE VIEW FOR PUBLIC PRODUCT LISTING
-- ============================================================================

CREATE OR REPLACE VIEW public_products AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.slug,
    p.description,
    p.short_description,
    p.brand_id,
    b.name as brand_name,
    b.slug as brand_slug,
    p.is_featured,
    p.is_deal,
    p.deal_end_date,
    p.rating,
    p.review_count,
    p.view_count,
    p.weight_kg,
    p.dimensions_cm,
    p.created_at,
    p.updated_at,
    -- Primary category
    (
        SELECT c.name 
        FROM product_categories pc 
        JOIN categories c ON pc.category_id = c.id 
        WHERE pc.product_id = p.id 
        AND pc.is_primary = TRUE 
        AND c.is_active = TRUE 
        LIMIT 1
    ) as primary_category,
    -- All categories as array
    (
        SELECT array_agg(c.name)
        FROM product_categories pc 
        JOIN categories c ON pc.category_id = c.id 
        WHERE pc.product_id = p.id 
        AND c.is_active = TRUE
    ) as categories,
    -- Price information
    (
        SELECT jsonb_build_object(
            'base_price', MIN(pr.base_price),
            'sale_price', MIN(pr.sale_price),
            'currency', 'KES',
            'discount_percentage', CASE 
                WHEN MIN(pr.sale_price) IS NOT NULL 
                THEN ROUND((1 - MIN(pr.sale_price) / MIN(pr.base_price)) * 100)
                ELSE NULL
            END
        )
        FROM pricing pr
        WHERE pr.product_id = p.id
        AND (pr.price_valid_to IS NULL OR pr.price_valid_to > NOW())
    ) as pricing,
    -- Primary image
    (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        AND pi.is_primary = TRUE
        LIMIT 1
    ) as primary_image,
    -- Total available stock
    (
        SELECT SUM(i.available_quantity)
        FROM inventory i
        WHERE i.product_id = p.id
        AND i.available_quantity > 0
    ) as total_stock,
    -- Variant count
    (
        SELECT COUNT(*)
        FROM product_variants pv
        WHERE pv.product_id = p.id
    ) as variant_count
FROM products p
JOIN brands b ON p.brand_id = b.id
WHERE p.status = 'active'
AND p.is_published = TRUE
AND EXISTS (
    SELECT 1 FROM pricing pr
    WHERE pr.product_id = p.id
    AND (pr.price_valid_to IS NULL OR pr.price_valid_to > NOW())
)
AND EXISTS (
    SELECT 1 FROM inventory i
    WHERE i.product_id = p.id
    AND i.available_quantity > 0
)
AND EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
)
AND b.is_active = TRUE;

-- Grant public access to the view
GRANT SELECT ON public_products TO PUBLIC;

-- ============================================================================
-- 14. FINAL COMMIT AND SUCCESS MESSAGE
-- ============================================================================

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '✅ Xarastore product seeding completed successfully!';
    RAISE NOTICE '📦 Total products seeded: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE '🏪 Products are now publicly visible.';
    RAISE NOTICE '💰 All prices are in KES (Kenyan Shilling).';
    RAISE NOTICE '🔒 RLS policies are active and enforced.';
END $$;

