xarastore/lib/supabase/schemas/auth.ts
export const authSchema = `
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT users_email_unique UNIQUE (email)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(user_id, role)
);

-- User sessions table for tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(session_token),
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_expires (expires_at)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(token),
  INDEX idx_password_reset_tokens_user_id (user_id),
  INDEX idx_password_reset_tokens_expires (expires_at)
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(token),
  INDEX idx_email_verification_tokens_user_id (user_id),
  INDEX idx_email_verification_tokens_expires (expires_at)
);

-- Phone verification codes
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_phone_verification_codes_user_id (user_id),
  INDEX idx_phone_verification_codes_phone (phone),
  INDEX idx_phone_verification_codes_expires (expires_at)
);

-- Login attempts tracking for security
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for rate limiting
  INDEX idx_login_attempts_email (email),
  INDEX idx_login_attempts_ip (ip_address),
  INDEX idx_login_attempts_created (created_at)
);

-- Two-factor authentication
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(user_id)
);

-- Social login connections
CREATE TABLE IF NOT EXISTS social_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'apple', 'github')),
  provider_id TEXT NOT NULL,
  email TEXT,
  profile_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(provider, provider_id),
  UNIQUE(user_id, provider)
);

-- RLS Policies

-- Users can read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update all users
CREATE POLICY "Admins can update all users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON user_sessions FOR SELECT
USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON user_sessions FOR DELETE
USING (user_id = auth.uid());

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Users can view their own 2FA settings
CREATE POLICY "Users can view own 2FA"
ON two_factor_auth FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2FA"
ON two_factor_auth FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can view their own social logins
CREATE POLICY "Users can view own social logins"
ON social_logins FOR SELECT
USING (user_id = auth.uid());

-- Users can delete their own social logins
CREATE POLICY "Users can delete own social logins"
ON social_logins FOR DELETE
USING (user_id = auth.uid());

-- Functions

-- Function to update user's last login time
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET 
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last login on session creation
CREATE TRIGGER update_last_login_trigger
AFTER INSERT ON user_sessions
FOR EACH ROW EXECUTE FUNCTION update_last_login();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW();
  
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW();
  
  DELETE FROM phone_verification_codes
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if user exists
CREATE OR REPLACE FUNCTION user_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE email = email_to_check AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(email_to_find TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM users u
  WHERE u.email = email_to_find;
END;
$$ LANGUAGE plpgsql;

-- Function to verify email
CREATE OR REPLACE FUNCTION verify_email(user_id_to_verify UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    email_verified = true,
    updated_at = NOW()
  WHERE id = user_id_to_verify;
END;
$$ LANGUAGE plpgsql;

-- Function to verify phone
CREATE OR REPLACE FUNCTION verify_phone(user_id_to_verify UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    phone_verified = true,
    updated_at = NOW()
  WHERE id = user_id_to_verify;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limiting for login attempts
CREATE OR REPLACE FUNCTION check_login_rate_limit(
  email_to_check TEXT,
  ip_to_check INET,
  max_attempts INTEGER DEFAULT 5,
  time_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM login_attempts
  WHERE (
    email = email_to_check OR
    ip_address = ip_to_check
  )
  AND created_at > NOW() - (time_window_minutes || ' minutes')::INTERVAL
  AND success = false;
  
  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  email_to_record TEXT,
  ip_to_record INET,
  user_agent_to_record TEXT,
  was_successful BOOLEAN,
  failure_reason_to_record TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (
    email,
    ip_address,
    user_agent,
    success,
    failure_reason
  ) VALUES (
    email_to_record,
    ip_to_record,
    user_agent_to_record,
    was_successful,
    failure_reason_to_record
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_sessions_user_id_expires ON user_sessions(user_id, expires_at);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at);

CREATE INDEX idx_login_attempts_email_created ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip_created ON login_attempts(ip_address, created_at);

-- Create a default admin user (password should be changed immediately)
-- This is for initial setup only
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  reauthentication_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@xarastore.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  false,
  '',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Insert into users table
INSERT INTO users (id, email, full_name, role, email_verified)
SELECT 
  id,
  email,
  'System Administrator',
  'admin',
  true
FROM auth.users
WHERE email = 'admin@xarastore.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
`;
