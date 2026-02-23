-- Row Level Security (RLS) Policies for Xarastore

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions (RLS policies will control access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User addresses policies
CREATE POLICY "Users can view own addresses" ON user_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own addresses" ON user_addresses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all addresses" ON user_addresses
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage categories" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Brands policies (public read, admin write)
CREATE POLICY "Anyone can view brands" ON brands
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage brands" ON brands
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Products policies (public read active products, admin write)
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage products" ON products
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Product variants policies (public read, admin write)
CREATE POLICY "Anyone can view product variants" ON product_variants
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage product variants" ON product_variants
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Collections policies (public read active, admin write)
CREATE POLICY "Anyone can view active collections" ON collections
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage collections" ON collections
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Orders policies (users see own, admins see all)
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending orders" ON orders
    FOR UPDATE USING (
        auth.uid() = user_id
        AND status = 'pending'
        AND payment_status = 'pending'
    );

CREATE POLICY "Service role can manage all orders" ON orders
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Order items policies (users see own order items)
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage order items" ON order_items
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Payments policies (users see own, admins see all)
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payments.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage payments" ON payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Reviews policies (public read, users manage own)
CREATE POLICY "Anyone can view approved reviews" ON reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reviews" ON reviews
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Review helpful policies (users manage own votes)
CREATE POLICY "Anyone can view helpful votes" ON review_helpful
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own helpful votes" ON review_helpful
    FOR ALL USING (auth.uid() = user_id);

-- Wishlist policies (users see own)
CREATE POLICY "Users can view own wishlist" ON wishlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON wishlist
    FOR ALL USING (auth.uid() = user_id);

-- Shopping carts policies (users see own, anonymous by session)
CREATE POLICY "Users can view own cart" ON shopping_carts
    FOR SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
    );

CREATE POLICY "Users can manage own cart" ON shopping_carts
    FOR ALL USING (
        auth.uid() = user_id
        OR user_id IS NULL
    );

-- Discounts policies (public read active, admin write)
CREATE POLICY "Anyone can view active discounts" ON discounts
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage discounts" ON discounts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Discount usage policies (users see own, admins see all)
CREATE POLICY "Users can view own discount usage" ON discount_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage discount usage" ON discount_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications policies (users see own)
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Search logs policies (users see own, admins see all)
CREATE POLICY "Users can view own search logs" ON search_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create search logs" ON search_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage all search logs" ON search_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics events policies (users see own, admins see all)
CREATE POLICY "Users can view own analytics events" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage all analytics events" ON analytics_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Analytics sessions policies (similar to events)
CREATE POLICY "Users can view own sessions" ON analytics_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create sessions" ON analytics_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage all sessions" ON analytics_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Inventory logs policies (admin only)
CREATE POLICY "Service role can manage inventory logs" ON inventory_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Price history policies (public read, admin write)
CREATE POLICY "Anyone can view price history" ON price_history
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage price history" ON price_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Settings policies (public read public settings, admin write)
CREATE POLICY "Anyone can view public settings" ON settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can view all settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage settings" ON settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Email templates policies (admin only)
CREATE POLICY "Service role can manage email templates" ON email_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit logs policies (admin only)
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant table-level permissions (RLS policies control row-level access)
GRANT SELECT ON users TO anon, authenticated;
GRANT SELECT ON user_addresses TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON brands TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON product_variants TO anon, authenticated;
GRANT SELECT ON collections TO anon, authenticated;
GRANT SELECT ON reviews TO anon, authenticated;
GRANT SELECT ON review_helpful TO anon, authenticated;
GRANT SELECT ON discounts TO anon, authenticated;
GRANT SELECT ON price_history TO anon, authenticated;
GRANT SELECT ON settings TO anon, authenticated;

-- Additional permissions for authenticated users
GRANT INSERT, UPDATE ON users TO authenticated;
GRANT ALL ON user_addresses TO authenticated;
GRANT INSERT ON orders TO authenticated;
GRANT INSERT, UPDATE ON payments TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON review_helpful TO authenticated;
GRANT ALL ON wishlist TO authenticated;
GRANT ALL ON shopping_carts TO authenticated;
GRANT INSERT ON search_logs TO authenticated;
GRANT INSERT ON analytics_events TO authenticated;
GRANT INSERT ON analytics_sessions TO authenticated;
GRANT INSERT ON notifications TO authenticated;

-- Full permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner(entity_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = entity_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
