--xarastore/scripts/db/migrations/up.sql

-- Xarastore Database Migration - UP
-- This file contains all database schema changes for new deployments
-- Run this file to create or update the database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create enum types
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'moderator');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'draft', 'archived');

-- ==================== CORE TABLES ====================

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT categories_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Brands table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    product_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT brands_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_brands_is_active ON brands(is_active);
CREATE INDEX idx_brands_sort_order ON brands(sort_order);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    
    -- Pricing
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(12,2) CHECK (compare_at_price >= 0),
    cost_price DECIMAL(12,2) CHECK (cost_price >= 0),
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorders BOOLEAN DEFAULT FALSE,
    
    -- Relations
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    -- Media
    primary_image_url VARCHAR(500),
    image_urls TEXT[], -- Array of image URLs
    
    -- Specifications
    weight_kg DECIMAL(8,3),
    dimensions_cm JSONB, -- {length: x, width: y, height: z}
    specifications JSONB DEFAULT '{}',
    
    -- Status & visibility
    status product_status DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    is_deal BOOLEAN DEFAULT FALSE,
    deal_starts_at TIMESTAMPTZ,
    deal_ends_at TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    search_keywords TEXT[],
    
    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT products_slug_unique UNIQUE (slug),
    CONSTRAINT products_sku_unique UNIQUE (sku),
    CONSTRAINT price_check CHECK (compare_at_price IS NULL OR compare_at_price >= price)
);

-- Product indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_is_deal ON products(is_deal);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_products_published_at ON products(published_at);
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;

-- Product variants table
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    
    -- Pricing
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(12,2) CHECK (compare_at_price >= 0),
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    
    -- Attributes
    attributes JSONB DEFAULT '{}', -- {color: 'red', size: 'M'}
    
    -- Media
    image_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT variants_sku_unique UNIQUE (sku),
    CONSTRAINT variants_price_check CHECK (compare_at_price IS NULL OR compare_at_price >= price)
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_is_active ON product_variants(is_active);
CREATE INDEX idx_variants_stock_quantity ON product_variants(stock_quantity);

-- ==================== USER & AUTH TABLES ====================

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email CITEXT NOT NULL UNIQUE,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    avatar_url VARCHAR(500),
    
    -- Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    language_code VARCHAR(10) DEFAULT 'en',
    currency_code VARCHAR(3) DEFAULT 'KES',
    
    -- Stats
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    CONSTRAINT user_profiles_email_unique UNIQUE (email)
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);

-- User addresses
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Address details
    label VARCHAR(100), -- Home, Work, etc.
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    address_line1 VARCHAR(500) NOT NULL,
    address_line2 VARCHAR(500),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(2) NOT NULL,
    
    -- Default flags
    is_default_shipping BOOLEAN DEFAULT FALSE,
    is_default_billing BOOLEAN DEFAULT FALSE,
    
    -- Geolocation
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Metadata
    instructions TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT only_one_default_shipping EXCLUDE USING gist (
        user_id WITH =,
        is_default_shipping WITH =
    ) WHERE (is_default_shipping),
    CONSTRAINT only_one_default_billing EXCLUDE USING gist (
        user_id WITH =,
        is_default_billing WITH =
    ) WHERE (is_default_billing)
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_country_code ON user_addresses(country_code);
CREATE INDEX idx_user_addresses_is_default_shipping ON user_addresses(is_default_shipping);
CREATE INDEX idx_user_addresses_is_default_billing ON user_addresses(is_default_billing);

-- ==================== ORDER MANAGEMENT ====================

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Customer information
    customer_email CITEXT NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Addresses (denormalized for historical accuracy)
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    
    -- Order items (denormalized)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Pricing
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Payment
    payment_method VARCHAR(100),
    payment_status payment_status DEFAULT 'pending',
    payment_transaction_id VARCHAR(255),
    payment_details JSONB,
    
    -- Shipping
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    estimated_delivery TIMESTAMPTZ,
    
    -- Status
    status order_status DEFAULT 'pending',
    status_history JSONB DEFAULT '[]',
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT orders_order_number_unique UNIQUE (order_number),
    CONSTRAINT total_amount_check CHECK (total_amount = subtotal + shipping_amount + tax_amount - discount_amount)
);

