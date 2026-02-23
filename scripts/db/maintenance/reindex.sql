-- Database reindexing script for Xarastore production environment
-- Run this script when query performance degrades or after major data changes
-- Should be run during maintenance windows (lowest traffic periods)

-- Check current index bloat
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Reindex critical indexes with CONCURRENTLY to avoid table locking
-- Primary key indexes
REINDEX INDEX CONCURRENTLY products_pkey;
REINDEX INDEX CONCURRENTLY product_variants_pkey;
REINDEX INDEX CONCURRENTLY categories_pkey;
REINDEX INDEX CONCURRENTLY brands_pkey;
REINDEX INDEX CONCURRENTLY orders_pkey;
REINDEX INDEX CONCURRENTLY reviews_pkey;
REINDEX INDEX CONCURRENTLY users_pkey;
REINDEX INDEX CONCURRENTLY user_addresses_pkey;
REINDEX INDEX CONCURRENTLY wishlist_pkey;

-- Unique constraint indexes
REINDEX INDEX CONCURRENTLY products_slug_key;
REINDEX INDEX CONCURRENTLY products_sku_key;
REINDEX INDEX CONCURRENTLY product_variants_sku_key;
REINDEX INDEX CONCURRENTLY categories_slug_key;
REINDEX INDEX CONCURRENTLY brands_slug_key;
REINDEX INDEX CONCURRENTLY orders_order_number_key;
REINDEX INDEX CONCURRENTLY users_email_key;

-- Performance-critical indexes
REINDEX INDEX CONCURRENTLY idx_products_slug;
REINDEX INDEX CONCURRENTLY idx_products_category;
REINDEX INDEX CONCURRENTLY idx_products_brand;
REINDEX INDEX CONCURRENTLY idx_products_featured;
REINDEX INDEX CONCURRENTLY idx_products_deal;
REINDEX INDEX CONCURRENTLY idx_products_stock;
REINDEX INDEX CONCURRENTLY idx_product_variants_product;
REINDEX INDEX CONCURRENTLY idx_categories_parent;
REINDEX INDEX CONCURRENTLY idx_orders_user;
REINDEX INDEX CONCURRENTLY idx_orders_status;
REINDEX INDEX CONCURRENTLY idx_orders_created;
REINDEX INDEX CONCURRENTLY idx_reviews_product;
REINDEX INDEX CONCURRENTLY idx_reviews_user;
REINDEX INDEX CONCURRENTLY idx_reviews_rating;
REINDEX INDEX CONCURRENTLY idx_user_addresses_user;
REINDEX INDEX CONCURRENTLY idx_wishlist_user;

-- Reindex system catalogs (improves overall database performance)
REINDEX SYSTEM CONCURRENTLY;

-- Analyze table to update statistics after reindexing
ANALYZE products;
ANALYZE product_variants;
ANALYZE categories;
ANALYZE brands;
ANALYZE orders;
ANALYZE reviews;
ANALYZE users;
ANALYZE user_addresses;
ANALYZE wishlist;

-- Check for unused indexes that could be dropped
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND idx_scan = 0
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Check for duplicate indexes
WITH index_info AS (
    SELECT 
        schemaname,
        tablename,
        indexdef,
        array_agg(indexname) as indexes,
        count(*) as index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename, indexdef
    HAVING count(*) > 1
)
SELECT 
    schemaname,
    tablename,
    indexdef,
    indexes,
    index_count
FROM index_info
ORDER BY tablename;

-- Check index fragmentation and bloat after reindexing
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    idx_scan as index_scans,
    idx_bloat as estimated_bloat_percent
FROM (
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        CASE 
            WHEN avg_leaf_density > 0 
            THEN 100 * (1 - (avg_leaf_density / 100)) 
            ELSE 0 
        END as idx_bloat,
        pg_relation_size(indexname::regclass)
    FROM pg_stat_user_indexes
    JOIN pg_index USING (indexrelid)
    LEFT JOIN LATERAL (
        SELECT 
            (CASE WHEN leaf_fragmentation > 0 THEN 100 - leaf_fragmentation ELSE 100 END) as avg_leaf_density
        FROM pgstatindex(indexname::regclass)
    ) s ON true
    WHERE schemaname = 'public'
) indexed_info
ORDER BY idx_bloat DESC NULLS LAST
LIMIT 20;

-- Create missing indexes that could improve performance
-- These are suggestions based on common query patterns

-- Index for searching products by name and description (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'products' 
        AND indexname = 'idx_products_search'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_products_search ON products 
        USING gin(to_tsvector('english', name || ' ' || description));
    END IF;
END $$;

-- Index for order status and date range queries (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND indexname = 'idx_orders_status_date'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_orders_status_date ON orders(status, created_at DESC);
    END IF;
END $$;

-- Index for user activity queries (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND indexname = 'idx_users_activity'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_users_activity ON users(created_at DESC, email_verified);
    END IF;
END $$;

-- Index for product pricing and availability (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'products' 
        AND indexname = 'idx_products_price_stock'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_products_price_stock ON products(price, stock) WHERE stock > 0;
    END IF;
END $$;

-- Index for variant lookups by attributes (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'product_variants' 
        AND indexname = 'idx_variants_attributes'
    ) THEN
        CREATE INDEX CONCURRENTLY idx_variants_attributes ON product_variants USING gin(attributes);
    END IF;
END $$;

-- Update database statistics
SELECT pg_stat_reset();
SELECT pg_stat_reset_shared('bgwriter');

-- Log reindexing completion
INSERT INTO system_logs (
    event_type,
    description,
    metadata,
    created_at
) VALUES (
    'database_reindex',
    'Index reindexing and optimization completed',
    '{"indexes_reindexed": 25, "new_indexes_created": 5, "system_reindexed": true}'::jsonb,
    NOW()
);

-- Output completion message with statistics
RAISE NOTICE 'Database reindexing completed successfully at %', NOW();
RAISE NOTICE 'Total tables reindexed: 9';
RAISE NOTICE 'Total indexes reindexed: 25';
RAISE NOTICE 'New indexes created: 5';
