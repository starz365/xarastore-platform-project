BEGIN;

-- ====================================================================
-- 1. PRE-FLIGHT VALIDATION & SCHEMA ENFORCEMENT
-- ====================================================================

-- Check required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing seed functions to avoid conflicts
DROP FUNCTION IF EXISTS seed_products() CASCADE;
DROP FUNCTION IF EXISTS verify_seed_results() CASCADE;

-- Verify core tables exist or create them
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        missing_tables := array_append(missing_tables, 'products');
        -- Create products table
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            short_description TEXT,
            sku TEXT UNIQUE NOT NULL,
            brand_id UUID,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
            is_published BOOLEAN DEFAULT true,
            is_featured BOOLEAN DEFAULT false,
            is_deal BOOLEAN DEFAULT false,
            deal_ends_at TIMESTAMPTZ,
            rating DECIMAL(3,2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            meta_title TEXT,
            meta_description TEXT,
            meta_keywords TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID,
            updated_by UUID
        );
        RAISE NOTICE 'Created missing table: products';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_variants') THEN
        missing_tables := array_append(missing_tables, 'product_variants');
        -- Create product_variants table
        CREATE TABLE IF NOT EXISTS product_variants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            attributes JSONB DEFAULT '{}',
            price DECIMAL(10,2) NOT NULL,
            compare_at_price DECIMAL(10,2),
            cost DECIMAL(10,2),
            currency TEXT DEFAULT 'KES',
            weight DECIMAL(8,3),
            dimensions JSONB,
            position INTEGER DEFAULT 0,
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: product_variants';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
        missing_tables := array_append(missing_tables, 'categories');
        -- Create categories table
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            parent_id UUID REFERENCES categories(id),
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            meta_title TEXT,
            meta_description TEXT,
            is_active BOOLEAN DEFAULT true,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: categories';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_categories') THEN
        missing_tables := array_append(missing_tables, 'product_categories');
        -- Create product_categories table
        CREATE TABLE IF NOT EXISTS product_categories (
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (product_id, category_id)
        );
        RAISE NOTICE 'Created missing table: product_categories';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brands') THEN
        missing_tables := array_append(missing_tables, 'brands');
        -- Create brands table
        CREATE TABLE IF NOT EXISTS brands (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            logo_url TEXT,
            website_url TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: brands';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_images') THEN
        missing_tables := array_append(missing_tables, 'product_images');
        -- Create product_images table
        CREATE TABLE IF NOT EXISTS product_images (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            alt_text TEXT,
            position INTEGER DEFAULT 0,
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: product_images';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory') THEN
        missing_tables := array_append(missing_tables, 'inventory');
        -- Create inventory table
        CREATE TABLE IF NOT EXISTS inventory (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
            sku TEXT UNIQUE,
            quantity INTEGER NOT NULL DEFAULT 0,
            reserved INTEGER DEFAULT 0,
            available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
            low_stock_threshold INTEGER DEFAULT 5,
            warehouse_location TEXT,
            last_restocked TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: inventory';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'site_settings') THEN
        missing_tables := array_append(missing_tables, 'site_settings');
        -- Create site_settings table
        CREATE TABLE IF NOT EXISTS site_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key TEXT UNIQUE NOT NULL,
            value JSONB NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing table: site_settings';
    END IF;

    -- Verify critical columns exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'slug') THEN
        ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'currency') THEN
        ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'quantity') THEN
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Report on missing tables that were created
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'Created missing tables: %', missing_tables;
    END IF;
END $$;

-- ====================================================================
-- 2. ENABLE ROW LEVEL SECURITY WITH PUBLIC ACCESS
-- ====================================================================

-- Enable RLS on all tables
DO $$
BEGIN
    EXECUTE 'ALTER TABLE products ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE categories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE brands ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE product_images ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inventory ENABLE ROW LEVEL SECURITY';
    
    -- Create RLS policies for public read access
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Public can view products') THEN
        EXECUTE 'CREATE POLICY "Public can view products" ON products FOR SELECT USING (is_published = true AND status = ''active'')';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants' AND policyname = 'Public can view variants') THEN
        EXECUTE 'CREATE POLICY "Public can view variants" ON product_variants FOR SELECT USING (true)';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Public can view categories') THEN
        EXECUTE 'CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (is_active = true)';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brands' AND policyname = 'Public can view brands') THEN
        EXECUTE 'CREATE POLICY "Public can view brands" ON brands FOR SELECT USING (is_active = true)';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_images' AND policyname = 'Public can view images') THEN
        EXECUTE 'CREATE POLICY "Public can view images" ON product_images FOR SELECT USING (true)';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory' AND policyname = 'Public can view inventory') THEN
        EXECUTE 'CREATE POLICY "Public can view inventory" ON inventory FOR SELECT USING (quantity > 0)';
    END IF;
END $$;

-- ====================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_deal ON products(is_deal) WHERE is_deal = true;
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_price ON product_variants(price);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available) WHERE available > 0;

-- ====================================================================
-- 4. ENSURE SITE SETTINGS EXIST
-- ====================================================================

INSERT INTO site_settings (key, value, description) VALUES
    ('currency', '"KES"', 'Default currency for the store'),
    ('tax_rate', '0.16', 'Default VAT rate for Kenya (16%)'),
    ('store_name', '"Xarastore"', 'Name of the e-commerce store'),
    ('store_description', '"Kenya''s premier online marketplace for quality products at amazing deals"', 'Store description'),
    ('contact_email', '"support@xarastore.com"', 'Primary contact email'),
    ('contact_phone', '"0700 000 000"', 'Customer support phone number'),
    ('shipping_enabled', 'true', 'Whether shipping is enabled'),
    ('free_shipping_threshold', '2000', 'Minimum order amount for free shipping in KES')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ====================================================================
-- 5. SEED CATEGORIES (Hierarchical Structure)
-- ====================================================================

WITH category_data AS (
    SELECT * FROM (VALUES
        -- Level 1 Categories
        ('electronics', 'Electronics & Gadgets', NULL, 'Latest electronics, smartphones, laptops, and gadgets'),
        ('fashion', 'Fashion & Clothing', NULL, 'Trendy clothing, shoes, and accessories for all'),
        ('home-living', 'Home & Living', NULL, 'Everything for your home and daily living'),
        ('beauty', 'Beauty & Personal Care', NULL, 'Beauty products, skincare, and personal care'),
        ('baby-kids', 'Baby & Kids', NULL, 'Products for babies, toddlers, and children'),
        ('travel', 'Travel & Luggage', NULL, 'Luggage, travel accessories, and gear'),
        ('luxury', 'Luxury & Premium', NULL, 'High-end luxury products and premium items'),
        ('bathroom', 'Bathroom Essentials', NULL, 'Bathroom fixtures, accessories, and essentials'),
        ('accessories', 'Accessories', NULL, 'Fashion and lifestyle accessories'),
        ('wardrobe', 'Wardrobe Collections', NULL, 'Curated clothing collections and outfits')
    ) AS t(slug, name, parent_slug, description)
)
INSERT INTO categories (slug, name, parent_id, description, is_active)
SELECT 
    cd.slug,
    cd.name,
    p.id as parent_id,
    cd.description,
    true
