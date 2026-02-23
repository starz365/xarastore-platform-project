-- Order tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order tracking steps
CREATE TABLE IF NOT EXISTS order_tracking_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID REFERENCES order_tracking(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own order tracking"
ON order_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_tracking.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage order tracking"
ON order_tracking FOR ALL
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own tracking steps"
ON order_tracking_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM order_tracking
    JOIN orders ON orders.id = order_tracking.order_id
    WHERE order_tracking.id = order_tracking_steps.tracking_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage tracking steps"
ON order_tracking_steps FOR ALL
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Indexes
CREATE INDEX idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX idx_order_tracking_tracking_number ON order_tracking(tracking_number);
CREATE INDEX idx_order_tracking_steps_tracking_id ON order_tracking_steps(tracking_id);
CREATE INDEX idx_order_tracking_steps_timestamp ON order_tracking_steps(timestamp DESC);

-- Function to create tracking for new orders
CREATE OR REPLACE FUNCTION create_order_tracking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'shipped' THEN
    INSERT INTO order_tracking (
      order_id,
      carrier,
      tracking_number,
      status,
      estimated_delivery
    ) VALUES (
      NEW.id,
      'Xarastore Logistics',
      'TRK' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
      'in_transit',
      NEW.estimated_delivery
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order tracking
CREATE TRIGGER create_order_tracking_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status != 'shipped' AND NEW.status = 'shipped')
EXECUTE FUNCTION create_order_tracking();

-- Function to update tracking status
CREATE OR REPLACE FUNCTION update_tracking_status(
  p_tracking_number TEXT,
  p_status TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tracking_id UUID;
  v_order_id UUID;
  v_result JSONB;
BEGIN
  -- Get tracking record
  SELECT id, order_id INTO v_tracking_id, v_order_id
  FROM order_tracking
  WHERE tracking_number = p_tracking_number;
  
  IF v_tracking_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Tracking number not found');
  END IF;
  
  -- Update tracking status
  UPDATE order_tracking
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = v_tracking_id;
  
  -- Add tracking step
  INSERT INTO order_tracking_steps (
    tracking_id,
    status,
    location,
    description,
    timestamp
  ) VALUES (
    v_tracking_id,
    p_status,
    COALESCE(p_location, 'Unknown'),
    p_description,
    NOW()
  );
  
  -- Update order status if delivered
  IF p_status = 'delivered' THEN
    UPDATE orders
    SET 
      status = 'delivered',
      updated_at = NOW()
    WHERE id = v_order_id;
  END IF;
  
  -- Return success
  v_result = jsonb_build_object(
    'success', true,
    'tracking_id', v_tracking_id,
    'order_id', v_order_id,
    'status', p_status
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
