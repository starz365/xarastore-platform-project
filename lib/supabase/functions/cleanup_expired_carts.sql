-- Function to cleanup expired shopping carts
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  expiration_days INTEGER := 30; -- Carts expire after 30 days
BEGIN
  -- Delete expired carts
  DELETE FROM shopping_carts
  WHERE (
    expires_at IS NOT NULL AND expires_at < NOW()
  ) OR (
    updated_at < NOW() - (expiration_days || ' days')::INTERVAL
    AND user_id IS NULL -- Only anonymous carts
  )
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  expiration_days INTEGER := 90; -- Sessions expire after 90 days
BEGIN
  -- Delete expired analytics sessions
  DELETE FROM analytics_sessions
  WHERE end_time < NOW() - (expiration_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old search logs
CREATE OR REPLACE FUNCTION cleanup_old_search_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 365; -- Keep search logs for 1 year
BEGIN
  -- Delete old search logs
  DELETE FROM search_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old analytics events
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 365; -- Keep analytics for 1 year
BEGIN
  -- Delete old analytics events
  DELETE FROM analytics_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 90; -- Keep notifications for 90 days
BEGIN
  -- Delete old read notifications
  DELETE FROM notifications
  WHERE is_read = true 
    AND created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired discounts
CREATE OR REPLACE FUNCTION cleanup_expired_discounts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cleanup_days INTEGER := 7; -- Cleanup discounts expired for 7+ days
BEGIN
  -- Delete expired discounts that are no longer valid
  DELETE FROM discounts
  WHERE valid_until IS NOT NULL 
    AND valid_until < NOW() - (cleanup_days || ' days')::INTERVAL
    AND is_active = true
  RETURNING COUNT(*) INTO deleted_count;
  
  -- Mark as inactive instead of deleting
  UPDATE discounts
  SET is_active = false
  WHERE valid_until IS NOT NULL 
    AND valid_until < NOW() 
    AND valid_until >= NOW() - (cleanup_days || ' days')::INTERVAL
    AND is_active = true;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 365; -- Keep audit logs for 1 year
BEGIN
  -- Delete old audit logs
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old price history
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 730; -- Keep price history for 2 years
BEGIN
  -- Delete old price history
  DELETE FROM price_history
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old inventory logs
CREATE OR REPLACE FUNCTION cleanup_old_inventory_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER := 730; -- Keep inventory logs for 2 years
BEGIN
  -- Delete old inventory logs
  DELETE FROM inventory_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup abandoned carts (older than 3 days)
CREATE OR REPLACE FUNCTION cleanup_abandoned_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  abandonment_days INTEGER := 3; -- Consider carts abandoned after 3 days
BEGIN
  -- Delete abandoned carts (no updates for 3+ days)
  DELETE FROM shopping_carts
  WHERE updated_at < NOW() - (abandonment_days || ' days')::INTERVAL
    AND jsonb_array_length(items) > 0
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup unverified users
CREATE OR REPLACE FUNCTION cleanup_unverified_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  verification_days INTEGER := 7; -- Delete unverified users after 7 days
BEGIN
  -- Delete users who haven't verified email after 7 days
  DELETE FROM users
  WHERE email_verified = false
    AND created_at < NOW() - (verification_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup temporary files references
CREATE OR REPLACE FUNCTION cleanup_temp_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  temp_lifetime_days INTEGER := 1; -- Temp files live for 1 day
BEGIN
  -- This function would cleanup references to temp files in your storage
  -- Actual file deletion would happen in your storage service
  -- Here we just return 0 as a placeholder
  deleted_count := 0;
  
  -- Example implementation if you have a temp_files table:
  -- DELETE FROM temp_files
  -- WHERE created_at < NOW() - (temp_lifetime_days || ' days')::INTERVAL
  -- RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old password reset tokens
CREATE OR REPLACE FUNCTION cleanup_old_password_resets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  token_lifetime_hours INTEGER := 24; -- Tokens valid for 24 hours
BEGIN
  -- Delete old password reset requests
  -- This assumes you have a password_resets table
  -- CREATE TABLE IF NOT EXISTS password_resets (
  --   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  --   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  --   token_hash TEXT NOT NULL,
  --   expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  --   used_at TIMESTAMP WITH TIME ZONE,
  --   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- );
  
  -- DELETE FROM password_resets
  -- WHERE expires_at < NOW() 
  --   OR (used_at IS NOT NULL AND used_at < NOW() - (token_lifetime_hours || ' hours')::INTERVAL)
  -- RETURNING COUNT(*) INTO deleted_count;
  
  deleted_count := 0;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old API tokens
CREATE OR REPLACE FUNCTION cleanup_old_api_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  token_lifetime_days INTEGER := 90; -- API tokens valid for 90 days
BEGIN
  -- Delete expired API tokens
  -- This assumes you have an api_tokens table
  -- CREATE TABLE IF NOT EXISTS api_tokens (
  --   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  --   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  --   token_hash TEXT NOT NULL,
  --   name VARCHAR(100),
  --   last_used_at TIMESTAMP WITH TIME ZONE,
  --   expires_at TIMESTAMP WITH TIME ZONE,
  --   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- );
  
  -- DELETE FROM api_tokens
  -- WHERE expires_at < NOW()
  -- RETURNING COUNT(*) INTO deleted_count;
  
  deleted_count := 0;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run all cleanup tasks
CREATE OR REPLACE FUNCTION run_all_cleanup_tasks()
RETURNS TABLE (
  task_name VARCHAR,
  items_cleaned INTEGER,
  execution_time INTERVAL
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  cleaned_count INTEGER;
BEGIN
  -- Start timing
  start_time := NOW();
  
  -- 1. Cleanup expired carts
  start_time := NOW();
  cleaned_count := cleanup_expired_carts();
  end_time := NOW();
  RETURN QUERY SELECT 'expired_carts'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 2. Cleanup abandoned carts
  start_time := NOW();
  cleaned_count := cleanup_abandoned_carts();
  end_time := NOW();
  RETURN QUERY SELECT 'abandoned_carts'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 3. Cleanup expired sessions
  start_time := NOW();
  cleaned_count := cleanup_expired_sessions();
  end_time := NOW();
  RETURN QUERY SELECT 'expired_sessions'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 4. Cleanup old search logs
  start_time := NOW();
  cleaned_count := cleanup_old_search_logs();
  end_time := NOW();
  RETURN QUERY SELECT 'old_search_logs'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 5. Cleanup old analytics events
  start_time := NOW();
  cleaned_count := cleanup_old_analytics_events();
  end_time := NOW();
  RETURN QUERY SELECT 'old_analytics_events'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 6. Cleanup old notifications
  start_time := NOW();
  cleaned_count := cleanup_old_notifications();
  end_time := NOW();
  RETURN QUERY SELECT 'old_notifications'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 7. Cleanup expired discounts
  start_time := NOW();
  cleaned_count := cleanup_expired_discounts();
  end_time := NOW();
  RETURN QUERY SELECT 'expired_discounts'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 8. Cleanup old audit logs
  start_time := NOW();
  cleaned_count := cleanup_old_audit_logs();
  end_time := NOW();
  RETURN QUERY SELECT 'old_audit_logs'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 9. Cleanup old price history
  start_time := NOW();
  cleaned_count := cleanup_old_price_history();
  end_time := NOW();
  RETURN QUERY SELECT 'old_price_history'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 10. Cleanup old inventory logs
  start_time := NOW();
  cleaned_count := cleanup_old_inventory_logs();
  end_time := NOW();
  RETURN QUERY SELECT 'old_inventory_logs'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 11. Cleanup unverified users
  start_time := NOW();
  cleaned_count := cleanup_unverified_users();
  end_time := NOW();
  RETURN QUERY SELECT 'unverified_users'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 12. Cleanup temporary files
  start_time := NOW();
  cleaned_count := cleanup_temp_files();
  end_time := NOW();
  RETURN QUERY SELECT 'temp_files'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 13. Cleanup old password resets
  start_time := NOW();
  cleaned_count := cleanup_old_password_resets();
  end_time := NOW();
  RETURN QUERY SELECT 'old_password_resets'::VARCHAR, cleaned_count, end_time - start_time;
  
  -- 14. Cleanup old API tokens
  start_time := NOW();
  cleaned_count := cleanup_old_api_tokens();
  end_time := NOW();
  RETURN QUERY SELECT 'old_api_tokens'::VARCHAR, cleaned_count, end_time - start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule cleanup tasks (to be called by a cron job)
CREATE OR REPLACE FUNCTION schedule_cleanup_tasks()
RETURNS VOID AS $$
BEGIN
  -- Run all cleanup tasks and log results
  INSERT INTO cleanup_logs (task_name, items_cleaned, execution_time, executed_at)
  SELECT * FROM run_all_cleanup_tasks();
  
  -- Vacuum analyze to maintain performance
  -- Note: VACUUM cannot be run in a function, it should be scheduled separately
  -- VACUUM ANALYZE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table to log cleanup task results
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_name VARCHAR(100) NOT NULL,
  items_cleaned INTEGER NOT NULL DEFAULT 0,
  execution_time INTERVAL NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for cleanup logs
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_executed_at ON cleanup_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_task_name ON cleanup_logs(task_name);
