-- Database maintenance script for Xarastore production environment
-- This script should be run during low-traffic periods (e.g., 2-5 AM)
-- Requires appropriate database permissions (admin role)

-- Enable maintenance mode if needed (uncomment if you have a maintenance mode flag)
-- UPDATE system_settings SET maintenance_mode = true WHERE id = 1;

-- Analyze tables to update statistics for query planner
ANALYZE products;
ANALYZE product_variants;
ANALYZE categories;
ANALYZE brands;
ANALYZE orders;
ANALYZE reviews;
ANALYZE users;
ANALYZE user_addresses;
ANALYZE wishlist;

-- Vacuum operations to reclaim storage and update statistics
-- Using VACUUM ANALYZE for optimal performance
VACUUM ANALYZE products;
VACUUM ANALYZE product_variants;
VACUUM ANALYZE categories;
VACUUM ANALYZE brands;
VACUUM ANALYZE orders;
VACUUM ANALYZE reviews;
VACUUM ANALYZE users;
VACUUM ANALYZE user_addresses;
VACUUM ANALYZE wishlist;

-- Vacuum system catalogs (important for overall database health)
VACUUM pg_catalog.pg_class;
VACUUM pg_catalog.pg_attribute;
VACUUM pg_catalog.pg_index;

-- Aggressive vacuum for heavily updated tables (adjust based on your workload)
-- Uncomment if you have high UPDATE/DELETE volume
-- VACUUM FULL products;
-- VACUUM FULL orders;

-- Update table statistics for query optimization
DO $$ 
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
        RAISE NOTICE 'Analyzed table: %.%', table_record.schemaname, table_record.tablename;
    END LOOP;
END $$;

-- Clean up orphaned records (optional, run periodically)
-- Delete orphaned product variants
DELETE FROM product_variants pv
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = pv.product_id
);

-- Delete orphaned reviews
DELETE FROM reviews r
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = r.product_id
)
OR NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = r.user_id
);

-- Delete orphaned wishlist items
DELETE FROM wishlist w
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = w.product_id
)
OR NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = w.user_id
);

-- Delete orphaned user addresses
DELETE FROM user_addresses ua
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = ua.user_id
);

-- Update materialized views if any (uncomment if you use materialized views)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY product_search_index;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY brand_product_counts;

-- Clean up old sessions from auth schema (if you have access)
-- DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '30 days';

-- Update database statistics
SELECT pg_stat_reset();
SELECT pg_stat_reset_shared('bgwriter');
SELECT pg_stat_reset_single_table_counters('products'::regclass);
SELECT pg_stat_reset_single_table_counters('orders'::regclass);

-- Log maintenance completion
INSERT INTO system_logs (
    event_type,
    description,
    metadata,
    created_at
) VALUES (
    'database_maintenance',
    'VACUUM and ANALYZE maintenance completed',
    '{"tables_analyzed": 9, "vacuum_completed": true, "orphaned_records_cleaned": true}'::jsonb,
    NOW()
);

-- Disable maintenance mode if enabled
-- UPDATE system_settings SET maintenance_mode = false WHERE id = 1;

-- Output completion message
RAISE NOTICE 'Database maintenance completed successfully at %', NOW();
