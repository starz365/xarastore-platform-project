-- Performance indexes for Xarastore

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_login ON users(last_login DESC);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- User addresses indexes
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_is_default ON user_addresses(is_default) WHERE is_default = true;
CREATE INDEX idx_user_addresses_country ON user_addresses(country);

-- Categories indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_is_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_product_count ON categories(product_count DESC);

-- Brands indexes
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active) WHERE is_active = true;
CREATE INDEX idx_brands_product_count ON brands(product_count DESC);

-- Products indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_original_price ON products(original_price) WHERE original_price IS NOT NULL;
CREATE INDEX idx_products_rating ON products(rating DESC);
CREATE INDEX idx_products_review_count ON products(review_count DESC);
CREATE INDEX idx_products_total_sold ON products(total_sold DESC);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_is_deal ON products(is_deal) WHERE is_deal = true;
CREATE INDEX idx_products_deal_ends_at ON products(deal_ends_at) WHERE deal_ends_at IS NOT NULL;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_updated_at ON products(updated_at DESC);

-- Full-text search indexes for products
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);

-- Product variants indexes
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_stock ON product_variants(stock);
CREATE INDEX idx_product_variants_is_default ON product_variants(is_default) WHERE is_default = true;
CREATE INDEX idx_product_variants_sort_order ON product_variants(sort_order);

-- Collections indexes
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_is_active ON collections(is_active) WHERE is_active = true;
CREATE INDEX idx_collections_sort_order ON collections(sort_order);

-- Orders indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_updated_at ON orders(updated_at DESC);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);
CREATE INDEX idx_orders_payment_method ON orders(payment_method);
CREATE INDEX idx_orders_shipping_method ON orders(shipping_method);
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;

-- Composite indexes for common order queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_payment_status_created ON orders(payment_status, created_at DESC);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_order_items_created_at ON order_items(created_at DESC);

-- Payments indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_reference ON payments(reference) WHERE reference IS NOT NULL;
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_verified ON reviews(is_verified) WHERE is_verified = true;
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved) WHERE is_approved = true;
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Review helpful indexes
CREATE INDEX idx_review_helpful_review_id ON review_helpful(review_id);
CREATE INDEX idx_review_helpful_user_id ON review_helpful(user_id);
CREATE INDEX idx_review_helpful_created_at ON review_helpful(created_at DESC);

-- Wishlist indexes
CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX idx_wishlist_created_at ON wishlist(created_at DESC);

-- Shopping carts indexes
CREATE INDEX idx_shopping_carts_user_id ON shopping_carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shopping_carts_session_id ON shopping_carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_shopping_carts_expires_at ON shopping_carts(expires_at) WHERE expires_at IS NOT NULL;

-- Discounts indexes
CREATE INDEX idx_discounts_code ON discounts(code);
CREATE INDEX idx_discounts_is_active ON discounts(is_active) WHERE is_active = true;
CREATE INDEX idx_discounts_valid_until ON discounts(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX idx_discounts_created_at ON discounts(created_at DESC);

-- Discount usage indexes
CREATE INDEX idx_discount_usage_discount_id ON discount_usage(discount_id);
CREATE INDEX idx_discount_usage_user_id ON discount_usage(user_id);
CREATE INDEX idx_discount_usage_order_id ON discount_usage(order_id);
CREATE INDEX idx_discount_usage_used_at ON discount_usage(used_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_is_sent ON notifications(is_sent) WHERE is_sent = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Search logs indexes
CREATE INDEX idx_search_logs_user_id ON search_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_search_logs_query ON search_logs(query);
CREATE INDEX idx_search_logs_has_results ON search_logs(has_results);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX idx_search_logs_query_trgm ON search_logs USING gin (query gin_trgm_ops);

-- Analytics events indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_country ON analytics_events(country) WHERE country IS NOT NULL;

-- Analytics sessions indexes
CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX idx_analytics_sessions_start_time ON analytics_sessions(start_time DESC);
CREATE INDEX idx_analytics_sessions_duration ON analytics_sessions(duration DESC);
CREATE INDEX idx_analytics_sessions_country ON analytics_sessions(country) WHERE country IS NOT NULL;

-- Inventory logs indexes
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_variant_id ON inventory_logs(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_inventory_logs_change_type ON inventory_logs(change_type);
CREATE INDEX idx_inventory_logs_reference_id ON inventory_logs(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- Price history indexes
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_variant_id ON price_history(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_price_history_created_at ON price_history(created_at DESC);

-- Settings indexes
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_is_public ON settings(is_public) WHERE is_public = true;

-- Email templates indexes
CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active) WHERE is_active = true;

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite indexes for common joins
CREATE INDEX idx_products_category_brand ON products(category_id, brand_id);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_reviews_product_rating ON reviews(product_id, rating DESC);
CREATE INDEX idx_inventory_logs_product_created ON inventory_logs(product_id, created_at DESC);

-- Partial indexes for common conditions
CREATE INDEX idx_products_active_featured ON products(id)
WHERE is_active = true AND is_featured = true;

-- REMOVED: idx_products_active_deals with NOW() - will create a different approach
CREATE INDEX idx_products_active_deals ON products(id, deal_ends_at)
WHERE is_active = true AND is_deal = true;

CREATE INDEX idx_orders_pending_payment ON orders(id)
WHERE status = 'pending' AND payment_status = 'pending';

CREATE INDEX idx_notifications_unread ON notifications(id)
WHERE is_read = false AND is_sent = true;

-- REMOVED: idx_shopping_carts_active with NOW() - index expires_at directly
CREATE INDEX idx_shopping_carts_expires_at_check ON shopping_carts(expires_at);

-- Expression indexes for case-insensitive search
CREATE INDEX idx_products_name_lower ON products(LOWER(name));
CREATE INDEX idx_categories_name_lower ON categories(LOWER(name));
CREATE INDEX idx_brands_name_lower ON brands(LOWER(name));

-- GIN indexes for JSONB columns
CREATE INDEX idx_products_specifications_gin ON products USING gin (specifications);
CREATE INDEX idx_products_attributes_gin ON products USING gin (attributes);
CREATE INDEX idx_product_variants_attributes_gin ON product_variants USING gin (attributes);
CREATE INDEX idx_orders_items_gin ON orders USING gin (items);
CREATE INDEX idx_users_preferences_gin ON users USING gin (preferences);
CREATE INDEX idx_analytics_events_event_data_gin ON analytics_events USING gin (event_data);

-- BRIN indexes for large timestamp-based tables
CREATE INDEX idx_orders_created_at_brin ON orders USING brin (created_at);
CREATE INDEX idx_analytics_events_created_at_brin ON analytics_events USING brin (created_at);
CREATE INDEX idx_audit_logs_created_at_brin ON audit_logs USING brin (created_at);
CREATE INDEX idx_inventory_logs_created_at_brin ON inventory_logs USING brin (created_at);

-- Functional indexes for common queries
CREATE INDEX idx_products_name_tsvector ON products USING gin (to_tsvector('english', name));
CREATE INDEX idx_products_description_tsvector ON products USING gin (to_tsvector('english', description));
