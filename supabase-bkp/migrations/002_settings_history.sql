-- Settings History Tables for Audit Trail

-- Site Settings History
CREATE TABLE IF NOT EXISTS site_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_settings_id UUID REFERENCES site_settings(id) ON DELETE CASCADE,
    settings_data JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    
    -- Index for efficient querying
    CONSTRAINT site_settings_history_data_valid CHECK (jsonb_typeof(settings_data) = 'object')
);

-- Payment Settings History
CREATE TABLE IF NOT EXISTS payment_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_settings_id UUID REFERENCES payment_settings(id) ON DELETE CASCADE,
    settings_data JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    
    CONSTRAINT payment_settings_history_data_valid CHECK (jsonb_typeof(settings_data) = 'object')
);

-- Email Settings History
CREATE TABLE IF NOT EXISTS email_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_settings_id UUID REFERENCES email_settings(id) ON DELETE CASCADE,
    settings_data JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    
    CONSTRAINT email_settings_history_data_valid CHECK (jsonb_typeof(settings_data) = 'object')
);

-- Notification Settings History
CREATE TABLE IF NOT EXISTS notification_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_settings_id UUID REFERENCES notification_settings(id) ON DELETE CASCADE,
    settings_data JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    
    CONSTRAINT notification_settings_history_data_valid CHECK (jsonb_typeof(settings_data) = 'object')
);

-- Settings Audit Log
CREATE TABLE IF NOT EXISTS settings_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'enable', 'disable', 'reset')),
    entity TEXT NOT NULL CHECK (entity IN ('site_settings', 'payment_settings', 'email_settings', 'notification_settings', 'feature_flag')),
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users Table (for settings access control)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'editor')),
    permissions JSONB DEFAULT '{"settings": true, "products": true, "orders": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT admin_users_permissions_valid CHECK (jsonb_typeof(permissions) = 'object')
);

