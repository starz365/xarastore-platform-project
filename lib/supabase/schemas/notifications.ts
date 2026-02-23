xarastore/lib/supabase/schemas/notifications.ts
export const notificationsSchema = `
-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled',
    'payment_confirmation', 'payment_failed', 'payment_refunded',
    'price_drop', 'back_in_stock', 'deal_alert',
    'review_reminder', 'review_published', 'review_replied',
    'wishlist_reminder', 'abandoned_cart',
    'security_alert', 'account_activity',
    'system_announcement', 'promotional', 'newsletter'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification
  
  -- Channel delivery
  channels TEXT[] NOT NULL DEFAULT '{}' CHECK (
    channels <@ ARRAY['in_app', 'email', 'push', 'sms']::TEXT[]
  ),
  
  -- Delivery status
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'read')
  ),
  
  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Priority
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 3), -- 0: low, 1: normal, 2: high, 3: urgent
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN GENERATED ALWAYS AS (
    expires_at IS NOT NULL AND expires_at < NOW()
  ) STORED,
  
  -- Action
  action_url TEXT,
  action_label TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_delivery_status (delivery_status),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_scheduled_for (scheduled_for),
  INDEX idx_notifications_expires_at (expires_at),
  INDEX idx_notifications_priority (priority DESC)
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template content
  subject_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  html_template TEXT,
  
  -- Default configuration
  default_channels TEXT[] NOT NULL DEFAULT '{}',
  default_priority INTEGER DEFAULT 1,
  default_expiry_hours INTEGER,
  
  -- Variables
  variables JSONB, -- JSON schema for template variables
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_notification_templates_template_key (template_key),
  INDEX idx_notification_templates_is_active (is_active)
);

-- Notification channels configuration
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL UNIQUE CHECK (channel_type IN ('email', 'push', 'sms', 'in_app')),
  
  -- Channel configuration
  is_enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL, -- Channel-specific configuration
  
  -- Rate limiting
  rate_limit_per_minute INTEGER,
  rate_limit_per_hour INTEGER,
  rate_limit_per_day INTEGER,
  
  -- Delivery settings
  max_retry_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_notification_channels_channel_type (channel_type)
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  
  -- Category preferences
  order_updates BOOLEAN DEFAULT true,
  payment_updates BOOLEAN DEFAULT true,
  shipping_updates BOOLEAN DEFAULT true,
  price_alerts BOOLEAN DEFAULT true,
  stock_alerts BOOLEAN DEFAULT true,
  review_reminders BOOLEAN DEFAULT true,
  wishlist_reminders BOOLEAN DEFAULT true,
  promotional_offers BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  system_announcements BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  
  -- Do not disturb
  do_not_disturb_until TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  
  -- Indexes
  INDEX idx_notification_preferences_user_id (user_id)
);

-- Notification delivery logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery information
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
  provider TEXT, -- e.g., 'sendgrid', 'onesignal', 'twilio'
  provider_message_id TEXT,
  
  -- Recipient
  recipient_address TEXT NOT NULL, -- email, phone number, device token
  recipient_name TEXT,
  
  -- Delivery status
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained')
  ),
  status_message TEXT,
  
  -- Retry information
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_notification_logs_notification_id (notification_id),
  INDEX idx_notification_logs_channel (channel),
  INDEX idx_notification_logs_status (status),
  INDEX idx_notification_logs_created_at (created_at),
  INDEX idx_notification_logs_provider_message_id (provider_message_id)
);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Device information
  device_token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
  device_id TEXT,
  device_name TEXT,
  
  -- App information
  app_version TEXT,
  os_version TEXT,
  
  -- Subscription status
  is_active BOOLEAN DEFAULT true,
  subscribed_topics TEXT[] DEFAULT '{}',
  
  -- Last activity
  last_active_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(device_token),
  UNIQUE(user_id, device_id),
  
  -- Indexes
  INDEX idx_push_notification_tokens_user_id (user_id),
  INDEX idx_push_notification_tokens_device_type (device_type),
  INDEX idx_push_notification_tokens_is_active (is_active)
);

-- Email notification queue
CREATE TABLE IF NOT EXISTS email_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Email details
  to_email TEXT NOT NULL,
  to_name TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  
  -- Attachments
  attachments JSONB, -- Array of attachment objects
  
  -- Priority
  priority INTEGER DEFAULT 0,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'sent', 'failed', 'retrying')
  ),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_email_notification_queue_notification_id (notification_id),
  INDEX idx_email_notification_queue_status (status),
  INDEX idx_email_notification_queue_scheduled_for (scheduled_for),
  INDEX idx_email_notification_queue_priority (priority DESC)
);

-- SMS notification queue
CREATE TABLE IF NOT EXISTS sms_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- SMS details
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id TEXT,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'sent', 'failed', 'delivered', 'undelivered')
  ),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Provider information
  provider_message_id TEXT,
  provider_status TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_sms_notification_queue_notification_id (notification_id),
  INDEX idx_sms_notification_queue_status (status),
  INDEX idx_sms_notification_queue_scheduled_for (scheduled_for),
  INDEX idx_sms_notification_queue_to_phone (to_phone)
);

-- RLS Policies

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update read status of their notifications
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can view their own notification preferences
CREATE POLICY "Users can view own preferences"
ON notification_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update own preferences"
ON notification_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can view their own push tokens
CREATE POLICY "Users can view own push tokens"
ON push_notification_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own push tokens
CREATE POLICY "Users can manage own push tokens"
ON push_notification_tokens FOR ALL
USING (auth.uid() = user_id);

-- Users can view their own notification logs
CREATE POLICY "Users can view own notification logs"
ON notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notifications
    WHERE notifications.id = notification_logs.notification_id
    AND notifications.user_id = auth.uid()
  )
);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can view all notification templates
CREATE POLICY "Admins can view all templates"
ON notification_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can manage notification templates
CREATE POLICY "Admins can manage templates"
ON notification_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can view all notification channels
CREATE POLICY "Admins can view all channels"
ON notification_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can manage notification channels
CREATE POLICY "Admins can manage channels"
ON notification_channels FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can view all notification logs
CREATE POLICY "Admins can view all logs"
ON notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Service role can insert notifications (for system notifications)
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Functions

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  user_id_param UUID,
  template_key_param TEXT,
  variables_param JSONB DEFAULT '{}',
  channels_override TEXT[] DEFAULT NULL,
  priority_override INTEGER DEFAULT NULL,
  scheduled_for_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record notification_templates%ROWTYPE;
  notification_id UUID;
  channels_to_use TEXT[];
  priority_to_use INTEGER;
  subject_text TEXT;
  message_text TEXT;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM notification_templates
  WHERE template_key = template_key_param
  AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_key_param;
  END IF;
  
  -- Determine channels to use
  IF channels_override IS NOT NULL THEN
    channels_to_use := channels_override;
  ELSE
    channels_to_use := template_record.default_channels;
  END IF;
  
  -- Determine priority
  IF priority_override IS NOT NULL THEN
    priority_to_use := priority_override;
  ELSE
    priority_to_use := template_record.default_priority;
  END IF;
  
  -- Render templates with variables
  subject_text := template_record.subject_template;
  message_text := template_record.message_template;
  
  -- Simple variable substitution (in production, use a proper templating engine)
  FOR key IN SELECT jsonb_object_keys(variables_param) LOOP
    subject_text := REPLACE(subject_text, '{{' || key || '}}', variables_param->>key);
    message_text := REPLACE(message_text, '{{' || key || '}}', variables_param->>key);
  END LOOP;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    channels,
    priority,
    expires_at,
    scheduled_for
  ) VALUES (
    user_id_param,
    template_key_param,
    subject_text,
    message_text,
    variables_param,
    channels_to_use,
    priority_to_use,
    CASE 
      WHEN template_record.default_expiry_hours IS NOT NULL 
      THEN NOW() + (template_record.default_expiry_hours || ' hours')::INTERVAL
      ELSE NULL
    END,
    scheduled_for_param
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send notification immediately
CREATE OR REPLACE FUNCTION send_notification_immediately(notification_id_param UUID)
RETURNS void AS $$
DECLARE
  notification_record notifications%ROWTYPE;
  user_prefs notification_preferences%ROWTYPE;
  channel TEXT;
  email_queue_id UUID;
  sms_queue_id UUID;
BEGIN
  -- Get notification
  SELECT * INTO notification_record
  FROM notifications
  WHERE id = notification_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found: %', notification_id_param;
  END IF;
  
  -- Get user preferences
  SELECT * INTO user_prefs
  FROM notification_preferences
  WHERE user_id = notification_record.user_id;
  
  -- Process each channel
  FOREACH channel IN ARRAY notification_record.channels
  LOOP
    -- Check if channel is enabled for user
    IF (
      (channel = 'email' AND COALESCE(user_prefs.email_enabled, true) = true) OR
      (channel = 'push' AND COALESCE(user_prefs.push_enabled, true) = true) OR
      (channel = 'sms' AND COALESCE(user_prefs.sms_enabled, false) = true) OR
      (channel = 'in_app')
    ) THEN
      -- Check quiet hours
      IF user_prefs.quiet_hours_enabled AND user_prefs.quiet_hours_start IS NOT NULL AND user_prefs.quiet_hours_end IS NOT NULL THEN
        IF NOW()::TIME BETWEEN user_prefs.quiet_hours_start AND user_prefs.quiet_hours_end THEN
          -- Skip delivery during quiet hours (except urgent notifications)
          IF notification_record.priority < 3 THEN
            CONTINUE;
          END IF;
        END IF;
      END IF;
      
      -- Check do not disturb
      IF user_prefs.do_not_disturb_until IS NOT NULL AND NOW() < user_prefs.do_not_disturb_until THEN
        -- Skip delivery during do not disturb (except urgent notifications)
        IF notification_record.priority < 3 THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Channel-specific delivery logic
      CASE channel
        WHEN 'email' THEN
          -- Add to email queue
          INSERT INTO email_notification_queue (
            notification_id,
            to_email,
            to_name,
            from_email,
            from_name,
            subject,
            html_body,
            text_body,
            priority
          )
          SELECT
            notification_id_param,
            u.email,
            u.full_name,
            'notifications@xarastore.com',
            'Xarastore',
            notification_record.title,
            nt.html_template,
            notification_record.message,
            notification_record.priority
          FROM users u
          LEFT JOIN notification_templates nt ON nt.template_key = notification_record.type
          WHERE u.id = notification_record.user_id
          RETURNING id INTO email_queue_id;
          
          -- Log email delivery
          INSERT INTO notification_logs (
            notification_id,
            channel,
            provider,
            recipient_address,
            recipient_name,
            status
          ) VALUES (
            notification_id_param,
            'email',
            'sendgrid',
            (SELECT email FROM users WHERE id = notification_record.user_id),
            (SELECT full_name FROM users WHERE id = notification_record.user_id),
            'queued'
          );
          
        WHEN 'sms' THEN
          -- Add to SMS queue
          INSERT INTO sms_notification_queue (
            notification_id,
            to_phone,
            message,
            sender_id,
            priority
          )
          SELECT
            notification_id_param,
            u.phone,
            notification_record.message,
            'Xarastore',
            notification_record.priority
          FROM users u
          WHERE u.id = notification_record.user_id
          AND u.phone IS NOT NULL
          RETURNING id INTO sms_queue_id;
          
          -- Log SMS delivery
          INSERT INTO notification_logs (
            notification_id,
            channel,
            provider,
            recipient_address,
            recipient_name,
            status
          ) VALUES (
            notification_id_param,
            'sms',
            'twilio',
            (SELECT phone FROM users WHERE id = notification_record.user_id),
            (SELECT full_name FROM users WHERE id = notification_record.user_id),
            'queued'
          );
          
        WHEN 'push' THEN
          -- Log push notification (actual push would be handled by worker)
          INSERT INTO notification_logs (
            notification_id,
            channel,
            provider,
            recipient_address,
            recipient_name,
            status
          )
          SELECT
            notification_id_param,
            'push',
            'onesignal',
            pnt.device_token,
            u.full_name,
            'queued'
          FROM push_notification_tokens pnt
          JOIN users u ON u.id = pnt.user_id
          WHERE pnt.user_id = notification_record.user_id
          AND pnt.is_active = true;
          
        WHEN 'in_app' THEN
          -- Log in-app notification
          INSERT INTO notification_logs (
            notification_id,
            channel,
            recipient_address,
            status
          ) VALUES (
            notification_id_param,
            'in_app',
            notification_record.user_id::TEXT,
            'delivered'
          );
          
          -- Update notification as delivered for in-app
          UPDATE notifications
          SET 
            delivery_status = 'delivered',
            delivered_at = NOW()
          WHERE id = notification_id_param;
      END CASE;
    END IF;
  END LOOP;
  
  -- Update notification status
  UPDATE notifications
  SET 
    delivery_status = 'sending',
    sent_at = NOW()
  WHERE id = notification_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id_param UUID, user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = notification_id_param
  AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id_param
  AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = user_id_param
  AND is_read = false
  AND (expires_at IS NULL OR expires_at > NOW())
  AND delivery_status IN ('delivered', 'sent');
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  user_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0,
  unread_only BOOLEAN DEFAULT false,
  notification_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.is_read,
    n.read_at,
    n.priority,
    n.action_url,
    n.action_label,
    n.created_at,
    n.expires_at,
    n.is_expired
  FROM notifications n
  WHERE n.user_id = user_id_param
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (NOT unread_only OR n.is_read = false)
  AND (notification_type_filter IS NULL OR n.type = notification_type_filter)
  AND n.delivery_status IN ('delivered', 'sent')
  ORDER BY 
    CASE 
      WHEN n.is_read = false THEN 0 
      ELSE 1 
    END,
    n.priority DESC,
    n.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications that expired more than 7 days ago
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW() - INTERVAL '7 days';
  
  -- Delete notification logs for deleted notifications
  DELETE FROM notification_logs nl
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.id = nl.notification_id
  );
  
  -- Delete old notification queue items (older than 30 days)
  DELETE FROM email_notification_queue
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM sms_notification_queue
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to process notification queue
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS void AS $$
DECLARE
  queued_notification RECORD;
  channel_config RECORD;
BEGIN
  -- Process scheduled notifications that are due
  FOR queued_notification IN (
    SELECT id, user_id, channels
    FROM notifications
    WHERE delivery_status = 'pending'
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY priority DESC, created_at
    LIMIT 100
  )
  LOOP
    PERFORM send_notification_immediately(queued_notification.id);
  END LOOP;
  
  -- Process email queue
  FOR queued_notification IN (
    SELECT eq.*
    FROM email_notification_queue eq
    WHERE eq.status = 'queued'
    AND eq.scheduled_for <= NOW()
    ORDER BY eq.priority DESC, eq.created_at
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  )
  LOOP
    -- Update status to processing
    UPDATE email_notification_queue
    SET status = 'processing'
    WHERE id = queued_notification.id;
    
    -- Here you would integrate with your email provider
    -- For now, we'll mark as sent
    UPDATE email_notification_queue
    SET 
      status = 'sent',
      processed_at = NOW()
    WHERE id = queued_notification.id;
    
    -- Update notification log
    UPDATE notification_logs
    SET 
      status = 'sent',
      updated_at = NOW()
    WHERE notification_id = queued_notification.notification_id
    AND channel = 'email';
  END LOOP;
  
  -- Process SMS queue
  FOR queued_notification IN (
    SELECT sq.*
    FROM sms_notification_queue sq
    WHERE sq.status = 'queued'
    AND sq.scheduled_for <= NOW()
    ORDER BY sq.priority DESC, sq.created_at
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  )
  LOOP
    -- Update status to processing
    UPDATE sms_notification_queue
    SET status = 'processing'
    WHERE id = queued_notification.id;
    
    -- Here you would integrate with your SMS provider
    -- For now, we'll mark as sent
    UPDATE sms_notification_queue
    SET 
      status = 'sent',
      sent_at = NOW()
    WHERE id = queued_notification.id;
    
    -- Update notification log
    UPDATE notification_logs
    SET 
      status = 'sent',
      updated_at = NOW()
    WHERE notification_id = queued_notification.notification_id
    AND channel = 'sms';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create order notification
CREATE OR REPLACE FUNCTION create_order_notification(
  order_id_param UUID,
  notification_type TEXT
)
RETURNS UUID AS $$
DECLARE
  order_record RECORD;
  user_record RECORD;
  notification_id UUID;
  variables JSONB;
BEGIN
  -- Get order details
  SELECT 
    o.*,
    u.email,
    u.full_name,
    u.phone
  INTO order_record
  FROM orders o
  JOIN users u ON u.id = o.user_id
  WHERE o.id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', order_id_param;
  END IF;
  
  -- Prepare variables
  variables := jsonb_build_object(
    'order_number', order_record.order_number,
    'customer_name', order_record.customer_name,
    'order_total', order_record.total_amount,
    'order_date', order_record.created_at,
    'order_status', order_record.status,
    'tracking_number', order_record.tracking_number,
    'estimated_delivery', order_record.estimated_delivery_date
  );
  
  -- Create notification
  SELECT create_notification_from_template(
    order_record.user_id,
    notification_type,
    variables
  ) INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create price drop notification
CREATE OR REPLACE FUNCTION create_price_drop_notification(
  product_id_param UUID,
  old_price DECIMAL,
  new_price DECIMAL
)
RETURNS void AS $$
DECLARE
  product_record RECORD;
  wishlist_user RECORD;
  notification_id UUID;
  variables JSONB;
  price_drop_percentage DECIMAL;
BEGIN
  -- Get product details
  SELECT 
    p.*,
    b.name as brand_name,
    c.name as category_name
  INTO product_record
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = product_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', product_id_param;
  END IF;
  
  -- Calculate price drop percentage
  price_drop_percentage := ROUND(((old_price - new_price) / old_price) * 100, 2);
  
  -- Prepare variables
  variables := jsonb_build_object(
    'product_name', product_record.name,
    'product_url', '/product/' || product_record.slug,
    'old_price', old_price,
    'new_price', new_price,
    'price_drop_percentage', price_drop_percentage,
    'brand_name', product_record.brand_name,
    'category_name', product_record.category_name
  );
  
  -- Notify users who have this product in their wishlist
  FOR wishlist_user IN (
    SELECT DISTINCT w.user_id
    FROM wishlist w
    WHERE w.product_id = product_id_param
  )
  LOOP
    -- Create notification
    SELECT create_notification_from_template(
      wishlist_user.user_id,
      'price_drop',
      variables
    ) INTO notification_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_type ON notifications(user_id, type, created_at DESC);

CREATE INDEX idx_notification_logs_notification_channel ON notification_logs(notification_id, channel);
CREATE INDEX idx_notification_logs_created_status ON notification_logs(created_at, status);

CREATE INDEX idx_email_notification_queue_status_priority ON email_notification_queue(status, priority DESC, scheduled_for);
CREATE INDEX idx_sms_notification_queue_status_priority ON sms_notification_queue(status, priority DESC, scheduled_for);

CREATE INDEX idx_push_notification_tokens_last_active ON push_notification_tokens(last_active_at DESC);

-- Create default notification templates
INSERT INTO notification_templates (
  template_key,
  name,
  description,
  subject_template,
  message_template,
  html_template,
  default_channels,
  default_priority,
  default_expiry_hours,
  variables
) VALUES
(
  'order_confirmation',
  'Order Confirmation',
  'Sent when an order is successfully placed',
  'Order Confirmed - {{order_number}}',
  'Hi {{customer_name}}, your order {{order_number}} has been confirmed. Total: KES {{order_total}}',
  '<h1>Order Confirmed</h1><p>Hi {{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> has been confirmed.</p><p>Total: <strong>KES {{order_total}}</strong></p>',
  ARRAY['email', 'in_app'],
  2,
  168, -- 7 days
  '{"order_number": "string", "customer_name": "string", "order_total": "number"}'
),
(
  'order_shipped',
  'Order Shipped',
  'Sent when an order is shipped',
  'Order Shipped - {{order_number}}',
  'Hi {{customer_name}}, your order {{order_number}} has been shipped. Tracking: {{tracking_number}}',
  '<h1>Order Shipped</h1><p>Hi {{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> has been shipped.</p><p>Tracking number: <strong>{{tracking_number}}</strong></p>',
  ARRAY['email', 'sms', 'in_app'],
  1,
  168,
  '{"order_number": "string", "customer_name": "string", "tracking_number": "string"}'
),
(
  'price_drop',
  'Price Drop Alert',
  'Sent when a product price drops',
  'Price Drop: {{product_name}}',
  '{{product_name}} price dropped {{price_drop_percentage}}%! New price: KES {{new_price}}',
  '<h1>Price Drop Alert!</h1><p><strong>{{product_name}}</strong> price dropped <strong>{{price_drop_percentage}}%</strong>!</p><p>New price: <strong>KES {{new_price}}</strong></p>',
  ARRAY['email', 'push', 'in_app'],
  1,
  72, -- 3 days
  '{"product_name": "string", "old_price": "number", "new_price": "number", "price_drop_percentage": "number"}'
),
(
  'review_reminder',
  'Review Reminder',
  'Remind users to review purchased products',
  'Review your purchase',
  'How was your recent purchase? Share your review to help other shoppers.',
  '<h1>Share Your Experience</h1><p>How was your recent purchase?</p><p>Share your review to help other shoppers.</p>',
  ARRAY['email', 'in_app'],
  0,
  336, -- 14 days
  '{}'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject_template = EXCLUDED.subject_template,
  message_template = EXCLUDED.message_template,
  updated_at = NOW();

-- Create default notification channels
INSERT INTO notification_channels (
  channel_type,
  is_enabled,
  config,
  rate_limit_per_minute,
  rate_limit_per_hour,
  rate_limit_per_day
) VALUES
(
  'email',
  true,
  '{"provider": "sendgrid", "api_key": "YOUR_API_KEY", "from_email": "notifications@xarastore.com", "from_name": "Xarastore"}',
  60,
  1000,
  10000
),
(
  'push',
  true,
  '{"provider": "onesignal", "app_id": "YOUR_APP_ID", "api_key": "YOUR_API_KEY"}',
  100,
  10000,
  100000
),
(
  'sms',
  false,
  '{"provider": "twilio", "account_sid": "YOUR_ACCOUNT_SID", "auth_token": "YOUR_AUTH_TOKEN", "from_number": "+254XXX"}',
  1,
  100,
  1000
),
(
  'in_app',
  true,
  '{}',
  1000,
  100000,
  1000000
)
ON CONFLICT (channel_type) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- Schedule notification queue processing
SELECT cron.schedule(
  'process-notification-queue',
  '* * * * *', -- Run every minute
  'SELECT process_notification_queue()'
);

-- Schedule cleanup of expired notifications
SELECT cron.schedule(
  'cleanup-notifications',
  '0 3 * * *', -- Run daily at 3 AM
  'SELECT cleanup_expired_notifications()'
);
