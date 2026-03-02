-- Create stock notifications table
CREATE TABLE IF NOT EXISTS stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'notified', 'cancelled', 'expired')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create preorders table
CREATE TABLE IF NOT EXISTS preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'fulfilled')),
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES stock_notifications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add preorder fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allow_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_restock_date TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX idx_stock_notifications_product ON stock_notifications(product_id);
CREATE INDEX idx_stock_notifications_email ON stock_notifications(email);
CREATE INDEX idx_stock_notifications_status ON stock_notifications(status);
CREATE INDEX idx_preorders_user ON preorders(user_id);
CREATE INDEX idx_preorders_status ON preorders(status);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

-- Enable RLS
ALTER TABLE stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_notifications
CREATE POLICY "Users can view their own notifications" 
ON stock_notifications FOR SELECT 
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create notifications" 
ON stock_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can cancel their own notifications" 
ON stock_notifications FOR UPDATE 
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS Policies for preorders
CREATE POLICY "Users can view their own preorders" 
ON preorders FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create preorders" 
ON preorders FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to notify users when product is back in stock
CREATE OR REPLACE FUNCTION notify_stock_available()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock > 0 AND OLD.stock = 0 THEN
    -- Update all pending notifications to 'notified' status
    UPDATE stock_notifications
    SET status = 'notified', notified_at = NOW(), updated_at = NOW()
    WHERE product_id = NEW.id AND status = 'pending';
    
    -- Log the notifications
    INSERT INTO notification_logs (notification_id, type, metadata)
    SELECT id, 'stock_available', jsonb_build_object('product_id', NEW.id, 'stock', NEW.stock)
    FROM stock_notifications
    WHERE product_id = NEW.id AND status = 'notified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for stock availability
CREATE TRIGGER notify_stock_available_trigger
AFTER UPDATE ON products
FOR EACH ROW
WHEN (NEW.stock > 0 AND OLD.stock = 0)
EXECUTE FUNCTION notify_stock_available();