FROM category_data cd
LEFT JOIN categories p ON p.slug = cd.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Level 2 Categories
WITH subcategory_data AS (
    SELECT * FROM (VALUES
        -- Electronics subcategories
        ('smartphones', 'Smartphones', 'electronics', 'Latest smartphones from top brands'),
        ('laptops', 'Laptops & Computers', 'electronics', 'Laptops, desktops, and computer accessories'),
        ('tv-audio', 'TV & Audio', 'electronics', 'Televisions, speakers, and audio systems'),
        ('home-appliances', 'Home Appliances', 'electronics', 'Household appliances and electronics'),
        ('gaming', 'Gaming', 'electronics', 'Gaming consoles, accessories, and games'),
        ('cameras', 'Cameras & Photography', 'electronics', 'Cameras, lenses, and photography gear'),
        
        -- Fashion subcategories
        ('mens-clothing', 'Men''s Clothing', 'fashion', 'Clothing for men including shirts, pants, and suits'),
        ('womens-clothing', 'Women''s Clothing', 'fashion', 'Clothing for women including dresses, tops, and skirts'),
        ('shoes', 'Shoes', 'fashion', 'Footwear for all occasions'),
        ('bags', 'Bags & Luggage', 'fashion', 'Handbags, backpacks, and travel bags'),
        ('jewelry', 'Jewelry & Watches', 'fashion', 'Fine jewelry, watches, and accessories'),
        ('accessories', 'Fashion Accessories', 'fashion', 'Belts, hats, scarves, and other accessories'),
        
        -- Home & Living subcategories
        ('furniture', 'Furniture', 'home-living', 'Home and office furniture'),
        ('kitchen', 'Kitchen & Dining', 'home-living', 'Kitchen appliances, utensils, and dining sets'),
        ('bedding', 'Bedding & Bath', 'home-living', 'Bed sheets, pillows, and bath linens'),
        ('home-decor', 'Home Decor', 'home-living', 'Home decoration items and accents'),
        ('lighting', 'Lighting', 'home-living', 'Indoor and outdoor lighting solutions'),
        ('garden', 'Garden & Outdoor', 'home-living', 'Outdoor furniture and garden supplies'),
        
        -- Beauty subcategories
        ('skincare', 'Skincare', 'beauty', 'Face creams, serums, and skincare products'),
        ('makeup', 'Makeup', 'beauty', 'Cosmetics and makeup products'),
        ('fragrances', 'Fragrances', 'beauty', 'Perfumes and colognes'),
        ('hair-care', 'Hair Care', 'beauty', 'Shampoos, conditioners, and hair treatments'),
        ('personal-care', 'Personal Care', 'beauty', 'Personal hygiene and care products'),
        
        -- Baby & Kids subcategories
        ('baby-clothing', 'Baby Clothing', 'baby-kids', 'Clothing for babies and toddlers'),
        ('baby-gear', 'Baby Gear', 'baby-kids', 'Strollers, car seats, and nursery furniture'),
        ('toys', 'Toys & Games', 'baby-kids', 'Educational toys and games for children'),
        ('feeding', 'Feeding', 'baby-kids', 'Baby feeding supplies and accessories'),
        ('safety', 'Safety', 'baby-kids', 'Baby safety products and monitors'),
        
        -- Bathroom Essentials subcategories
        ('bath-fixtures', 'Bath Fixtures', 'bathroom', 'Showers, bathtubs, and bathroom fixtures'),
        ('vanities', 'Vanities & Mirrors', 'bathroom', 'Bathroom vanities and mirrors'),
        ('toilets', 'Toilets & Bidets', 'bathroom', 'Toilets, bidets, and accessories'),
        ('bath-accessories', 'Bath Accessories', 'bathroom', 'Towels, mats, and bathroom accessories'),
        ('plumbing', 'Plumbing', 'bathroom', 'Pipes, faucets, and plumbing supplies')
    ) AS t(slug, name, parent_slug, description)
)
INSERT INTO categories (slug, name, parent_id, description, is_active)
SELECT 
    sd.slug,
    sd.name,
    p.id as parent_id,
    sd.description,
    true
FROM subcategory_data sd
JOIN categories p ON p.slug = sd.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id,
    updated_at = NOW();

-- ====================================================================
-- 6. SEED BRANDS
-- ====================================================================

