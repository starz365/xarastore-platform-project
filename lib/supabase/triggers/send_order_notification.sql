-- Trigger function to send notifications for new orders
CREATE OR REPLACE FUNCTION send_order_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_title VARCHAR;
  v_notification_message TEXT;
  v_admin_notification_title VARCHAR;
  v_admin_notification_message TEXT;
BEGIN
  -- Only send notifications for new orders (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Customer notification
    v_notification_title := 'Order Confirmed';
    v_notification_message := 'Thank you for your order ' || NEW.order_number || '. We are processing it now.';
    
    -- Admin notification
    v_admin_notification_title := 'New Order Received';
    v_admin_notification_message := 'New order ' || NEW.order_number || ' received from customer.';
    
    -- Send notification to customer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_sent,
      sent_at
    ) VALUES (
      NEW.user_id,
      'order',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'order_date', NEW.created_at,
        'order_total', NEW.total_amount,
        'status', NEW.status
      ),
      true,
      NOW()
    );
    
    -- Send notification to all admin users
    -- In production, you might have a specific role or group for admin users
    -- For now, we'll send to users with admin role in metadata
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_sent,
      sent_at
    )
    SELECT 
      u.id,
      'order',
      v_admin_notification_title,
      v_admin_notification_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'order_date', NEW.created_at,
        'order_total', NEW.total_amount,
        'customer_id', NEW.user_id,
        'status', NEW.status
      ),
      true,
      NOW()
    FROM users u
    WHERE u.metadata->>'role' = 'admin'
      AND u.is_active = true;
    
    -- Send email notifications (in production, this would trigger email service)
    -- PERFORM send_order_confirmation_email(NEW.user_id, NEW.id);
    -- PERFORM send_new_order_admin_email(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for orders table
DROP TRIGGER IF EXISTS send_order_notification_trigger ON orders;
CREATE TRIGGER send_order_notification_trigger
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION send_order_notification();

-- Function to send payment notifications
CREATE OR REPLACE FUNCTION send_payment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_order_record RECORD;
  v_notification_title VARCHAR;
  v_notification_message TEXT;
BEGIN
  -- Only send notifications for new payments (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Get order details
    SELECT o.* INTO v_order_record
    FROM orders o
    WHERE o.id = NEW.order_id;
    
    -- Determine notification content based on payment status
    CASE NEW.status
      WHEN 'paid' THEN
        v_notification_title := 'Payment Confirmed';
        v_notification_message := 'Payment for order ' || v_order_record.order_number || ' has been confirmed.';
      
      WHEN 'failed' THEN
        v_notification_title := 'Payment Failed';
        v_notification_message := 'Payment for order ' || v_order_record.order_number || ' has failed. Please try again.';
      
      WHEN 'refunded' THEN
        v_notification_title := 'Payment Refunded';
        v_notification_message := 'Payment for order ' || v_order_record.order_number || ' has been refunded.';
      
      ELSE
        RETURN NEW; -- Don't send notification for other statuses
    END CASE;
    
    -- Send notification to customer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_sent,
      sent_at
    ) VALUES (
      v_order_record.user_id,
      'payment',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'order_id', NEW.order_id,
        'order_number', v_order_record.order_number,
        'payment_id', NEW.id,
        'payment_amount', NEW.amount,
        'payment_method', NEW.method,
        'payment_status', NEW.status,
        'transaction_id', NEW.transaction_id
      ),
      true,
      NOW()
    );
    
    -- Send email notification (in production, this would trigger email service)
    -- PERFORM send_payment_confirmation_email(v_order_record.user_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payments table
DROP TRIGGER IF EXISTS send_payment_notification_trigger ON payments;
CREATE TRIGGER send_payment_notification_trigger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION send_payment_notification();

-- Function to send shipment notifications
CREATE OR REPLACE FUNCTION send_shipment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_title VARCHAR;
  v_notification_message TEXT;
BEGIN
  -- Send notification when tracking number is added or updated
  IF NEW.tracking_number IS NOT NULL AND 
     (OLD.tracking_number IS NULL OR OLD.tracking_number != NEW.tracking_number) THEN
    
    v_notification_title := 'Order Shipped';
    v_notification_message := 'Your order ' || NEW.order_number || ' has been shipped. Tracking number: ' || NEW.tracking_number;
    
    -- Send notification to customer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_sent,
      sent_at
    ) VALUES (
      NEW.user_id,
      'shipment',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'tracking_number', NEW.tracking_number,
        'carrier', NEW.carrier,
        'estimated_delivery', NEW.estimated_delivery,
        'status', NEW.status
      ),
      true,
      NOW()
    );
    
    -- Send email notification (in production, this would trigger email service)
    -- PERFORM send_shipment_notification_email(NEW.user_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for orders table (shipment updates)
DROP TRIGGER IF EXISTS send_shipment_notification_trigger ON orders;
CREATE TRIGGER send_shipment_notification_trigger
AFTER UPDATE OF tracking_number ON orders
FOR EACH ROW EXECUTE FUNCTION send_shipment_notification();

-- Function to send review reminder notifications
CREATE OR REPLACE FUNCTION send_review_reminder_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_order_record RECORD;
  v_days_since_delivery INTEGER;
  v_notification_title VARCHAR;
  v_notification_message TEXT;
  v_product_names TEXT[];
  v_product_id UUID;
  v_product_name VARCHAR;
BEGIN
  -- Only send for delivered orders
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get order details
    SELECT * INTO v_order_record
    FROM orders
    WHERE id = NEW.id;
    
    -- Wait 3 days after delivery before sending review reminder
    -- This would be scheduled via a cron job in production
    -- For now, we'll just create a scheduled notification
    
    v_notification_title := 'How was your order?';
    v_notification_message := 'Please share your experience with order ' || v_order_record.order_number;
    
    -- Extract product names for personalized message
    SELECT ARRAY_AGG(p.name) INTO v_product_names
    FROM products p
    WHERE p.id IN (
      SELECT (item->>'product_id')::UUID
      FROM jsonb_array_elements(v_order_record.items) AS item
    );
    
    IF v_product_names IS NOT NULL AND array_length(v_product_names, 1) > 0 THEN
      v_notification_message := v_notification_message || ' Products: ' || array_to_string(v_product_names, ', ');
    END IF;
    
    -- Create scheduled notification (to be sent after 3 days)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_sent,
      scheduled_for,
      sent_at
    ) VALUES (
      v_order_record.user_id,
      'promotion',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', v_order_record.order_number,
        'delivered_at', NEW.delivered_at,
        'reminder_type', 'review',
        'scheduled_delay_days', 3
      ),
      false,
      NOW() + INTERVAL '3 days',
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for orders table (review reminders)
DROP TRIGGER IF EXISTS send_review_reminder_notification_trigger ON orders;
CREATE TRIGGER send_review_reminder_notification_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION send_review_reminder_notification();