-- Order indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);

-- Order items table (for detailed reporting)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
    -- Product details (denormalized)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    variant_name VARCHAR(255),
    variant_sku VARCHAR(100),
    
    -- Pricing
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
    
    -- Metadata
    image_url VARCHAR(500),
    attributes JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT order_items_total_price_check CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

-- ==================== CART & WISHLIST ====================

-- Shopping carts
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For guest carts
    
    -- Cart items (denormalized for performance)
    items JSONB DEFAULT '[]',
    
    -- Metadata
    currency_code VARCHAR(3) DEFAULT 'KES',
    expires_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT cart_user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);

CREATE INDEX idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX idx_shopping_carts_session_id ON shopping_carts(session_id);
CREATE INDEX idx_shopping_carts_expires_at ON shopping_carts(expires_at);

-- Wishlists
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- Metadata
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT wishlists_user_product_unique UNIQUE (user_id, product_id, variant_id)
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);

-- ==================== REVIEWS & RATINGS ====================

-- Product reviews
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review TEXT NOT NULL,
    images TEXT[], -- Array of image URLs
    
    -- Verification
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Helpfulness
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT one_review_per_product_user UNIQUE (product_id, user_id)
);

CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_is_approved ON product_reviews(is_approved);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at);

-- Review votes
CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT one_vote_per_review_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);

-- ==================== PAYMENT & TRANSACTIONS ====================

-- Payment transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Transaction details transaction_id VARCHAR(255) 
    NOT NULL UNIQUE, provider VARCHAR(50) NOT NULL, -- 
    mpesa, stripe, etc. method VARCHAR(50) NOT NULL, -- 
    mobile_money, card, bank_transfer amount 
    DECIMAL(12,2) NOT NULL CHECK (amount >= 0), 
    currency_code VARCHAR(3) DEFAULT 'KES',
    
    -- Status status VARCHAR(50) NOT NULL, -- pending, 
    completed, failed, refunded status_message TEXT,
    
    -- Provider details provider_reference VARCHAR(255), 
    provider_response JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);

-- M-Pesa transactions (specific to Kenya)
CREATE TABLE mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    
    -- M-Pesa details
    mpesa_receipt_number VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(50),
    transaction_date TIMESTAMPTZ,
    
    -- Amount details
    amount DECIMAL(12,2) NOT NULL,
    account_reference VARCHAR(255),
    transaction_desc VARCHAR(255),
    
    -- M-Pesa response
    result_code VARCHAR(10),
    result_desc VARCHAR(255),
    merchant_request_id VARCHAR(255),
    checkout_request_id VARCHAR(255),
    
    -- Raw data
    raw_request JSONB,
    raw_response JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mpesa_transactions_payment_id ON mpesa_transactions(payment_transaction_id);
CREATE INDEX idx_mpesa_transactions_receipt_number ON mpesa_transactions(mpesa_receipt_number);
CREATE INDEX idx_mpesa_transactions_phone_number ON mpesa_transactions(phone_number);
CREATE INDEX idx_mpesa_transactions_transaction_date ON mpesa_transactions(transaction_date);

-- ==================== DISCOUNTS & PROMOTIONS ====================

-- Discount coupons
CREATE TABLE discount_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Discount type
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value DECIMAL(12,2) NOT NULL CHECK (discount_value >= 0),
    
    -- Limits
    minimum_order_amount DECIMAL(12,2),
    maximum_discount_amount DECIMAL(12,2),
    
    -- Usage limits
    usage_limit INTEGER,
    usage_limit_per_user INTEGER,
    used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Applicability
    applies_to_all_products BOOLEAN DEFAULT TRUE,
    product_ids UUID[], -- If not all products
    category_ids UUID[], -- If specific categories
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT usage_limit_check CHECK (usage_limit IS NULL OR used_count <= usage_limit),
    CONSTRAINT discount_value_check CHECK (
        (discount_type = 'percentage' AND discount_value <= 100) OR
        (discount_type != 'percentage')
    )
);

CREATE INDEX idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX idx_discount_coupons_is_active ON discount_coupons(is_active);
CREATE INDEX idx_discount_coupons_valid_until ON discount_coupons(valid_until);

