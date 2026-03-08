-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    two_factor_temp_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);

-- API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);

-- Security Events
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);

-- Data Exports (GDPR)
CREATE TABLE IF NOT EXISTS public.data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    downloaded_at TIMESTAMPTZ
);

CREATE INDEX idx_data_exports_user_id ON public.data_exports(user_id);

-- Webhooks
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user_id ON public.webhooks(user_id);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    notifications JSONB DEFAULT '{
        "marketing": true,
        "security": true,
        "billing": true,
        "updates": false
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed')),
    pdf_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view own sessions"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON public.user_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- API Keys policies
CREATE POLICY "Users can view own API keys"
    ON public.api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create API keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON public.api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Security events policies
CREATE POLICY "Users can view own security events"
    ON public.security_events FOR SELECT
    USING (auth.uid() = user_id);

-- Data exports policies
CREATE POLICY "Users can view own exports"
    ON public.data_exports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create exports"
    ON public.data_exports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Webhooks policies
CREATE POLICY "Users can manage own webhooks"
    ON public.webhooks FOR ALL
    USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "Users can manage own preferences"
    ON public.user_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.created_at,
        NEW.updated_at
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to revoke all other sessions
CREATE OR REPLACE FUNCTION public.revoke_user_sessions_except_current(
    p_user_id UUID,
    p_current_session_id TEXT
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE user_id = p_user_id
    AND session_id != p_current_session_id;
    
    -- Also revoke from Supabase auth (implementation depends on your setup)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events automatically
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.security_events (
        user_id,
        event_type,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        NEW.user_id,
        TG_ARGV[0],
        current_setting('request.headers')::json->>'x-forwarded-for',
        current_setting('request.headers')::json->>'user-agent',
        jsonb_build_object('table', TG_TABLE_NAME, 'action', TG_OP)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for security events
CREATE TRIGGER log_password_change
    AFTER UPDATE OF password ON auth.users
    FOR EACH ROW
    WHEN (OLD.password IS DISTINCT FROM NEW.password)
    EXECUTE FUNCTION public.log_security_event('password_changed');

-- Create storage bucket for user content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-content', 'user-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-content' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'user-content' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can read their own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-content' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-content' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
