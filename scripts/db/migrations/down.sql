--xarastore/scripts/db/migrations/down.sql

-- Xarastore Database Migration - DOWN
-- This file rolls back all changes made by the up.sql migration
-- Use with caution - this will destroy all data and schema

-- Disable triggers first
SET session_replication_role = replica;

-- ==================== DROP TABLES IN REVERSE ORDER ====================

-- Drop audit logs
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Drop system tables
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- Drop analytics tables
DROP TABLE IF EXISTS search_queries CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;

-- Drop content management tables
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS pages CASCADE;

-- Drop discounts & promotions
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS discount_coupons CASCADE;

-- Drop payment tables
DROP TABLE IF EXISTS mpesa_transactions CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;

-- Drop reviews & ratings
DROP TABLE IF EXISTS review_votes CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;

-- Drop cart & wishlist
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS shopping_carts CASCADE;

-- Drop order management tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Drop user tables
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop product tables
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ==================== DROP FUNCTIONS & TRIGGERS ====================

-- Drop custom functions
DROP FUNCTION IF EXISTS update_user_stats_after_order() CASCADE;
DROP FUNCTION IF EXISTS update_stock_after_order() CASCADE;
DROP FUNCTION IF EXISTS check_stock_before_order() CASCADE;
DROP FUNCTION IF EXISTS update_brand_product_count() CASCADE;
DROP FUNCTION IF EXISTS update_category_product_count() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS update_product_review_stats() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS order_number_seq;

-- ==================== DROP TYPES ====================

DROP TYPE IF EXISTS product_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- ==================== DROP EXTENSIONS ====================

DROP EXTENSION IF EXISTS citext CASCADE;
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- ==================== CLEANUP ====================

-- Reset session replication role
SET session_replication_role = DEFAULT;

-- Notify completion
DO $$ 
BEGIN
    RAISE NOTICE '⚠️  Database migration rolled back successfully';
    RAISE NOTICE 'All tables, data, and schema have been removed';
END $$;