-- Coupon usage tracking
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES discount_coupons(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Usage details
    discount_amount DECIMAL(12,2) NOT NULL CHECK (discount_amount >= 0),
    
    -- Audit
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT coupon_order_unique UNIQUE (coupon_id, order_id)
);

CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_order_id ON coupon_usage(order_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);

-- ==================== CONTENT MANAGEMENT ====================

-- Pages (for About, Contact, etc.)
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Status is_published BOOLEAN DEFAULT TRUE, 
    published_at TIMESTAMPTZ,
    
    -- Organization sort_order INTEGER DEFAULT 0, 
    parent_page_id UUID REFERENCES pages(id) ON DELETE 
    SET NULL,
    
    -- Audit created_at TIMESTAMPTZ DEFAULT NOW(), 
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_is_published ON pages(is_published);
CREATE INDEX idx_pages_parent_page_id ON pages(parent_page_id);

-- Banners & promotions
CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    
    -- Display settings
    position VARCHAR(50) NOT NULL, -- homepage_hero, sidebar, etc.
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Scheduling
    display_from TIMESTAMPTZ DEFAULT NOW(),
    display_until TIMESTAMPTZ,
    
    -- Targeting
    target_audience JSONB DEFAULT '{}', -- {device: 'mobile', location: 'KE'}
    
    -- Analytics
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_is_active ON banners(is_active);
CREATE INDEX idx_banners_display_until ON banners(display_until);
CREATE INDEX idx_banners_sort_order ON banners(sort_order);

-- ==================== ANALYTICS & TRACKING ====================

-- Page views
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Page details
    path VARCHAR(500) NOT NULL,
    query_params TEXT,
    referrer VARCHAR(500),
    
    -- Device info
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location
    ip_address INET,
    country_code VARCHAR(2),
    city VARCHAR(100),
    
    -- Timing
    view_started_at TIMESTAMPTZ DEFAULT NOW(),
    view_ended_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_created_at ON page_views(created_at);
CREATE INDEX idx_page_views_country_code ON page_views(country_code);

-- Search queries
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Search details
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    sort_by VARCHAR(100),
    
    -- Results
    result_count INTEGER,
    result_ids UUID[],
    
    -- Device & location
    user_agent TEXT,
    ip_address INET,
    
    -- Audit
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_queries_query ON search_queries USING gin (query gin_trgm_ops);
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_searched_at ON search_queries(searched_at);

-- ==================== SYSTEM TABLES ====================

-- System configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_category ON system_config(category);
CREATE INDEX idx_system_config_is_public ON system_config(is_public);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Variables
    variables TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- ==================== AUDIT LOGS ====================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    
    -- Actor
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==================== FUNCTIONS & TRIGGERS ====================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP 
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- Function to update product review statistics
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product review count and average rating
    UPDATE products 
    SET 
        review_count = (
            SELECT COUNT(*) 
            FROM product_reviews 
            WHERE product_id = NEW.product_id 
            AND is_approved = TRUE
        ),
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM product_reviews 
            WHERE product_id = NEW.product_id 
            AND is_approved = TRUE
        )
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_review_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_review_stats();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number = 'ORD-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || 
                          lpad((nextval('order_number_seq') % 10000)::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Function to update category product count
CREATE OR REPLACE FUNCTION update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update old category if product moved
    IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        UPDATE categories 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = OLD.category_id 
            AND status = 'active'
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- Update new category
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        UPDATE categories 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = NEW.category_id 
            AND status = 'active'
        )
        WHERE id = NEW.category_id;
    END IF;
    
    -- Update old category on delete
    IF TG_OP = 'DELETE' THEN
        UPDATE categories 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = OLD.category_id 
            AND status = 'active'
        )
        WHERE id = OLD.category_id;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_category_product_count();

-- Function to update brand product count
CREATE OR REPLACE FUNCTION update_brand_product_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Similar logic to category count update
    IF TG_OP = 'UPDATE' AND OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
        UPDATE brands 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE brand_id = OLD.brand_id 
            AND status = 'active'
        )
        WHERE id = OLD.brand_id;
    END IF;
    
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        UPDATE brands 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE brand_id = NEW.brand_id 
            AND status = 'active'
        )
        WHERE id = NEW.brand_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE brands 
        SET product_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE brand_id = OLD.brand_id 
            AND status = 'active'
        )
        WHERE id = OLD.brand_id;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_product_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_brand_product_count();