-- Create triggers to automatically create history entries
CREATE OR REPLACE FUNCTION create_site_settings_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_settings_history (site_settings_id, settings_data, changed_by)
    VALUES (NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_payment_settings_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO payment_settings_history (payment_settings_id, settings_data, changed_by)
    VALUES (NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_email_settings_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_settings_history (email_settings_id, settings_data, changed_by)
    VALUES (NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_notification_settings_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings_history (notification_settings_id, settings_data, changed_by)
    VALUES (NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit log trigger for settings changes
CREATE OR REPLACE FUNCTION log_settings_audit()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    entity_name TEXT;
    changes_data JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        changes_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        changes_data := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        changes_data := to_jsonb(OLD);
    END IF;
    
    -- Determine entity name
    entity_name := TG_TABLE_NAME;
    
    -- Insert audit log
    INSERT INTO settings_audit_log (
        action,
        entity,
        entity_id,
        user_id,
        changes,
        created_at
    ) VALUES (
        action_type,
        entity_name,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        changes_data,
        NOW()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Create triggers for automatic history
CREATE TRIGGER site_settings_history_trigger
    AFTER INSERT OR UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION create_site_settings_history();

CREATE TRIGGER payment_settings_history_trigger
    AFTER INSERT OR UPDATE ON payment_settings
    FOR EACH ROW EXECUTE FUNCTION create_payment_settings_history();

CREATE TRIGGER email_settings_history_trigger
    AFTER INSERT OR UPDATE ON email_settings
    FOR EACH ROW EXECUTE FUNCTION create_email_settings_history();

CREATE TRIGGER notification_settings_history_trigger
    AFTER INSERT OR UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION create_notification_settings_history();

-- Create triggers for audit logging on all settings tables
CREATE TRIGGER site_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

CREATE TRIGGER payment_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

CREATE TRIGGER email_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON email_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

CREATE TRIGGER notification_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

CREATE TRIGGER feature_flags_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

CREATE TRIGGER admin_users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION log_settings_audit();

-- Enable Row Level Security
ALTER TABLE site_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all history" 
ON site_settings_history FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

CREATE POLICY "Admins can view all history" 
ON payment_settings_history FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

CREATE POLICY "Admins can view all history" 
ON email_settings_history FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

CREATE POLICY "Admins can view all history" 
ON notification_settings_history FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

CREATE POLICY "Admins can view audit logs" 
ON settings_audit_log FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

CREATE POLICY "Admins can manage admin users" 
ON admin_users FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
);

CREATE POLICY "Admins can read admin users" 
ON admin_users FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

-- Create indexes for performance
CREATE INDEX idx_site_settings_history_changed_at ON site_settings_history(changed_at DESC);
CREATE INDEX idx_site_settings_history_changed_by ON site_settings_history(changed_by);
CREATE INDEX idx_site_settings_history_settings_id ON site_settings_history(site_settings_id);

CREATE INDEX idx_payment_settings_history_changed_at ON payment_settings_history(changed_at DESC);
CREATE INDEX idx_payment_settings_history_changed_by ON payment_settings_history(changed_by);
CREATE INDEX idx_payment_settings_history_settings_id ON payment_settings_history(payment_settings_id);

CREATE INDEX idx_email_settings_history_changed_at ON email_settings_history(changed_at DESC);
CREATE INDEX idx_email_settings_history_changed_by ON email_settings_history(changed_by);
CREATE INDEX idx_email_settings_history_settings_id ON email_settings_history(email_settings_id);

CREATE INDEX idx_notification_settings_history_changed_at ON notification_settings_history(changed_at DESC);
CREATE INDEX idx_notification_settings_history_changed_by ON notification_settings_history(changed_by);
CREATE INDEX idx_notification_settings_history_settings_id ON notification_settings_history(notification_settings_id);

CREATE INDEX idx_settings_audit_log_created_at ON settings_audit_log(created_at DESC);
CREATE INDEX idx_settings_audit_log_entity ON settings_audit_log(entity);
CREATE INDEX idx_settings_audit_log_user_id ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_action ON settings_audit_log(action);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Create function to get settings change summary
CREATE OR REPLACE FUNCTION get_settings_change_summary(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    change_date DATE,
    entity_type TEXT,
    change_count BIGINT,
    last_changed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as change_date,
        entity as entity_type,
        COUNT(*) as change_count,
        MAX(created_at) as last_changed
    FROM settings_audit_log
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at), entity
    ORDER BY change_date DESC, entity;
END;
$$ language 'plpgsql';

-- Create function to restore settings from history
CREATE OR REPLACE FUNCTION restore_settings_from_history(
    history_table TEXT,
    history_id UUID,
    restored_by UUID
)
RETURNS JSONB AS $$
DECLARE
    settings_data JSONB;
    target_table TEXT;
    target_id UUID;
BEGIN
    -- Get settings data from history
    EXECUTE format('SELECT settings_data FROM %I WHERE id = $1', history_table)
    INTO settings_data
    USING history_id;
    
    IF settings_data IS NULL THEN
        RAISE EXCEPTION 'History record not found';
    END IF;
    
    -- Determine target table and ID
    CASE history_table
        WHEN 'site_settings_history' THEN
            target_table := 'site_settings';
            target_id := settings_data->>'id';
        WHEN 'payment_settings_history' THEN
            target_table := 'payment_settings';
            target_id := settings_data->>'id';
        WHEN 'email_settings_history' THEN
            target_table := 'email_settings';
            target_id := settings_data->>'id';
        WHEN 'notification_settings_history' THEN
            target_table := 'notification_settings';
            target_id := settings_data->>'id';
        ELSE
            RAISE EXCEPTION 'Invalid history table: %', history_table;
    END CASE;
    
    -- Update settings
    EXECUTE format('
        UPDATE %I 
        SET 
            updated_at = NOW(),
            %s
        WHERE id = $1
        RETURNING to_jsonb(%I.*)
    ', 
        target_table,
        (
            SELECT string_agg(format('%I = $2->>%L', key, key), ', ')
            FROM jsonb_each(settings_data)
            WHERE key NOT IN ('id', 'created_at', 'updated_at')
        ),
        target_table
    )
    INTO settings_data
    USING target_id, settings_data;
    
    -- Log the restoration
    INSERT INTO settings_audit_log (
        action,
        entity,
        entity_id,
        user_id,
        changes,
        created_at
    ) VALUES (
        'restore',
        target_table,
        target_id,
        restored_by,
        jsonb_build_object('from_history', history_id),
        NOW()
    );
    
    RETURN settings_data;
END;
$$ language 'plpgsql' SECURITY DEFINER;