INSERT INTO brands (slug, name, description, is_active) VALUES
    ('samsung', 'Samsung', 'Global leader in electronics and mobile technology', true),
    ('apple', 'Apple', 'Premium consumer electronics and technology', true),
    ('lg', 'LG', 'Innovative home appliances and electronics', true),
    ('sony', 'Sony', 'Premium audio, video, and gaming products', true),
    ('bosch', 'Bosch', 'German engineering for home appliances and tools', true),
    ('dell', 'Dell', 'Reliable computing solutions and laptops', true),
    ('hp', 'HP', 'Computers, printers, and accessories', true),
    ('nike', 'Nike', 'World leader in athletic footwear and apparel', true),
    ('adidas', 'Adidas', 'Performance and lifestyle sportswear', true),
    ('levis', 'Levi''s', 'Iconic American denim and clothing', true),
    ('zara', 'Zara', 'Trendy fast fashion and clothing', true),
    ('h-m', 'H&M', 'Affordable fashion and home goods', true),
    ('ikea', 'IKEA', 'Affordable and stylish home furniture', true),
    ('toyota', 'Toyota', 'Reliable automotive and accessories', true),
    ('nestle', 'Nestlé', 'Nutrition, health, and wellness products', true),
    ('coca-cola', 'Coca-Cola', 'Beverages and refreshments', true),
    ('unilever', 'Unilever', 'Home, personal care, and food products', true),
    ('gucci', 'Gucci', 'Italian luxury fashion house', true),
    ('rolex', 'Rolex', 'Swiss luxury watchmaker', true),
    ('versace', 'Versace', 'Italian luxury fashion company', true),
    ('nivea', 'Nivea', 'Skincare and personal care products', true),
    ('loreal', 'L''Oréal', 'Beauty and cosmetics leader', true),
    ('pampers', 'Pampers', 'Baby care products and diapers', true),
    ('gerber', 'Gerber', 'Baby food and products', true),
    ('hasbro', 'Hasbro', 'Toys, games, and entertainment', true),
    ('lego', 'LEGO', 'Creative building toys and games', true),
    ('samsonite', 'Samsonite', 'Premium luggage and travel gear', true),
    ('american-tourister', 'American Tourister', 'Durable and stylish luggage', true),
    ('miele', 'Miele', 'German premium domestic appliances', true),
    ('whirlpool', 'Whirlpool', 'Home appliances and laundry solutions', true),
    ('philips', 'Philips', 'Health technology and personal care', true),
    ('oral-b', 'Oral-B', 'Oral hygiene products and electric toothbrushes', true),
    ('braun', 'Braun', 'Personal care and grooming products', true),
    ('dyson', 'Dyson', 'Innovative vacuum cleaners and appliances', true),
    ('kitchenaid', 'KitchenAid', 'Premium kitchen appliances', true),
    ('kenwood', 'Kenwood', 'Kitchen appliances and food processors', true),
    ('tupperware', 'Tupperware', 'Food storage and kitchen products', true),
    ('pyrex', 'Pyrex', 'Heat-resistant glassware and bakeware', true),
    ('corelle', 'Corelle', 'Durable dinnerware and tableware', true),
    ('seiko', 'Seiko', 'Japanese watches and timepieces', true),
    ('casio', 'Casio', 'Electronic watches and calculators', true),
    ('fossil', 'Fossil', 'Fashion watches and accessories', true),
    ('swatch', 'Swatch', 'Swiss watches and fashion accessories', true),
    ('ray-ban', 'Ray-Ban', 'Iconic sunglasses and eyewear', true),
    ('oakley', 'Oakley', 'Performance sunglasses and gear', true),
    ('puma', 'Puma', 'Sportswear and athletic shoes', true),
    ('under-armour', 'Under Armour', 'Performance athletic apparel', true),
    ('new-balance', 'New Balance', 'Athletic footwear and apparel', true),
    ('converse', 'Converse', 'Iconic sneakers and casual footwear', true),
    ('vans', 'Vans', 'Skateboarding shoes and apparel', true),
    ('reebok', 'Reebok', 'Fitness and training products', true),
    ('asics', 'ASICS', 'Running shoes and athletic gear', true),
    ('skechers', 'Skechers', 'Comfort footwear and casual shoes', true),
    ('clarks', 'Clarks', 'Comfort footwear and dress shoes', true),
    ('timberland', 'Timberland', 'Outdoor footwear and apparel', true),
    ('dr-martens', 'Dr. Martens', 'Iconic boots and footwear', true),
    ('birkenstock', 'Birkenstock', 'Comfort sandals and footwear', true),
    ('crocs', 'Crocs', 'Comfort clogs and casual footwear', true),
    ('ugg', 'UGG', 'Sheepskin boots and casual footwear', true),
    ('steve-madden', 'Steve Madden', 'Fashion footwear and accessories', true),
    ('aldo', 'Aldo', 'Affordable fashion footwear and accessories', true),
    ('nine-west', 'Nine West', 'Women''s footwear and accessories', true),
    ('calvin-klein', 'Calvin Klein', 'Fashion and lifestyle brand', true),
    ('tommy-hilfiger', 'Tommy Hilfiger', 'American premium lifestyle brand', true),
    ('ralph-lauren', 'Ralph Lauren', 'American fashion lifestyle brand', true),
    ('michael-kors', 'Michael Kors', 'Luxury fashion and accessories', true),
    ('coach', 'Coach', 'American luxury fashion house', true),
    ('kate-spade', 'Kate Spade', 'Fashion accessories and handbags', true),
    ('tory-burch', 'Tory Burch', 'American lifestyle brand', true),
    ('burberry', 'Burberry', 'British luxury fashion house', true),
    ('chanel', 'Chanel', 'French luxury fashion house', true),
    ('dior', 'Dior', 'French luxury goods company', true),
    ('louis-vuitton', 'Louis Vuitton', 'French luxury fashion house', true),
    ('prada', 'Prada', 'Italian luxury fashion house', true),
    ('armani', 'Armani', 'Italian luxury fashion house', true),
    ('versace', 'Versace', 'Italian luxury fashion company', true),
    ('dolce-gabbana', 'Dolce & Gabbana', 'Italian luxury fashion house', true),
    ('fendi', 'Fendi', 'Italian luxury fashion house', true),
    ('givenchy', 'Givenchy', 'French luxury fashion house', true),
    ('ysl', 'Yves Saint Laurent', 'French luxury fashion house', true),
    ('balenciaga', 'Balenciaga', 'French luxury fashion house', true),
    ('celine', 'Céline', 'French luxury fashion house', true),
    ('chloe', 'Chloé', 'French luxury fashion house', true),
    ('hermes', 'Hermès', 'French luxury goods manufacturer', true),
    ('cartier', 'Cartier', 'French luxury goods manufacturer', true),
    ('tiffany', 'Tiffany & Co.', 'American luxury jewelry company', true),
    ('bulgari', 'Bulgari', 'Italian luxury goods company', true),
    ('swarovski', 'Swarovski', 'Austrian crystal manufacturer', true),
    ('pandora', 'Pandora', 'Danish jewelry manufacturer and retailer', true),
    ('victorias-secret', 'Victoria''s Secret', 'American lingerie retailer', true),
    ('la-senza', 'La Senza', 'Canadian lingerie retailer', true),
    ('maidenform', 'Maidenform', 'American intimate apparel company', true),
    ('wonderbra', 'Wonderbra', 'Push-up bra brand', true),
    ('hanes', 'Hanes', 'American clothing manufacturer', true),
    ('fruit-of-the-loom', 'Fruit of the Loom', 'American clothing manufacturer', true),
    ('jockey', 'Jockey', 'American underwear manufacturer', true),
    ('calvin-klein-underwear', 'Calvin Klein Underwear', 'Luxury underwear brand', true),
    ('tommy-hilfiger-underwear', 'Tommy Hilfiger Underwear', 'Premium underwear brand', true),
    ('hugo-boss', 'Hugo Boss', 'German luxury fashion house', true),
    ('boss', 'BOSS', 'German luxury fashion house', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ====================================================================
-- 7. SEED PRODUCTS WITH REALISTIC DATA
-- ====================================================================

-- Electronics Products
WITH product_inserts AS (
    INSERT INTO products (slug, name, description, short_description, sku, brand_id, status, is_published, is_featured, is_deal, rating, review_count, meta_title, meta_description, meta_keywords) VALUES
        -- Samsung Galaxy S24 Ultra
        (
            'samsung-galaxy-s24-ultra',
            'Samsung Galaxy S24 Ultra',
            'Experience the pinnacle of smartphone technology with the Samsung Galaxy S24 Ultra. Featuring a stunning 6.8-inch Dynamic AMOLED 2X display with 120Hz refresh rate, powered by the latest Snapdragon 8 Gen 3 processor. Capture professional-grade photos with the 200MP main camera system, enhanced by AI-powered photography features. Includes S Pen integration, 5G connectivity, and all-day battery life with 45W fast charging. Built with Corning Gorilla Glass Victus 2 and titanium frame for ultimate durability.',
            'Flagship smartphone with 200MP camera, S Pen, and titanium build',
            'SM-S928BZKGKFE',
            (SELECT id FROM brands WHERE slug = 'samsung'),
            'active',
            true,
            true,
            true,
            4.8,
            1247,
            'Samsung Galaxy S24 Ultra | Flagship Smartphone | Xarastore',
            'Buy Samsung Galaxy S24 Ultra with 200MP camera, S Pen, and titanium build. Best prices in Kenya with warranty.',
            ARRAY['samsung', 'galaxy s24 ultra', 'smartphone', 'android', 'flagship phone', '200mp camera']
        ),
        -- LG OLED TV 65"
        (
            'lg-oled65c3pua-65-inch-4k-smart-tv',
            'LG OLED65C3PUA 65" 4K Smart TV',
            'Immerse yourself in breathtaking picture quality with the LG OLED65C3PUA 65-inch 4K Smart TV. Featuring self-lit OLED pixels for perfect blacks and infinite contrast, supported by the α9 Gen6 AI Processor 4K for enhanced picture and sound. Includes Dolby Vision IQ and Dolby Atmos for cinematic experience, webOS 23 with Magic Remote, and HDMI 2.1 for gaming with NVIDIA G-SYNC and FreeSync Premium. Thin bezel design with gallery mode for artwork display.',
            '65-inch OLED 4K Smart TV with AI processing and Dolby Atmos',
            'OLED65C3PUA',
            (SELECT id FROM brands WHERE slug = 'lg'),
            'active',
            true,
            true,
            false,
            4.7,
            892,
            'LG 65" OLED 4K Smart TV | Best Picture Quality | Xarastore',
            'LG OLED65C3PUA 65-inch 4K Smart TV with AI processing, Dolby Vision IQ, and webOS 23. Free delivery in Kenya.',
            ARRAY['lg tv', 'oled tv', '4k tv', 'smart tv', '65 inch tv', 'dolby vision']
        ),
        -- Bosch Front Load Washing Machine
        (
            'bosch-was28469ke-front-load-washing-machine',
            'Bosch WAS28469KE Front Load Washing Machine 9kg',
            'German-engineered efficiency meets innovation with the Bosch WAS28469KE Front Load Washing Machine. Features ActiveWater Plus technology that saves up to 30% water and energy, AntiVibration design for quiet operation, and SpeedPerfect for faster washing. Includes 15 programs with allergy plus and anti-crease functions, 1400 RPM spin speed, and EcoSilence Drive motor with 10-year warranty. A+++ energy rating for maximum efficiency.',
            '9kg front load washing machine with A+++ energy rating and ActiveWater Plus',
            'WAS28469KE',
            (SELECT id FROM brands WHERE slug = 'bosch'),
            'active',
            true,
            false,
            true,
            4.6,
            567,
            'Bosch Front Load Washing Machine 9kg | Energy Efficient | Xarastore',
            'Bosch WAS28469KE 9kg front load washing machine with ActiveWater Plus and AntiVibration design. Best prices in Kenya.',
            ARRAY['bosch', 'washing machine', 'front load', '9kg', 'energy efficient', 'home appliance']
        ),
        -- Apple MacBook Pro 16"
        (
            'apple-macbook-pro-16-inch-m3-max',
            'Apple MacBook Pro 16" M3 Max',
            'Unprecedented performance meets exceptional battery life in the Apple MacBook Pro 16" with M3 Max chip. Featuring a 16-core CPU, 40-core GPU, and 16-core Neural Engine for pro-level workflows. Stunning Liquid Retina XDR display with Extreme Dynamic Range, 120Hz ProMotion technology, and up to 22 hours of battery life. Includes 48GB unified memory, 1TB SSD storage, six-speaker sound system with Spatial Audio, and advanced connectivity with three Thunderbolt 4 ports, HDMI, and SDXC slot.',
            '16-inch MacBook Pro with M3 Max chip, 48GB RAM, 1TB SSD',
            'Z1C40003W',
            (SELECT id FROM brands WHERE slug = 'apple'),
            'active',
            true,
            true,
            false,
            4.9,
            1345,
            'Apple MacBook Pro 16" M3 Max | Professional Laptop | Xarastore',
            'Apple MacBook Pro 16-inch with M3 Max chip, 48GB RAM, 1TB SSD. Best prices for professional laptops in Kenya.',
            ARRAY['macbook pro', 'apple', 'm3 max', '16 inch laptop', 'professional laptop', 'macbook']
        ),
        -- Sony WH-1000XM5 Headphones
        (
            'sony-wh-1000xm5-wireless-noise-cancelling-headphones',
            'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
            'Experience the ultimate in noise cancellation with Sony WH-1000XM5 headphones. Featuring industry-leading noise cancellation with Dual Noise Sensor technology, 30-hour battery life with quick charging, and exceptional sound quality with LDAC support. Includes Speak-to-Chat technology, Multipoint connection, and premium comfort with soft fit leather. Voice pickup with precise beamforming microphones for crystal clear calls.',
            'Premium wireless noise cancelling headphones with 30-hour battery',
            'WH1000XM5/B',
            (SELECT id FROM brands WHERE slug = 'sony'),
            'active',
            true,
            true,
            true,
            4.8,
            987,
            'Sony WH-1000XM5 Noise Cancelling Headphones | Premium Audio | Xarastore',
            'Sony WH-1000XM5 wireless noise cancelling headphones with 30-hour battery and LDAC support. Free delivery in Kenya.',
            ARRAY['sony', 'headphones', 'noise cancelling', 'wireless', 'audio', 'wh-1000xm5']
        )
    RETURNING id, slug
)
SELECT id, slug FROM product_inserts;

-- Insert remaining products
INSERT INTO products (slug, name, description, short_description, sku, brand_id, status, is_published, is_featured, is_deal, rating, review_count, meta_title, meta_description, meta_keywords) VALUES
    -- Dell XPS 15 Laptop
    (
        'dell-xps-15-9530-laptop',
        'Dell XPS 15 9530 Laptop',
        'Professional performance meets stunning design with the Dell XPS 15 9530. Features Intel Core i9-13900H processor, NVIDIA GeForce RTX 4070 graphics, and 32GB DDR5 RAM. 15.6-inch OLED 3.5K touch display with 100% DCI-P3 color, InfinityEdge design with 92.9% screen-to-body ratio. Includes 1TB PCIe NVMe SSD, Windows 11 Pro, premium aluminum chassis, and exceptional battery life.',
        '15.6-inch OLED laptop with Intel i9 and RTX 4070 graphics',
        'XPS9530-7392SLV-PUS',
        (SELECT id FROM brands WHERE slug = 'dell'),
        'active',
        true,
        true,
        false,
        4.7,
        456,
        'Dell XPS 15 Laptop | OLED Display | Premium Performance',
        'Dell XPS 15 9530 with Intel i9, RTX 4070, 32GB RAM, and OLED display. Best prices for premium laptops in Kenya.',
        ARRAY['dell', 'xps 15', 'laptop', 'oled', 'intel i9', 'rtx 4070']
    ),
    -- Nike Air Max 270
    (
        'nike-air-max-270-mens-running-shoes',
        'Nike Air Max 270 Mens Running Shoes',
        'Experience all-day comfort with the Nike Air Max 270. Features the tallest Air unit yet for maximum cushioning, breathable mesh upper, and rubber outsole for durable traction. Signature Max Air cushioning in the heel, foam midsole, and sock-like fit. Perfect for running, training, or casual wear with bold style that pays homage to Air Max lineage.',
        'Mens running shoes with tallest Air unit for maximum cushioning',
        'AH8050-002',
        (SELECT id FROM brands WHERE slug = 'nike'),
        'active',
        true,
        false,
        true,
        4.5,
        789,
        'Nike Air Max 270 | Mens Running Shoes | Maximum Cushioning',
        'Nike Air Max 270 mens running shoes with tallest Air unit for all-day comfort. Best prices in Kenya.',
        ARRAY['nike', 'air max', 'running shoes', 'mens shoes', 'athletic shoes']
    ),
    -- Wooden Dining Table 6-Seater
    (
        'solid-oak-dining-table-6-seater',
        'Solid Oak Dining Table 6-Seater',
        'Crafted from premium solid oak, this 6-seater dining table combines timeless elegance with exceptional durability. Features a natural wood grain finish, tapered legs for stability, and dimensions of 200cm x 100cm x 75cm. Treated with protective lacquer for stain resistance and easy maintenance. Perfect for family dining, entertaining guests, or as a centerpiece for your dining room.',
        'Solid oak dining table seating 6 people with natural wood finish',
        'DT-OAK-200-6',
        (SELECT id FROM brands WHERE slug = 'ikea'),
        'active',
        true,
        false,
        false,
        4.6,
        234,
        'Solid Oak Dining Table 6-Seater | Premium Wood Furniture',
        'Solid oak dining table seating 6 people. Handcrafted premium furniture with free delivery in Kenya.',
        ARRAY['dining table', 'oak furniture', '6 seater', 'wood table', 'home furniture']
    ),
    -- Baby Stroller Travel System
    (
        'graco-modes-pramette-travel-system',
        'Graco Modes Pramette Travel System',
        'Complete travel solution for your baby with the Graco Modes Pramette Travel System. Features 10 riding options including infant car seat, pramette, and toddler stroller modes. One-hand fold for easy storage, adjustable handle, and extra-large storage basket. Includes SnugRide 35 Lite Elite infant car seat with 3-position recline and Simply Safe Adjust Harness System. Meets EU safety standards with energy-absorbing foam.',
        'Complete travel system with 10 riding options and infant car seat',
        '1868834',
        (SELECT id FROM brands WHERE slug = 'graber'),
        'active',
        true,
        true,
        true,
        4.7,
        567,
        'Graco Baby Stroller Travel System | 10 Riding Options | EU Safety',
        'Graco Modes Pramette Travel System with infant car seat and 10 riding options. Meets EU safety standards.',
        ARRAY['baby stroller', 'travel system', 'graco', 'infant car seat', 'pram', 'baby gear']
    ),
    -- Luxury Bed Linen Set
    (
        'egyptian-cotton-bed-linen-set-1000-thread-count',
        'Egyptian Cotton Bed Linen Set 1000 Thread Count',
        'Experience ultimate luxury with this 1000 thread count Egyptian cotton bed linen set. Made from extra-long staple cotton fibers for exceptional softness and durability. Includes duvet cover, fitted sheet, pillowcases, and decorative pillows. Features sateen weave for silky smooth feel, reinforced stitching, and fade-resistant colors. Hypoallergenic and breathable for comfortable sleep all year round.',
        '1000 thread count Egyptian cotton bed linen set with sateen weave',
        'ECS-1000-KING',
        (SELECT id FROM brands WHERE slug = 'calvin-klein'),
        'active',
        true,
        false,
        false,
        4.8,
        345,
        'Egyptian Cotton Bed Linen Set | 1000 Thread Count | Luxury Bedding',
        '1000 thread count Egyptian cotton bed linen set with sateen weave. Premium luxury bedding for your bedroom.',
        ARRAY['bed linen', 'egyptian cotton', '1000 thread count', 'luxury bedding', 'bed sheets']
    ),
    -- Bathroom Mixer Tap Chrome
    (
        'grohe-eurosmart-bathroom-mixer-tap-chrome',
        'Grohe Eurosmart Bathroom Mixer Tap Chrome',
        'German-engineered precision meets elegant design with the Grohe Eurosmart Bathroom Mixer Tap. Features SilkMove ceramic cartridge for smooth operation and drip-free performance, QuickClean anti-lime system, and water-saving flow rate of 5.7L/min. Made from brass with chrome finish, includes 2-year warranty. Suitable for all standard bathroom basins with easy installation.',
        'German bathroom mixer tap with ceramic cartridge and chrome finish',
        '32715001',
        (SELECT id FROM brands WHERE slug = 'grohe'),
        'active',
        true,
        false,
        true,
        4.6,
        189,
        'Grohe Bathroom Mixer Tap | German Quality | Chrome Finish',
        'Grohe Eurosmart bathroom mixer tap with ceramic cartridge and chrome finish. German engineering for lasting quality.',
        ARRAY['bathroom tap', 'mixer tap', 'grohe', 'chrome', 'bathroom fixtures']
    ),
    -- Mens Formal Leather Shoes
    (
        'cole-haan-mens-grand-wingtip-oxfords',
        'Cole Haan Mens Grand Wingtip Oxfords',
        'Sophisticated style meets modern comfort with Cole Haan Grand Wingtip Oxfords. Features genuine leather upper with classic wingtip design, Grand.OS comfort technology with lightweight cushioning, and rubber outsole for flexibility. Leather lining, padded collar, and removable footbed. Perfect for formal occasions, business meetings, or special events.',
        'Mens formal leather oxford shoes with wingtip design',
        '25402',
        (SELECT id FROM brands WHERE slug = 'cole-haan'),
        'active',
        true,
        false,
        false,
        4.5,
        278,
        'Cole Haan Mens Formal Leather Shoes | Wingtip Oxfords',
        'Cole Haan mens formal leather oxford shoes with wingtip design and comfort technology. Premium dress shoes.',
        ARRAY['mens shoes', 'leather shoes', 'formal shoes', 'oxfords', 'dress shoes']
    ),
    -- Womens Office Blazer
    (
        'ann-taylor-womens-stretch-wool-blazer',
        'Ann Taylor Womens Stretch Wool Blazer',
        'Professional elegance with all-day comfort in the Ann Taylor Stretch Wool Blazer. Made from premium wool blend with stretch for freedom of movement, featuring notched lapels, flap pockets, and single-button closure. Lined construction, rear vent, and functional sleeve buttons. Perfect for office wear, business meetings, or professional events.',
        'Womens stretch wool blazer for professional office wear',
        'AT661',
        (SELECT id FROM brands WHERE slug = 'ann-taylor'),
        'active',
        true,
        true,
        false,
        4.4,
        156,
        'Ann Taylor Womens Office Blazer | Stretch Wool | Professional',
        'Ann Taylor womens stretch wool blazer for professional office wear. Premium quality with perfect fit.',
        ARRAY['womens blazer', 'office wear', 'wool blazer', 'professional', 'business attire']
    ),
    -- Travel Suitcase Hard Shell
    (
        'samsonite-winfield-3-hardside-luggage-28-inch',
        'Samsonite Winfield 3 Hardside Luggage 28"',
        'Travel with confidence using Samsonite Winfield 3 Hardside Luggage. Made from 100% polycarbonate for durability and lightweight design, features 4 multi-directional spinner wheels, TSA-approved combination lock, and push-button handle system. Includes interior cross straps, divider, and multiple packing compartments. Scratch-resistant finish and 10-year global warranty.',
        '28-inch hard shell suitcase with spinner wheels and TSA lock',
        '90931-3017',
        (SELECT id FROM brands WHERE slug = 'samsonite'),
        'active',
        true,
        false,
        true,
        4.7,
        432,
        'Samsonite Hard Shell Suitcase 28" | Spinner Wheels | Travel',
        'Samsonite Winfield 3 28-inch hard shell suitcase with spinner wheels and TSA lock. Durable travel luggage.',
        ARRAY['suitcase', 'luggage', 'samsonite', 'hard shell', 'travel', 'spinner wheels']
    ),
    -- KitchenAid Stand Mixer
    (
        'kitchenaid-artisan-series-5-quart-stand-mixer',
        'KitchenAid Artisan Series 5-Quart Stand Mixer',
        'Professional-grade performance for home bakers with the KitchenAid Artisan Stand Mixer. Features 5-quart stainless steel bowl, 10-speed control, and planetary mixing action for consistent results. Includes flat beater, dough hook, and wire whip attachments. Tilt-head design for easy access, solid metal construction, and multiple color options. 1-year warranty with optional attachments available.',
        '5-quart stand mixer with 10 speeds and multiple attachments',
        'KSM150PS',
        (SELECT id FROM brands WHERE slug = 'kitchenaid'),
        'active',
        true,
        true,
        false,
        4.9,
        987,
        'KitchenAid Stand Mixer 5-Quart | Professional Baking',
        'KitchenAid Artisan Series 5-quart stand mixer with 10 speeds and attachments. Perfect for home baking.',
        ARRAY['kitchenaid', 'stand mixer', 'baking', 'kitchen appliance', 'mixer']
    ),
    -- Dyson V15 Detect Cordless Vacuum
    (
        'dyson-v15-detect-cordless-vacuum-cleaner',
        'Dyson V15 Detect Cordless Vacuum Cleaner',
        'Intelligent cleaning with laser detection in the Dyson V15 Detect Cordless Vacuum. Features laser dust detection to reveal hidden dust, acoustic piezo sensor for particle measurement, and 240AW suction power. Includes HEPA filtration, 60-minute run time, and LCD screen showing performance metrics. Comes with multiple attachments for whole-home cleaning.',
        'Cordless vacuum with laser dust detection and 240AW suction',
        '408422-01',
        (SELECT id FROM brands WHERE slug = 'dyson'),
        'active',
        true,
        true,
        true,
        4.8,
        654,
        'Dyson V15 Detect Cordless Vacuum | Laser Dust Detection',
        'Dyson V15 Detect cordless vacuum with laser dust detection and HEPA filtration. Advanced cleaning technology.',
        ARRAY['dyson', 'vacuum cleaner', 'cordless', 'hepa', 'cleaning']
    ),
    -- Canon EOS R6 Mark II Camera
    (
        'canon-eos-r6-mark-ii-mirrorless-camera',
        'Canon EOS R6 Mark II Mirrorless Camera',
        'Professional photography and videography with the Canon EOS R6 Mark II. Features 24.2MP full-frame CMOS sensor, DIGIC X processor, and 40fps continuous shooting. Includes in-body image stabilization up to 8 stops, 6K RAW video recording, and dual pixel CMOS AF II with subject detection. Weather-sealed construction, dual card slots, and vari-angle touchscreen.',
        '24.2MP full-frame mirrorless camera with 40fps shooting',
        '3022C002',
        (SELECT id FROM brands WHERE slug = 'canon'),
        'active',
        true,
        true,
        false,
        4.7,
        321,
        'Canon EOS R6 Mark II | Mirrorless Camera | Professional',
        'Canon EOS R6 Mark II 24.2MP full-frame mirrorless camera with 40fps shooting. Professional photography gear.',
        ARRAY['canon', 'camera', 'mirrorless', 'eos r6', 'photography']
    ),
    -- Philips Sonicare Toothbrush
    (
        'philips-sonicare-diamondclean-smart-toothbrush',
        'Philips Sonicare DiamondClean Smart Toothbrush',
        'Advanced oral care with the Philips Sonicare DiamondClean Smart Toothbrush. Features connected app for personalized coaching, 5 cleaning modes, and 31,000 brush movements per minute. Includes pressure sensor, quadpacer, and smarttimer. Comes with premium travel case, charger glass, and multiple brush heads. Removes up to 10x more plaque than manual brushing.',
        'Smart electric toothbrush with app connectivity and 5 modes',
        'HX9924/14',
        (SELECT id FROM brands WHERE slug = 'philips'),
        'active',
        true,
        false,
        true,
        4.6,
        543,
        'Philips Sonicare Toothbrush | Smart Electric Toothbrush',
        'Philips Sonicare DiamondClean Smart electric toothbrush with app connectivity. Advanced oral care technology.',
        ARRAY['philips', 'toothbrush', 'electric', 'sonicare', 'oral care']
    ),
    -- Luxury Leather Handbag
    (
        'michael-kors-jet-set-travel-large-tote',
        'Michael Kors Jet Set Travel Large Tote',
        'Sophisticated style meets practical design with the Michael Kors Jet Set Travel Tote. Made from saffiano leather with polished gold-tone hardware, features open top with zip closure, interior zip pocket, and cell phone slot. Adjustable shoulder straps, MK logo charm, and spacious interior for daily essentials. Perfect for work, travel, or everyday use.',
        'Large leather tote bag with saffiano leather and gold hardware',
        '35T4GTTT3L',
        (SELECT id FROM brands WHERE slug = 'michael-kors'),
        'active',
        true,
        true,
        false,
        4.5,
        234,
        'Michael Kors Leather Tote Bag | Luxury Handbag',
        'Michael Kors Jet Set Travel large tote bag made from saffiano leather. Luxury handbag for women.',
        ARRAY['handbag', 'tote bag', 'michael kors', 'leather', 'luxury bag']
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    brand_id = EXCLUDED.brand_id,
    updated_at = NOW();

-- ====================================================================
-- 8. LINK PRODUCTS TO CATEGORIES
-- ====================================================================

INSERT INTO product_categories (product_id, category_id, is_primary)
SELECT 
    p.id,
    c.id,
    CASE 
        WHEN c.slug = 'smartphones' AND p.slug LIKE '%samsung%' THEN true
        WHEN c.slug = 'tv-audio' AND p.slug LIKE '%lg%tv%' THEN true
        WHEN c.slug = 'home-appliances' AND p.slug LIKE '%washing%' THEN true
        WHEN c.slug = 'laptops' AND p.slug LIKE '%macbook%' THEN true
        WHEN c.slug = 'cameras' AND p.slug LIKE '%canon%' THEN true
        WHEN c.slug = 'shoes' AND p.slug LIKE '%nike%' THEN true
        WHEN c.slug = 'furniture' AND p.slug LIKE '%dining%table%' THEN true
        WHEN c.slug = 'baby-gear' AND p.slug LIKE '%stroller%' THEN true
        WHEN c.slug = 'bedding' AND p.slug LIKE '%bed%linen%' THEN true
        WHEN c.slug = 'bath-fixtures' AND p.slug LIKE '%bathroom%tap%' THEN true
        WHEN c.slug = 'mens-clothing' AND p.slug LIKE '%mens%shoes%' THEN true
        WHEN c.slug = 'womens-clothing' AND p.slug LIKE '%womens%blazer%' THEN true
        WHEN c.slug = 'bags' AND p.slug LIKE '%suitcase%' THEN true
        WHEN c.slug = 'kitchen' AND p.slug LIKE '%kitchenaid%' THEN true
        WHEN c.slug = 'home-appliances' AND p.slug LIKE '%dyson%' THEN true
        WHEN c.slug = 'cameras' AND p.slug LIKE '%camera%' THEN true
        WHEN c.slug = 'personal-care' AND p.slug LIKE '%toothbrush%' THEN true
        WHEN c.slug = 'bags' AND p.slug LIKE '%handbag%' THEN true
        ELSE false
    END
FROM products p
CROSS JOIN categories c
WHERE 
    -- Samsung Galaxy S24 Ultra categories
    (p.slug = 'samsung-galaxy-s24-ultra' AND c.slug IN ('smartphones', 'electronics', 'luxury')) OR
    -- LG TV categories
    (p.slug = 'lg-oled65c3pua-65-inch-4k-smart-tv' AND c.slug IN ('tv-audio', 'electronics', 'home-living')) OR
    -- Bosch Washing Machine categories
    (p.slug = 'bosch-was28469ke-front-load-washing-machine' AND c.slug IN ('home-appliances', 'electronics', 'home-living')) OR
    -- MacBook Pro categories
    (p.slug = 'apple-macbook-pro-16-inch-m3-max' AND c.slug IN ('laptops', 'electronics', 'luxury')) OR
    -- Sony Headphones categories
    (p.slug = 'sony-wh-1000xm5-wireless-noise-cancelling-headphones' AND c.slug IN ('tv-audio', 'electronics', 'accessories')) OR
    -- Dell Laptop categories
    (p.slug = 'dell-xps-15-9530-laptop' AND c.slug IN ('laptops', 'electronics')) OR
    -- Nike Shoes categories
    (p.slug = 'nike-air-max-270-mens-running-shoes' AND c.slug IN ('shoes', 'fashion', 'accessories')) OR
    -- Dining Table categories
    (p.slug = 'solid-oak-dining-table-6-seater' AND c.slug IN ('furniture', 'home-living', 'kitchen')) OR
    -- Baby Stroller categories
    (p.slug = 'graco-modes-pramette-travel-system' AND c.slug IN ('baby-gear', 'baby-kids', 'travel')) OR
    -- Bed Linen categories
    (p.slug = 'egyptian-cotton-bed-linen-set-1000-thread-count' AND c.slug IN ('bedding', 'home-living', 'luxury')) OR
    -- Bathroom Tap categories
    (p.slug = 'grohe-eurosmart-bathroom-mixer-tap-chrome' AND c.slug IN ('bath-fixtures', 'bathroom', 'home-living')) OR
    -- Mens Shoes categories
    (p.slug = 'cole-haan-mens-grand-wingtip-oxfords' AND c.slug IN ('shoes', 'fashion', 'mens-clothing')) OR
    -- Womens Blazer categories
    (p.slug = 'ann-taylor-womens-stretch-wool-blazer' AND c.slug IN ('womens-clothing', 'fashion', 'accessories')) OR
    -- Suitcase categories
    (p.slug = 'samsonite-winfield-3-hardside-luggage-28-inch' AND c.slug IN ('bags', 'travel', 'accessories')) OR
    -- KitchenAid categories
    (p.slug = 'kitchenaid-artisan-series-5-quart-stand-mixer' AND c.slug IN ('kitchen', 'home-living', 'home-appliances')) OR
    -- Dyson Vacuum categories
    (p.slug = 'dyson-v15-detect-cordless-vacuum-cleaner' AND c.slug IN ('home-appliances', 'home-living')) OR
    -- Canon Camera categories
    (p.slug = 'canon-eos-r6-mark-ii-mirrorless-camera' AND c.slug IN ('cameras', 'electronics', 'luxury')) OR
    -- Philips Toothbrush categories
    (p.slug = 'philips-sonicare-diamondclean-smart-toothbrush' AND c.slug IN ('personal-care', 'beauty', 'home-living')) OR
    -- Michael Kors Bag categories
    (p.slug = 'michael-kors-jet-set-travel-large-tote' AND c.slug IN ('bags', 'fashion', 'luxury', 'accessories'))
ON CONFLICT (product_id, category_id) DO NOTHING;

-- ====================================================================
-- 9. SEED PRODUCT VARIANTS WITH REALISTIC PRICING IN KES
-- ====================================================================

DO $$
DECLARE
    product_record RECORD;
    variant_skus TEXT[] := ARRAY[
        'SM-S928BZKGBK', 'SM-S928BZKGSV', 'SM-S928BZKGGN', 'SM-S928BZKGBL',
        'OLED65C3PUA-BK', 'OLED65C3PUA-SL',
        'WAS28469KE-WT', 'WAS28469KE-BK',
        'Z1C40003W-256', 'Z1C40003W-512', 'Z1C40003W-1TB',
        'WH1000XM5-BK', 'WH1000XM5-SV', 'WH1000XM5-BL',
        'XPS9530-7392SLV-16', 'XPS9530-7392SLV-32',
        'AH8050-002-10', 'AH8050-002-11', 'AH8050-002-12', 'AH8050-002-13',
        'DT-OAK-200-6-NAT', 'DT-OAK-200-6-WLN',
        '1868834-BLK', '1868834-GRY', '1868834-BLU',
        'ECS-1000-KING-WH', 'ECS-1000-KING-IV', 'ECS-1000-KING-GRY',
        '32715001-CH', '32715001-BR',
        '25402-BK-10', '25402-BK-11', '25402-BRN-10', '25402-BRN-11',
        'AT661-BLK-6', 'AT661-BLK-8', 'AT661-BLK-10', 'AT661-BLK-12',
        '90931-3017-BK', '90931-3017-BLU', '90931-3017-GRY',
        'KSM150PS-EMP', 'KSM150PS-BLK', 'KSM150PS-RED',
        '408422-01-GOLD', '408422-01-NKL',
        '3022C002-BODY', '3022C002-KIT',
        'HX9924/14-WH', 'HX9924/14-BLK',
        '35T4GTTT3L-BLK', '35T4GTTT3L-CML'
    ];
    variant_counter INTEGER := 1;
BEGIN
    FOR product_record IN SELECT id, slug FROM products ORDER BY created_at LOOP
        -- Insert 2-4 variants per product with realistic pricing
        FOR i IN 1..(2 + (random() * 2)::INTEGER) LOOP
            INSERT INTO product_variants (
                product_id,
                sku,
                name,
                attributes,
                price,
                compare_at_price,
                currency,
                weight,
                is_default,
                position
            ) VALUES (
                product_record.id,
                variant_skus[variant_counter],
                CASE 
                    WHEN product_record.slug LIKE '%samsung%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Phantom Black 256GB'
                            WHEN 2 THEN 'Silver 512GB'
                            WHEN 3 THEN 'Green 1TB'
                            WHEN 4 THEN 'Blue 256GB'
                        END
                    WHEN product_record.slug LIKE '%lg%tv%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'Silver'
                        END
                    WHEN product_record.slug LIKE '%bosch%' THEN 
                        CASE i 
                            WHEN 1 THEN 'White'
                            WHEN 2 THEN 'Black'
                        END
                    WHEN product_record.slug LIKE '%macbook%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Space Gray 16GB/256GB'
                            WHEN 2 THEN 'Silver 32GB/512GB'
                            WHEN 3 THEN 'Space Gray 48GB/1TB'
                        END
                    WHEN product_record.slug LIKE '%sony%headphones%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'Silver'
                            WHEN 3 THEN 'Blue'
                        END
                    WHEN product_record.slug LIKE '%dell%laptop%' THEN 
                        CASE i 
                            WHEN 1 THEN '16GB RAM/512GB SSD'
                            WHEN 2 THEN '32GB RAM/1TB SSD'
                        END
                    WHEN product_record.slug LIKE '%nike%shoes%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Size 10'
                            WHEN 2 THEN 'Size 11'
                            WHEN 3 THEN 'Size 12'
                            WHEN 4 THEN 'Size 13'
                        END
                    WHEN product_record.slug LIKE '%dining%table%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Natural Finish'
                            WHEN 2 THEN 'Walnut Finish'
                        END
                    WHEN product_record.slug LIKE '%stroller%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'Gray'
                            WHEN 3 THEN 'Blue'
                        END
                    WHEN product_record.slug LIKE '%bed%linen%' THEN 
                        CASE i 
                            WHEN 1 THEN 'White'
                            WHEN 2 THEN 'Ivory'
                            WHEN 3 THEN 'Gray'
                        END
                    WHEN product_record.slug LIKE '%bathroom%tap%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Chrome'
                            WHEN 2 THEN 'Brushed Nickel'
                        END
                    WHEN product_record.slug LIKE '%mens%shoes%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black Size 10'
                            WHEN 2 THEN 'Black Size 11'
                            WHEN 3 THEN 'Brown Size 10'
                            WHEN 4 THEN 'Brown Size 11'
                        END
                    WHEN product_record.slug LIKE '%womens%blazer%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black Size 6'
                            WHEN 2 THEN 'Black Size 8'
                            WHEN 3 THEN 'Black Size 10'
                            WHEN 4 THEN 'Black Size 12'
                        END
                    WHEN product_record.slug LIKE '%suitcase%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'Blue'
                            WHEN 3 THEN 'Gray'
                        END
                    WHEN product_record.slug LIKE '%kitchenaid%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Empire Red'
                            WHEN 2 THEN 'Black'
                            WHEN 3 THEN 'Candy Apple Red'
                        END
                    WHEN product_record.slug LIKE '%dyson%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Gold'
                            WHEN 2 THEN 'Nickel'
                        END
                    WHEN product_record.slug LIKE '%canon%camera%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Body Only'
                            WHEN 2 THEN 'Kit with 24-105mm Lens'
                        END
                    WHEN product_record.slug LIKE '%philips%toothbrush%' THEN 
                        CASE i 
                            WHEN 1 THEN 'White'
                            WHEN 2 THEN 'Black'
                        END
                    WHEN product_record.slug LIKE '%michael%kors%bag%' THEN 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'Camel'
                        END
                    ELSE 'Standard'
                END,
                CASE 
                    WHEN product_record.slug LIKE '%samsung%' THEN 
                        jsonb_build_object('color', 
                            CASE i 
                                WHEN 1 THEN 'Phantom Black'
                                WHEN 2 THEN 'Silver'
                                WHEN 3 THEN 'Green'
                                WHEN 4 THEN 'Blue'
                            END,
                            'storage', 
                            CASE i 
                                WHEN 1 THEN '256GB'
                                WHEN 2 THEN '512GB'
                                WHEN 3 THEN '1TB'
                                WHEN 4 THEN '256GB'
                            END)
                    WHEN product_record.slug LIKE '%shoes%' THEN 
                        jsonb_build_object('size', 
                            CASE i 
                                WHEN 1 THEN '10'
                                WHEN 2 THEN '11'
                                WHEN 3 THEN '12'
                                WHEN 4 THEN '13'
                            END,
                            'color', 'Black')
                    WHEN product_record.slug LIKE '%blazer%' THEN 
                        jsonb_build_object('size', 
                            CASE i 
                                WHEN 1 THEN '6'
                                WHEN 2 THEN '8'
                                WHEN 3 THEN '10'
                                WHEN 4 THEN '12'
                            END,
                            'color', 'Black')
                    ELSE jsonb_build_object('color', 
                        CASE i 
                            WHEN 1 THEN 'Black'
                            WHEN 2 THEN 'White'
                            WHEN 3 THEN 'Gray'
                            WHEN 4 THEN 'Blue'
                        END)
                END,
                CASE product_record.slug
                    WHEN 'samsung-galaxy-s24-ultra' THEN 184999.00 + ((i-1) * 20000.00)
                    WHEN 'lg-oled65c3pua-65-inch-4k-smart-tv' THEN 259999.00
                    WHEN 'bosch-was28469ke-front-load-washing-machine' THEN 89999.00
                    WHEN 'apple-macbook-pro-16-inch-m3-max' THEN 549999.00 + ((i-1) * 150000.00)
                    WHEN 'sony-wh-1000xm5-wireless-noise-cancelling-headphones' THEN 34999.00
                    WHEN 'dell-xps-15-9530-laptop' THEN 299999.00 + ((i-1) * 50000.00)
                    WHEN 'nike-air-max-270-mens-running-shoes' THEN 12999.00
                    WHEN 'solid-oak-dining-table-6-seater' THEN 45999.00
                    WHEN 'graco-modes-pramette-travel-system' THEN 64999.00
                    WHEN 'egyptian-cotton-bed-linen-set-1000-thread-count' THEN 28999.00
                    WHEN 'grohe-eurosmart-bathroom-mixer-tap-chrome' THEN 15999.00
                    WHEN 'cole-haan-mens-grand-wingtip-oxfords' THEN 18999.00
                    WHEN 'ann-taylor-womens-stretch-wool-blazer' THEN 15999.00
                    WHEN 'samsonite-winfield-3-hardside-luggage-28-inch' THEN 24999.00
                    WHEN 'kitchenaid-artisan-series-5-quart-stand-mixer' THEN 89999.00
                    WHEN 'dyson-v15-detect-cordless-vacuum-cleaner' THEN 79999.00
                    WHEN 'canon-eos-r6-mark-ii-mirrorless-camera' THEN 329999.00 + ((i-1) * 50000.00)
                    WHEN 'philips-sonicare-diamondclean-smart-toothbrush' THEN 19999.00
                    WHEN 'michael-kors-jet-set-travel-large-tote' THEN 24999.00
                    ELSE 9999.00
                END,
                CASE product_record.slug
                    WHEN 'samsung-galaxy-s24-ultra' THEN 199999.00 + ((i-1) * 20000.00)
                    WHEN 'lg-oled65c3pua-65-inch-4k-smart-tv' THEN 279999.00
                    WHEN 'bosch-was28469ke-front-load-washing-machine' THEN 94999.00
                    WHEN 'apple-macbook-pro-16-inch-m3-max' THEN 579999.00 + ((i-1) * 150000.00)
                    WHEN 'sony-wh-1000xm5-wireless-noise-cancelling-headphones' THEN 37999.00
                    WHEN 'dell-xps-15-9530-laptop' THEN 319999.00 + ((i-1) * 50000.00)
                    WHEN 'nike-air-max-270-mens-running-shoes' THEN 14999.00
                    WHEN 'solid-oak-dining-table-6-seater' THEN 49999.00
                    WHEN 'graco-modes-pramette-travel-system' THEN 69999.00
                    WHEN 'egyptian-cotton-bed-linen-set-1000-thread-count' THEN 31999.00
                    WHEN 'grohe-eurosmart-bathroom-mixer-tap-chrome' THEN 17999.00
                    WHEN 'cole-haan-mens-grand-wingtip-oxfords' THEN 20999.00
                    WHEN 'ann-taylor-womens-stretch-wool-blazer' THEN 17999.00
                    WHEN 'samsonite-winfield-3-hardside-luggage-28-inch' THEN 27999.00
                    WHEN 'kitchenaid-artisan-series-5-quart-stand-mixer' THEN 94999.00
                    WHEN 'dyson-v15-detect-cordless-vacuum-cleaner' THEN 84999.00
                    WHEN 'canon-eos-r6-mark-ii-mirrorless-camera' THEN 349999.00 + ((i-1) * 50000.00)
                    WHEN 'philips-sonicare-diamondclean-smart-toothbrush' THEN 22999.00
                    WHEN 'michael-kors-jet-set-travel-large-tote' THEN 27999.00
                    ELSE 11999.00
                END,
                'KES',
                CASE 
                    WHEN product_record.slug LIKE '%samsung%' THEN 0.228
                    WHEN product_record.slug LIKE '%laptop%' THEN 2.2
                    WHEN product_record.slug LIKE '%tv%' THEN 28.5
                    WHEN product_record.slug LIKE '%washing%' THEN 68.0
                    WHEN product_record.slug LIKE '%shoes%' THEN 0.85
                    WHEN product_record.slug LIKE '%table%' THEN 45.0
                    WHEN product_record.slug LIKE '%stroller%' THEN 12.5
                    WHEN product_record.slug LIKE '%suitcase%' THEN 5.8
                    ELSE 3.5
                END,
                i = 1,
                i
            ) ON CONFLICT (sku) DO UPDATE SET
                price = EXCLUDED.price,
                compare_at_price = EXCLUDED.compare_at_price,
                updated_at = NOW();
            
            variant_counter := variant_counter + 1;
            IF variant_counter > array_length(variant_skus, 1) THEN
                variant_counter := 1;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ====================================================================
-- 10. SEED PRODUCT IMAGES WITH REAL IMAGE URLs
-- ====================================================================

DO $$
DECLARE
    product_record RECORD;
    image_urls TEXT[][] := ARRAY[
        -- Samsung Galaxy S24 Ultra
        ARRAY[
            'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&h=1200&fit=crop'
        ],
        -- LG TV
        ARRAY[
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&h=800&fit=crop'
        ],
        -- Bosch Washing Machine
        ARRAY[
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1551228336-4c6c4e0c5d1c?w=1200&h=1200&fit=crop'
        ],
        -- MacBook Pro
        ARRAY[
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&h=1200&fit=crop'
        ],
        -- Sony Headphones
        ARRAY[
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1200&h=1200&fit=crop'
        ],
        -- Dell Laptop
        ARRAY[
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&h=1200&fit=crop'
        ],
        -- Nike Shoes
        ARRAY[
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&h=1200&fit=crop'
        ],
        -- Dining Table
        ARRAY[
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1565791380713-4d4c6c5c1b4c?w=1200&h=800&fit=crop'
        ],
        -- Baby Stroller
        ARRAY[
            'https://images.unsplash.com/photo-1505410603996-3becb0218bd5?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1530836369250-ef72a3f5c1c3?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=800&fit=crop'
        ],
        -- Bed Linen
        ARRAY[
            'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&h=800&fit=crop'
        ],
        -- Bathroom Tap
        ARRAY[
            'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1552324192-e4c5c5b5b5c5?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&fit=crop'
        ],
        -- Mens Shoes
        ARRAY[
            'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&h=1200&fit=crop'
        ],
        -- Womens Blazer
        ARRAY[
            'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=1200&h=1200&fit=crop'
        ],
        -- Suitcase
        ARRAY[
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1546961329-78bef0414d7c?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&h=800&fit=crop'
        ],
        -- KitchenAid Mixer
        ARRAY[
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1551228336-4c6c4e0c5d1c?w=1200&h=1200&fit=crop'
        ],
        -- Dyson Vacuum
        ARRAY[
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1551228336-4c6c4e0c5d1c?w=1200&h=1200&fit=crop'
        ],
        -- Canon Camera
        ARRAY[
            'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=1200&h=800&fit=crop'
        ],
        -- Philips Toothbrush
        ARRAY[
            'https://images.unsplash.com/photo-1565598621680-94c48b04e56f?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1594736797933-d0d64d1fe48a?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1621600411689-5d3d3e7d5e1c?w=1200&h=800&fit=crop'
        ],
        -- Michael Kors Bag
        ARRAY[
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&h=1200&fit=crop',
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&h=1200&fit=crop'
        ]
    ];
    image_counter INTEGER := 1;
BEGIN
    FOR product_record IN SELECT id, slug FROM products ORDER BY created_at LOOP
        FOR i IN 1..3 LOOP
            INSERT INTO product_images (product_id, url, alt_text, position, is_primary) VALUES (
                product_record.id,
                image_urls[image_counter][i],
                CASE 
                    WHEN product_record.slug LIKE '%samsung%' THEN 'Samsung Galaxy S24 Ultra smartphone'
                    WHEN product_record.slug LIKE '%lg%tv%' THEN 'LG 65-inch 4K OLED Smart TV'
                    WHEN product_record.slug LIKE '%bosch%' THEN 'Bosch front load washing machine'
                    WHEN product_record.slug LIKE '%macbook%' THEN 'Apple MacBook Pro 16-inch laptop'
                    WHEN product_record.slug LIKE '%sony%headphones%' THEN 'Sony wireless noise cancelling headphones'
                    WHEN product_record.slug LIKE '%dell%laptop%' THEN 'Dell XPS 15 laptop'
                    WHEN product_record.slug LIKE '%nike%shoes%' THEN 'Nike Air Max 270 running shoes'
                    WHEN product_record.slug LIKE '%dining%table%' THEN 'Solid oak dining table 6-seater'
                    WHEN product_record.slug LIKE '%stroller%' THEN 'Graco baby stroller travel system'
                    WHEN product_record.slug LIKE '%bed%linen%' THEN 'Egyptian cotton bed linen set'
                    WHEN product_record.slug LIKE '%bathroom%tap%' THEN 'Grohe bathroom mixer tap'
                    WHEN product_record.slug LIKE '%mens%shoes%' THEN 'Cole Haan mens formal leather shoes'
                    WHEN product_record.slug LIKE '%womens%blazer%' THEN 'Ann Taylor womens office blazer'
                    WHEN product_record.slug LIKE '%suitcase%' THEN 'Samsonite hard shell suitcase'
                    WHEN product_record.slug LIKE '%kitchenaid%' THEN 'KitchenAid stand mixer'
                    WHEN product_record.slug LIKE '%dyson%' THEN 'Dyson cordless vacuum cleaner'
                    WHEN product_record.slug LIKE '%canon%camera%' THEN 'Canon EOS R6 Mark II camera'
                    WHEN product_record.slug LIKE '%philips%toothbrush%' THEN 'Philips Sonicare electric toothbrush'
                    WHEN product_record.slug LIKE '%michael%kors%bag%' THEN 'Michael Kors leather handbag'
                    ELSE 'Product image'
                END,
                i,
                i = 1
            ) ON CONFLICT DO NOTHING;
        END LOOP;
        image_counter := image_counter + 1;
        IF image_counter > array_length(image_urls, 1) THEN
            image_counter := 1;
        END IF;
    END LOOP;
END $$;

-- ====================================================================
-- 11. SEED INVENTORY WITH REALISTIC STOCK COUNTS
-- ====================================================================

INSERT INTO inventory (product_id, variant_id, sku, quantity, low_stock_threshold, warehouse_location)
SELECT 
    pv.product_id,
    pv.id as variant_id,
    pv.sku,
    CASE 
        WHEN p.slug LIKE '%samsung%' THEN 47
        WHEN p.slug LIKE '%lg%tv%' THEN 23
        WHEN p.slug LIKE '%bosch%' THEN 18
        WHEN p.slug LIKE '%macbook%' THEN 15
        WHEN p.slug LIKE '%sony%headphones%' THEN 89
        WHEN p.slug LIKE '%dell%laptop%' THEN 32
        WHEN p.slug LIKE '%nike%shoes%' THEN 156
        WHEN p.slug LIKE '%dining%table%' THEN 12
        WHEN p.slug LIKE '%stroller%' THEN 27
        WHEN p.slug LIKE '%bed%linen%' THEN 84
        WHEN p.slug LIKE '%bathroom%tap%' THEN 45
        WHEN p.slug LIKE '%mens%shoes%' THEN 67
        WHEN p.slug LIKE '%womens%blazer%' THEN 92
        WHEN p.slug LIKE '%suitcase%' THEN 58
        WHEN p.slug LIKE '%kitchenaid%' THEN 36
        WHEN p.slug LIKE '%dyson%' THEN 41
        WHEN p.slug LIKE '%canon%camera%' THEN 19
        WHEN p.slug LIKE '%philips%toothbrush%' THEN 123
        WHEN p.slug LIKE '%michael%kors%bag%' THEN 76
        ELSE 50
    END,
    5,
    CASE 
        WHEN random() < 0.33 THEN 'Nairobi Warehouse A'
        WHEN random() < 0.66 THEN 'Mombasa Distribution Center'
        ELSE 'Kisumu Storage Facility'
    END
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
ON CONFLICT (sku) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

-- ====================================================================
-- 12. CREATE TRIGGER FOR UPDATED_AT TIMESTAMPS
-- ====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 13. FINAL VERIFICATION AND ASSERTIONS
-- ====================================================================

DO $$
DECLARE
    product_count INTEGER;
    variant_count INTEGER;
    category_count INTEGER;
    brand_count INTEGER;
    image_count INTEGER;
    inventory_count INTEGER;
    low_inventory_count INTEGER;
BEGIN
    -- Count all seeded data
    SELECT COUNT(*) INTO product_count FROM products WHERE is_published = true AND status = 'active';
    SELECT COUNT(*) INTO variant_count FROM product_variants;
    SELECT COUNT(*) INTO category_count FROM categories WHERE is_active = true;
    SELECT COUNT(*) INTO brand_count FROM brands WHERE is_active = true;
    SELECT COUNT(*) INTO image_count FROM product_images;
    SELECT COUNT(*) INTO inventory_count FROM inventory WHERE quantity > 0;
    SELECT COUNT(*) INTO low_inventory_count FROM inventory WHERE available <= low_stock_threshold AND available > 0;

    -- Assert minimum requirements
    IF product_count < 10 THEN
        RAISE EXCEPTION 'FAIL: Insufficient products seeded. Expected >=10, got %', product_count;
    END IF;

    IF variant_count < 20 THEN
        RAISE EXCEPTION 'FAIL: Insufficient variants seeded. Expected >=20, got %', variant_count;
    END IF;

    IF category_count < 20 THEN
        RAISE EXCEPTION 'FAIL: Insufficient categories seeded. Expected >=20, got %', category_count;
    END IF;

    IF brand_count < 20 THEN
        RAISE EXCEPTION 'FAIL: Insufficient brands seeded. Expected >=20, got %', brand_count;
    END IF;

    IF image_count < 30 THEN
        RAISE EXCEPTION 'FAIL: Insufficient product images seeded. Expected >=30, got %', image_count;
    END IF;

    IF inventory_count < 20 THEN
        RAISE EXCEPTION 'FAIL: Insufficient inventory items seeded. Expected >=20, got %', inventory_count;
    END IF;

    -- Verify products have categories
    IF NOT EXISTS (
        SELECT 1 FROM product_categories pc
        JOIN products p ON p.id = pc.product_id
        WHERE p.is_published = true
        GROUP BY pc.product_id
        HAVING COUNT(*) >= 1
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'FAIL: Products are not linked to categories';
    END IF;

    -- Verify all seeded products have at least one variant
    IF EXISTS (
        SELECT 1 FROM products p
        WHERE p.is_published = true
        AND NOT EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv.product_id = p.id
        )
    ) THEN
        RAISE EXCEPTION 'FAIL: Some published products have no variants';
    END IF;

    -- Verify all variants have inventory
    IF EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE NOT EXISTS (
            SELECT 1 FROM inventory i
            WHERE i.variant_id = pv.id
        )
    ) THEN
        RAISE EXCEPTION 'FAIL: Some variants have no inventory';
    END IF;

    -- Log success metrics
    RAISE NOTICE '✅ SEED SUCCESSFUL';
    RAISE NOTICE '📦 Products: % (all published and active)', product_count;
    RAISE NOTICE '🎯 Variants: % (with pricing in KES)', variant_count;
    RAISE NOTICE '📁 Categories: % (hierarchical structure)', category_count;
    RAISE NOTICE '🏷️  Brands: % (active manufacturers)', brand_count;
    RAISE NOTICE '🖼️  Images: % (high-quality product photos)', image_count;
    RAISE NOTICE '📦 Inventory: % (items in stock)', inventory_count;
    RAISE NOTICE '⚠️  Low Stock Items: % (needs replenishment)', low_inventory_count;
    RAISE NOTICE '';
    RAISE NOTICE '🌐 All products are now publicly visible on the website';
    RAISE NOTICE '💰 All prices are in Kenyan Shillings (KES)';
    RAISE NOTICE '🔒 RLS policies are active for public read access';
    RAISE NOTICE '🚀 Database is ready for production traffic';
END $$;

COMMIT;
