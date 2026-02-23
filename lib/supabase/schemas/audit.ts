export const auditSchema = `
-- Audit log table for tracking all sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  old_data_val JSONB;
  new_data_val JSONB;
BEGIN
  -- Get current user ID from JWT
  user_id_val := auth.uid();
  
  -- Convert OLD and NEW rows to JSON
  old_data_val := to_jsonb(OLD);
  new_data_val := to_jsonb(NEW);
  
  -- Remove sensitive fields from logs
  old_data_val := old_data_val - ARRAY['password_hash', 'refresh_token', 'access_token', 'secret_key'];
  new_data_val := new_data_val - ARRAY['password_hash', 'refresh_token', 'access_token', 'secret_key'];
  
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    user_id_val,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_data_val END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_data_val END,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers for sensitive tables
CREATE TRIGGER audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_payment_attempts
AFTER INSERT OR UPDATE OR DELETE ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Function to get audit trail for an entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  action VARCHAR(100),
  user_id UUID,
  user_email VARCHAR(255),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.user_id,
    u.email as user_email,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.entity_type = p_entity_type
    AND al.entity_id = p_entity_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_retention_days INTEGER DEFAULT 365
)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin audit dashboard
CREATE OR REPLACE VIEW admin_audit_dashboard AS
SELECT 
  al.id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.user_id,
  u.email as user_email,
  al.ip_address,
  al.user_agent,
  al.created_at,
  jsonb_build_object(
    'old', al.old_data,
    'new', al.new_data
  ) as changes
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;
`;