-- Function to check stock before order
CREATE OR REPLACE FUNCTION check_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    variant RECORD;
    product RECORD;
    available_stock INTEGER;
BEGIN
    FOR item IN SELECT * FROM jsonb_to_recordset(NEW.items) AS x(
        product_id UUID,
        variant_id UUID,
        quantity INTEGER
    )
    LOOP
        IF item.variant_id IS NOT NULL THEN
            -- Check variant stock
            SELECT stock_quantity, track_inventory 
            INTO variant
            FROM product_variants 
            WHERE id = item.variant_id;
            
            IF variant.track_inventory AND variant.stock_quantity < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for variant %', item.variant_id;
            END IF;
        ELSE
            -- Check product stock
            SELECT stock_quantity, track_inventory 
            INTO product
            FROM products 
            WHERE id = item.product_id;
            
            IF product.track_inventory AND product.stock_quantity < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product %', item.product_id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_stock_before_order_trigger
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION check_stock_before_order();

-- Function to update stock after order
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Restore stock if order cancelled
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            IF item.variant_id IS NOT NULL THEN
                UPDATE product_variants 
                SET stock_quantity = stock_quantity + item.quantity
                WHERE id = item.variant_id;
            ELSE
                UPDATE products 
                SET stock_quantity = stock_quantity + item.quantity
                WHERE id = item.product_id;
            END IF;
        END LOOP;
    ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
        -- Reduce stock if order uncancelled
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            IF item.variant_id IS NOT NULL THEN
                UPDATE product_variants 
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.variant_id;
            ELSE
                UPDATE products 
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.product_id;
            END IF;
        END LOOP;
    ELSIF OLD.status IS NULL AND NEW.status != 'cancelled' THEN
        -- New order, reduce stock
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            IF item.variant_id IS NOT NULL THEN
                UPDATE product_variants 
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.variant_id;
            ELSE
                UPDATE products 
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.product_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_after_order_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_stock_after_order();

-- Function to update user stats after order
CREATE OR REPLACE FUNCTION update_user_stats_after_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE user_profiles 
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount,
            last_order_at = NEW.updated_at
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stats_after_order_trigger
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_order();

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS on all tables
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END;
$$;

-- RLS Policies

-- Products: Public can view active products
CREATE POLICY "Public can view active products" ON products
    FOR SELECT USING (status = 'active' AND is_published = TRUE);

-- Categories: Public can view active categories
CREATE POLICY "Public can view active categories" ON categories
    FOR SELECT USING (is_active = TRUE);

-- Brands: Public can view active brands
CREATE POLICY "Public can view active brands" ON brands
    FOR SELECT USING (is_active = TRUE);

-- Product reviews: Public can view approved reviews
CREATE POLICY "Public can view approved reviews" ON product_reviews
    FOR SELECT USING (is_approved = TRUE);

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can only manage their own addresses
CREATE POLICY "Users can manage own addresses" ON user_addresses
    FOR ALL USING (auth.uid() = user_id);

-- Users can only view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL AND customer_email = auth.email());

-- Users can only manage their own cart
CREATE POLICY "Users can manage own cart" ON shopping_carts
    FOR ALL USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', TRUE));

-- Users can only manage their own wishlist
CREATE POLICY "Users can manage own wishlist" ON wishlists
    FOR ALL USING (auth.uid() = user_id);

-- Users can only view their own payment transactions
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = payment_transactions.order_id 
        AND (orders.user_id = auth.uid() OR orders.customer_email = auth.email())
    ));

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Additional composite indexes for common queries
CREATE INDEX idx_products_search ON products 
    USING gin(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(short_description, '')));

CREATE INDEX idx_products_category_status ON products(category_id, status) 
    WHERE status = 'active';

CREATE INDEX idx_products_brand_status ON products(brand_id, status) 
    WHERE status = 'active';

CREATE INDEX idx_orders_user_status ON orders(user_id, status);

CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);

CREATE INDEX idx_wishlists_user_created ON wishlists(user_id, created_at DESC);

