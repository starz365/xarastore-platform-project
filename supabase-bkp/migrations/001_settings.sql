-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admin users (required for RLS policies)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id)
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL DEFAULT 'Xarastore',
    site_tagline TEXT NOT NULL DEFAULT 'it''s a deal',
    primary_color TEXT NOT NULL DEFAULT '#dc2626',
    secondary_color TEXT NOT NULL DEFAULT '#fecaca',
    logo_url TEXT,
    favicon_url TEXT,
    contact_email TEXT,
    support_phone TEXT,
    business_address TEXT,
    currency TEXT NOT NULL DEFAULT 'KES',
    currency_symbol TEXT NOT NULL DEFAULT 'KES',
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    shipping_free_threshold DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
    shipping_standard_price DECIMAL(10,2) NOT NULL DEFAULT 299.00,
    shipping_express_price DECIMAL(10,2) NOT NULL DEFAULT 599.00,
    return_window_days INTEGER NOT NULL DEFAULT 30,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    social_facebook TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    social_tiktok TEXT,
    google_analytics_id TEXT,
    facebook_pixel_id TEXT,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tax_rate_range CHECK (tax_rate >= 0 AND tax_rate <= 1),
    CONSTRAINT shipping_free_threshold_positive CHECK (shipping_free_threshold >= 0),
    CONSTRAINT shipping_standard_price_positive CHECK (shipping_standard_price >= 0),
    CONSTRAINT shipping_express_price_positive CHECK (shipping_express_price >= 0),
    CONSTRAINT return_window_days_positive CHECK (return_window_days >= 0)
);

-- Payment Settings Table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_enabled BOOLEAN NOT NULL DEFAULT false,
    mpesa_consumer_key TEXT,
    mpesa_consumer_secret TEXT,
    mpesa_shortcode TEXT,
    mpesa_passkey TEXT,
    mpesa_environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (mpesa_environment IN ('sandbox', 'production')),
    stripe_enabled BOOLEAN NOT NULL DEFAULT false,
    stripe_publishable_key TEXT,
    stripe_secret_key TEXT,
    stripe_webhook_secret TEXT,
    paypal_enabled BOOLEAN NOT NULL DEFAULT false,
    paypal_client_id TEXT,
    paypal_secret_key TEXT,
    bank_transfer_enabled BOOLEAN NOT NULL DEFAULT false,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_branch TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Settings Table
CREATE TABLE IF NOT EXISTS public.email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smtp_host TEXT,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username TEXT,
    smtp_password TEXT,
    smtp_encryption TEXT NOT NULL DEFAULT 'tls' CHECK (smtp_encryption IN ('ssl', 'tls', 'none')),
    from_email TEXT,
    from_name TEXT,
    order_confirmation_enabled BOOLEAN NOT NULL DEFAULT false,
    order_shipped_enabled BOOLEAN NOT NULL DEFAULT false,
    order_delivered_enabled BOOLEAN NOT NULL DEFAULT false,
    welcome_email_enabled BOOLEAN NOT NULL DEFAULT false,
    password_reset_enabled BOOLEAN NOT NULL DEFAULT false,
    newsletter_enabled BOOLEAN NOT NULL DEFAULT false,
    newsletter_from_name TEXT,
    newsletter_from_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT smtp_port_range CHECK (smtp_port > 0 AND smtp_port <= 65535)
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    new_order_notification BOOLEAN NOT NULL DEFAULT false,
    new_order_email TEXT,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    low_stock_notification BOOLEAN NOT NULL DEFAULT false,
    low_stock_email TEXT,
    customer_registration_notification BOOLEAN NOT NULL DEFAULT false,
    customer_registration_email TEXT,
    review_submitted_notification BOOLEAN NOT NULL DEFAULT false,
    review_submitted_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT low_stock_threshold_positive CHECK (low_stock_threshold >= 0)
);

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default site settings
INSERT INTO public.site_settings (id, site_name, site_tagline, primary_color) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Xarastore', 'it''s a deal', '#dc2626')
ON CONFLICT DO NOTHING;

-- Insert default payment settings
INSERT INTO public.payment_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Insert default email settings
INSERT INTO public.email_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Insert default notification settings
INSERT INTO public.notification_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- Insert default feature flags
INSERT INTO public.feature_flags (id, name, description, enabled) VALUES
(uuid_generate_v4(), 'guest_checkout', 'Allow customers to checkout without creating an account', true),
(uuid_generate_v4(), 'wishlist', 'Enable wishlist functionality', true),
(uuid_generate_v4(), 'product_reviews', 'Enable product reviews and ratings', true),
(uuid_generate_v4(), 'coupons', 'Enable coupon/discount code functionality', false),
(uuid_generate_v4(), 'gift_cards', 'Enable gift card functionality', false),
(uuid_generate_v4(), 'affiliate_program', 'Enable affiliate program', false),
(uuid_generate_v4(), 'multi_vendor', 'Enable multi-vendor marketplace', false),
(uuid_generate_v4(), 'subscriptions', 'Enable subscription products', false)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Public can read site settings" 
ON public.site_settings FOR SELECT USING (true);
FOR SELECT
USING (true);

CREATE POLICY "Public can read payment settings" 
ON public.payment_settings FOR SELECT USING (true);

CREATE POLICY "Public can read feature flags" 
ON public.feature_flags FOR SELECT USING (true);

-- Only admins can write to settings
CREATE POLICY "Only admins can modify site settings" 
ON public.site_settings FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can modify payment settings" 
ON public.payment_settings FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can modify email settings" 
ON public.email_settings FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can modify notification settings" 
ON public.notification_settings FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can modify feature flags" 
ON public.feature_flags FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

FOR INSERT, UPDATE, DELETE
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));


-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_site_settings_updated_at 
    BEFORE UPDATE ON public.site_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON public.payment_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at 
    BEFORE UPDATE ON public.email_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON public.notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at 
    BEFORE UPDATE ON public.feature_flags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_site_settings_updated_at ON public.site_settings(updated_at);
CREATE INDEX idx_payment_settings_updated_at ON public.payment_settings(updated_at);
CREATE INDEX idx_email_settings_updated_at ON public.email_settings(updated_at);
CREATE INDEX idx_notification_settings_updated_at ON public.notification_settings(updated_at);
CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(enabled);
