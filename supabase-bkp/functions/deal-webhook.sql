-- Edge function to handle deal-related webhooks
CREATE OR REPLACE FUNCTION handle_deal_webhook()
RETURNS JSON AS $$
DECLARE
  payload JSON;
  event_type TEXT;
  deal_id UUID;
  product_record RECORD;
BEGIN
  -- Get the webhook payload
  payload := current_setting('request.headers', true)::json->'payload';
  event_type := payload->>'type';
  
  -- Handle different event types
  CASE event_type
    WHEN 'deal.created' THEN
      -- New deal created
      deal_id := (payload->'data'->>'id')::UUID;
      
      -- Update product deal status
      UPDATE products 
      SET is_deal = true,
          deal_ends_at = (payload->'data'->>'end_date')::TIMESTAMP,
          updated_at = NOW()
      WHERE id IN (
        SELECT product_id FROM deal_products WHERE campaign_id = deal_id
      );
      
      -- Log the event
      INSERT INTO webhook_logs (event_type, payload, status)
      VALUES (event_type, payload, 'processed');
      
    WHEN 'deal.updated' THEN
      -- Deal updated
      deal_id := (payload->'data'->>'id')::UUID;
      
      -- Check if deal is still active
      IF (payload->'data'->>'is_active')::BOOLEAN = false THEN
        -- Deal ended, update products
        UPDATE products 
        SET is_deal = false,
            updated_at = NOW()
        WHERE id IN (
          SELECT product_id FROM deal_products WHERE campaign_id = deal_id
        );
      END IF;
      
      -- Log the event
      INSERT INTO webhook_logs (event_type, payload, status)
      VALUES (event_type, payload, 'processed');
      
    WHEN 'deal.expired' THEN
      -- Deal expired automatically
      SELECT * INTO product_record
      FROM products 
      WHERE id = (payload->'data'->>'product_id')::UUID;
      
      IF product_record.id IS NOT NULL THEN
        -- Send notification to users who had it in cart
        PERFORM notify_deal_expired(product_record.id, product_record.name);
        
        -- Update product
        UPDATE products 
        SET is_deal = false,
            updated_at = NOW()
        WHERE id = product_record.id;
      END IF;
      
      -- Log the event
      INSERT INTO webhook_logs (event_type, payload, status)
      VALUES (event_type, payload, 'processed');
      
    ELSE
      -- Unknown event type
      INSERT INTO webhook_logs (event_type, payload, status, error_message)
      VALUES (event_type, payload, 'failed', 'Unknown event type');
      
      RETURN json_build_object(
        'error', 'Unknown event type',
        'event_type', event_type
      );
  END CASE;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'event_type', event_type,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify users about expired deal
CREATE OR REPLACE FUNCTION notify_deal_expired(
  product_id UUID,
  product_name TEXT
)
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get users who had this product in cart
  FOR user_record IN 
    SELECT DISTINCT uc.user_id, u.email
    FROM user_carts uc
    JOIN users u ON uc.user_id = u.id
    WHERE uc.items @> jsonb_build_array(
      jsonb_build_object('product_id', product_id::text)
    )
  LOOP
    -- Send notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      user_record.user_id,
      'deal_expired',
      'Deal Expired',
      'The deal on ' || product_name || ' has expired',
      jsonb_build_object(
        'product_id', product_id,
        'product_name', product_name
      ),
      NOW()
    );
    
    -- Send email (in production, integrate with email service)
    -- PERFORM send_deal_expired_email(user_record.email, product_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for webhook logs
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type, status);