CREATE INDEX idx_product_reviews_product_rating ON product_reviews(product_id, rating DESC) 
    WHERE is_approved = TRUE;

CREATE INDEX idx_shopping_carts_user_updated ON shopping_carts(user_id, updated_at DESC);

-- ==================== INITIAL DATA ====================

-- Insert default categories
INSERT INTO categories (slug, name, description, sort_order) VALUES
    ('electronics', 'Electronics', 'Latest gadgets and electronics', 1),
    ('fashion', 'Fashion', 'Clothing and accessories', 2),
    ('home-garden', 'Home & Garden', 'Home improvement and gardening', 3),
    ('beauty', 'Beauty', 'Cosmetics and personal care', 4),
    ('sports', 'Sports', 'Sports equipment and apparel', 5),
    ('automotive', 'Automotive', 'Car accessories and parts', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert default pages
INSERT INTO pages (slug, title, content, is_published) VALUES
    ('about', 'About Us', '<h1>About Xarastore</h1><p>Your trusted online marketplace for amazing deals.</p>', TRUE),
    ('contact', 'Contact Us', '<h1>Contact Us</h1><p>Get in touch with our team.</p>', TRUE),
    ('terms', 'Terms of Service', '<h1>Terms of Service</h1><p>Our terms and conditions.</p>', TRUE),
    ('privacy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>How we protect your data.</p>', TRUE),
    ('shipping', 'Shipping Policy', '<h1>Shipping Information</h1><p>Delivery details and timelines.</p>', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, config_type, category, description) VALUES
    ('store_name', 'Xarastore', 'string', 'general', 'Store name'),
    ('store_currency', 'KES', 'string', 'general', 'Default currency'),
    ('store_language', 'en', 'string', 'general', 'Default language'),
    ('free_shipping_threshold', '2000', 'number', 'shipping', 'Minimum amount for free shipping'),
    ('tax_rate', '16', 'number', 'tax', 'Default tax rate percentage'),
    ('store_email', 'support@xarastore.com', 'string', 'contact', 'Store contact email'),
    ('store_phone', '+254700000000', 'string', 'contact', 'Store contact phone'),
    ('store_address', 'Nairobi, Kenya', 'string', 'contact', 'Store physical address'),
    ('maintenance_mode', 'false', 'boolean', 'system', 'Maintenance mode status'),
    ('allow_guest_checkout', 'true', 'boolean', 'checkout', 'Allow checkout without account')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, body_html, variables) VALUES
    ('welcome', 'Welcome Email', 'Welcome to Xarastore!', '<h1>Welcome {{name}}!</h1><p>Thank you for joining Xarastore.</p>', ARRAY['name', 'email']),
    ('order_confirmation', 'Order Confirmation', 'Your Order #{{order_number}}', '<h1>Order Confirmed</h1><p>Thank you for your order.</p>', ARRAY['order_number', 'customer_name', 'order_total']),
    ('order_shipped', 'Order Shipped', 'Your Order #{{order_number}} Has Shipped', '<h1>Order Shipped</h1><p>Your order is on the way.</p>', ARRAY['order_number', 'tracking_number', 'estimated_delivery']),
    ('password_reset', 'Password Reset', 'Reset Your Password', '<h1>Password Reset</h1><p>Click the link to reset your password.</p>', ARRAY['reset_link', 'expires_in'])
ON CONFLICT (template_key) DO NOTHING;

-- ==================== FINAL SETUP ====================

-- Create admin user (if not exists)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@xarastore.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "System Administrator"}',
    NOW(),
    NOW(),
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO user_profiles (
    id,
    email,
    full_name
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@xarastore.com',
    'System Administrator'
) ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create comments for documentation
COMMENT ON SCHEMA public IS 'Xarastore E-commerce Database Schema';
COMMENT ON TABLE products IS 'Main products catalog with inventory tracking';
COMMENT ON TABLE orders IS 'Customer orders with payment and shipping details';
COMMENT ON TABLE user_profiles IS 'Extended user profiles for e-commerce functionality';

-- Vacuum analyze for optimal performance
VACUUM ANALYZE;

-- Migration complete
DO $$ 
BEGIN
    RAISE NOTICE '✅ Database migration completed successfully';
END $$;