-- Function to send abandoned cart reminders
CREATE OR REPLACE FUNCTION send_abandoned_cart_reminder()
RETURNS TRIGGER AS $$
DECLARE
  v_cart_record RECORD;
  v_hours_since_update INTEGER;
  v_notification_title VARCHAR;
  v_notification_message TEXT;
  v_item_count INTEGER;
  v_cart_total DECIMAL;
BEGIN
  -- Only send for carts with items
  IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
    -- Check if cart was updated more than 1 hour ago
    v_hours_since_update := EXTRACT(EPOCH FROM (NOW() - NEW.updated_at)) / 3600;
    
    -- Send first reminder after 1 hour
    IF v_hours_since_update >= 1 AND v_hours_since_update < 2 THEN
      v_item_count := jsonb_array_length(NEW.items);
      
      -- Calculate cart total
      SELECT SUM((item->>'price')::DECIMAL * (item->>'quantity')::INTEGER) INTO v_cart_total
      FROM jsonb_array_elements(NEW.items) AS item;
      
      v_notification_title := 'Don''t forget your cart!';
      v_notification_message := 'You have ' || v_item_count || ' item(s) in your cart totaling KES ' || 
                               COALESCE(v_cart_total, 0) || '. Complete your purchase now!';
      
      -- Only send if user is logged in
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_sent,
          sent_at
        ) VALUES (
          NEW.user_id,
          'promotion',
          v_notification_title,
          v_notification_message,
          jsonb_build_object(
            'cart_id', NEW.id,
            'item_count', v_item_count,
            'cart_total', v_cart_total,
            'reminder_type', 'abandoned_cart',
            'reminder_number', 1
          ),
          true,
          NOW()
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for shopping_carts table (abandoned cart reminders)
-- Note: This trigger would need to be optimized in production
-- DROP TRIGGER IF EXISTS send_abandoned_cart_reminder_trigger ON shopping_carts;
-- CREATE TRIGGER send_abandoned_cart_reminder_trigger
-- AFTER UPDATE OF items, updated_at ON shopping_carts
-- FOR EACH ROW EXECUTE FUNCTION send_abandoned_cart_reminder();

-- Function to send back in stock notifications
CREATE OR REPLACE FUNCTION send_back_in_stock_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stock INTEGER;
  v_new_stock INTEGER;
  v_wishlist_users UUID[];
  v_user_id UUID;
  v_notification_title VARCHAR;
  v_notification_message TEXT;
BEGIN
  v_old_stock := OLD.stock;
  v_new_stock := NEW.stock;
  
  -- Check if product just came back in stock (was 0, now > 0)
  IF v_old_stock = 0 AND v_new_stock > 0 THEN
    -- Get users who have this product in their wishlist
    SELECT ARRAY_AGG(user_id) INTO v_wishlist_users
    FROM wishlist
    WHERE product_id = NEW.id;
    
    -- Send notification to each user
    IF v_wishlist_users IS NOT NULL THEN
      FOREACH v_user_id IN ARRAY v_wishlist_users
      LOOP
        v_notification_title := 'Back in Stock!';
        v_notification_message := NEW.name || ' is now back in stock.';
        
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_sent,
          sent_at
        ) VALUES (
          v_user_id,
          'promotion',
          v_notification_title,
          v_notification_message,
          jsonb_build_object(
            'product_id', NEW.id,
            'product_name', NEW.name,
            'product_slug', NEW.slug,
            'product_price', NEW.price,
            'stock_quantity', v_new_stock,
            'notification_type', 'back_in_stock'
          ),
          true,
          NOW()
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table (back in stock)
DROP TRIGGER IF EXISTS send_back_in_stock_notification_trigger ON products;
CREATE TRIGGER send_back_in_stock_notification_trigger
AFTER UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION send_back_in_stock_notification();

-- Function to send price drop notifications
CREATE OR REPLACE FUNCTION send_price_drop_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_old_price DECIMAL;
  v_new_price DECIMAL;
  v_price_drop_percent DECIMAL;
  v_wishlist_users UUID[];
  v_user_id UUID;
  v_notification_title VARCHAR;
  v_notification_message TEXT;
  v_discount_threshold DECIMAL := 10; -- Notify for price drops of 10% or more
BEGIN
  v_old_price := OLD.price;
  v_new_price := NEW.price;
  
  -- Check if price dropped significantly
  IF v_old_price > 0 AND v_new_price < v_old_price THEN
    v_price_drop_percent := ((v_old_price - v_new_price) / v_old_price) * 100;
    
    IF v_price_drop_percent >= v_discount_threshold THEN
      -- Get users who have this product in their wishlist
      SELECT ARRAY_AGG(user_id) INTO v_wishlist_users
      FROM wishlist
      WHERE product_id = NEW.id;
      
      -- Send notification to each user
      IF v_wishlist_users IS NOT NULL THEN
        FOREACH v_user_id IN ARRAY v_wishlist_users
        LOOP
          v_notification_title := 'Price Drop Alert!';
          v_notification_message := NEW.name || ' price dropped by ' || 
                                   ROUND(v_price_drop_percent, 0) || '%. New price: KES ' || v_new_price;
          
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data,
            is_sent,
            sent_at
          ) VALUES (
            v_user_id,
            'promotion',
            v_notification_title,
            v_notification_message,
            jsonb_build_object(
              'product_id', NEW.id,
              'product_name', NEW.name,
              'product_slug', NEW.slug,
              'old_price', v_old_price,
              'new_price', v_new_price,
              'price_drop_percent', v_price_drop_percent,
              'notification_type', 'price_drop'
            ),
            true,
            NOW()
          );
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table (price drops)
DROP TRIGGER IF EXISTS send_price_drop_notification_trigger ON products;
CREATE TRIGGER send_price_drop_notification_trigger
AFTER UPDATE OF price ON products
FOR EACH ROW EXECUTE FUNCTION send_price_drop_notification();

-- Function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_notification RECORD;
BEGIN
  -- Find scheduled notifications that are due
  FOR v_notification IN 
    SELECT id, user_id, type, title, message, data
    FROM notifications
    WHERE is_sent = false
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW()
    LIMIT 100 -- Process in batches
  LOOP
    -- Mark as sent and update sent_at
    UPDATE notifications
    SET 
      is_sent = true,
      sent_at = NOW(),
      updated_at = NOW()
    WHERE id = v_notification.id;
    
    -- In production, you might also:
    -- 1. Send email based on notification type
    -- 2. Send push notification
    -- 3. Update other systems
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old sent notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_retention_days INTEGER := 90; -- Keep notifications for 90 days
BEGIN
  DELETE FROM notifications
  WHERE is_sent = true
    AND sent_at < NOW() - (v_retention_days || ' days')::INTERVAL
  RETURNING COUNT(*) INTO v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'payment', 'shipment', 'promotion', 'system')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel, type)
);

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_channel ON notification_preferences(channel);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(type);

-- Trigger for notification preferences updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user wants to receive a notification
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_channel VARCHAR,
  p_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_preference_exists BOOLEAN;
  v_preference_enabled BOOLEAN;
BEGIN
  -- Check if user has a preference for this channel and type
  SELECT TRUE, enabled INTO v_preference_exists, v_preference_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND type = p_type;
  
  -- If no preference exists, default to enabled
  IF NOT v_preference_exists THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_preference_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
