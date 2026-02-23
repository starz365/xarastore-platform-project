xarastore/lib/supabase/schemas/orders.ts
export const ordersSchema = `
-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_details ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Addresses
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  
  -- Items and totals
  items JSONB NOT NULL, -- Array of order items
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Payment information
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_reference TEXT,
  mpesa_receipt TEXT,
  
  -- Shipping information
  shipping_method TEXT,
  tracking_number TEXT,
  courier TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_payment_status (payment_status),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_order_number (order_number)
);

-- Order items table for better normalization
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  
  -- Product details at time of purchase
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_image TEXT,
  variant_name TEXT,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED,
  
  -- Discounts
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_product_id (product_id),
  INDEX idx_order_items_sku (product_sku)
);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_order_status_history_order_id (order_id),
  INDEX idx_order_status_history_created_at (created_at)
);

-- Payments table for detailed payment tracking
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer', 'cash_on_delivery')),
  payment_provider TEXT,
  transaction_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Payment details
  payer_name TEXT,
  payer_email TEXT,
  payer_phone TEXT,
  payment_details JSONB,
  
  -- M-Pesa specific fields
  mpesa_receipt_number TEXT,
  mpesa_phone_number TEXT,
  mpesa_transaction_date TIMESTAMP WITH TIME ZONE,
  
  -- Card payment specific fields
  card_last_four TEXT,
  card_brand TEXT,
  
  -- Bank transfer specific fields
  bank_name TEXT,
  bank_account TEXT,
  bank_reference TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_payments_order_id (order_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_created_at (created_at),
  INDEX idx_payments_transaction_id (transaction_id)
);

-- Shipping details table
CREATE TABLE IF NOT EXISTS shipping_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Shipping provider
  courier_name TEXT NOT NULL,
  service_type TEXT,
  tracking_number TEXT UNIQUE,
  tracking_url TEXT,
  
  -- Package details
  package_weight DECIMAL(6,2),
  package_dimensions JSONB,
  package_count INTEGER DEFAULT 1,
  
  -- Delivery details
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_attempts INTEGER DEFAULT 0,
  delivery_status TEXT DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  delivery_notes TEXT,
  
  -- Proof of delivery
  recipient_name TEXT,
  recipient_signature TEXT,
  delivery_proof_images TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_shipping_details_order_id (order_id),
  INDEX idx_shipping_details_tracking_number (tracking_number),
  INDEX idx_shipping_details_delivery_status (delivery_status)
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  
  -- Refund details
  refund_reason TEXT NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_method TEXT NOT NULL
    CHECK (refund_method IN ('original_payment', 'store_credit', 'bank_transfer')),
  refund_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Processing information
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Bank transfer details (if applicable)
  bank_name TEXT,
  bank_account TEXT,
  bank_reference TEXT,
  
  -- Store credit details (if applicable)
  store_credit_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_refunds_order_id (order_id),
  INDEX idx_refunds_payment_id (payment_id),
  INDEX idx_refunds_status (refund_status)
);

-- Order returns table
CREATE TABLE IF NOT EXISTS order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id),
  
  -- Return details
  return_reason TEXT NOT NULL,
  return_status TEXT NOT NULL DEFAULT 'requested'
    CHECK (return_status IN ('requested', 'approved', 'rejected', 'received', 'inspected', 'refunded', 'exchanged')),
  return_quantity INTEGER NOT NULL CHECK (return_quantity > 0),
  
  -- Return instructions
  return_method TEXT
    CHECK (return_method IN ('pickup', 'drop_off', 'courier')),
  return_address JSONB,
  return_tracking_number TEXT,
  
  -- Inspection results
  item_condition TEXT
    CHECK (item_condition IN ('new', 'like_new', 'used', 'damaged')),
  inspection_notes TEXT,
  
  -- Resolution
  resolution_type TEXT
    CHECK (resolution_type IN ('refund', 'exchange', 'store_credit')),
  resolution_amount DECIMAL(10,2),
  resolution_notes TEXT,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  inspected_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_order_returns_order_id (order_id),
  INDEX idx_order_returns_status (return_status)
);

-- RLS Policies

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can view their own order items
CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own order status history
CREATE POLICY "Users can view own order status history"
ON order_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_history.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payments.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own shipping details
CREATE POLICY "Users can view own shipping details"
ON shipping_details FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = shipping_details.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own refunds
CREATE POLICY "Users can view own refunds"
ON refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = refunds.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Users can view their own returns
CREATE POLICY "Users can view own returns"
ON order_returns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_returns.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Functions

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || 
    TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' ||
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate order number
CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Function to update order status and record history
CREATE OR REPLACE FUNCTION update_order_status(
  order_id_to_update UUID,
  new_status TEXT,
  changed_by_user_id UUID DEFAULT NULL,
  notes_to_add TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update order status
  UPDATE orders
  SET 
    status = new_status,
    updated_at = NOW(),
    cancelled_at = CASE 
      WHEN new_status = 'cancelled' AND cancelled_at IS NULL THEN NOW()
      ELSE cancelled_at
    END,
    refunded_at = CASE 
      WHEN new_status = 'refunded' AND refunded_at IS NULL THEN NOW()
      ELSE refunded_at
    END
  WHERE id = order_id_to_update;
  
  -- Record status change
  INSERT INTO order_status_history (
    order_id,
    status,
    changed_by,
    notes
  ) VALUES (
    order_id_to_update,
    new_status,
    changed_by_user_id,
    notes_to_add
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(
  order_id_to_calculate UUID
)
RETURNS TABLE (
  subtotal DECIMAL(10,2),
  total_discount DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  shipping_fee DECIMAL(10,2),
  total_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(oi.unit_price * oi.quantity), 0) as subtotal,
    COALESCE(SUM(oi.discount_amount * oi.quantity), 0) as total_discount,
    -- Calculate 16% VAT in Kenya
    COALESCE(SUM((oi.unit_price * oi.quantity) * 0.16), 0) as total_tax,
    COALESCE(o.shipping_fee, 0) as shipping_fee,
    COALESCE(SUM(oi.unit_price * oi.quantity), 0) + 
    COALESCE(o.shipping_fee, 0) + 
    COALESCE(SUM((oi.unit_price * oi.quantity) * 0.16), 0) -
    COALESCE(SUM(oi.discount_amount * oi.quantity), 0) as total_amount
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.id = order_id_to_calculate
  GROUP BY o.shipping_fee;
END;
$$ LANGUAGE plpgsql;

-- Function to check if order can be cancelled
CREATE OR REPLACE FUNCTION can_cancel_order(order_id_to_check UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
  order_age INTERVAL;
BEGIN
  SELECT status, NOW() - created_at INTO current_status, order_age
  FROM orders
  WHERE id = order_id_to_check;
  
  -- Can cancel if order is pending or confirmed and less than 1 hour old
  RETURN current_status IN ('pending', 'confirmed') AND order_age < INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to get order statistics
CREATE OR REPLACE FUNCTION get_order_statistics(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue DECIMAL(15,2),
  avg_order_value DECIMAL(10,2),
  completed_orders BIGINT,
  pending_orders BIGINT,
  cancelled_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_orders,
    COALESCE(SUM(total_amount), 0) as total_revenue,
    COALESCE(AVG(total_amount), 0) as avg_order_value,
    COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'processing')) as pending_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
  FROM orders
  WHERE 
    (start_date IS NULL OR created_at >= start_date) AND
    (end_date IS NULL OR created_at <= end_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Function to get user's order history
CREATE OR REPLACE FUNCTION get_user_order_history(
  user_id_to_check UUID,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  status TEXT,
  total_amount DECIMAL(10,2),
  item_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as order_id,
    o.order_number,
    o.status,
    o.total_amount,
    COUNT(oi.id) as item_count,
    o.created_at,
    o.estimated_delivery_date
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.user_id = user_id_to_check
  GROUP BY o.id, o.order_number, o.status, o.total_amount, o.created_at, o.estimated_delivery_date
  ORDER BY o.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old pending orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void AS $$
BEGIN
  -- Cancel orders that have been pending for more than 24 hours
  UPDATE orders
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW(),
    internal_notes = CONCAT(internal_notes, E'\n', 'Automatically cancelled: Order pending for more than 24 hours')
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_order_items_unit_price ON order_items(unit_price);
CREATE INDEX idx_order_items_created_at ON order_items(created_at);

CREATE INDEX idx_order_status_history_status ON order_status_history(status);
CREATE INDEX idx_order_status_history_changed_by ON order_status_history(changed_by);

CREATE INDEX idx_payments_mpesa_receipt ON payments(mpesa_receipt_number);
CREATE INDEX idx_payments_completed_at ON payments(completed_at);

CREATE INDEX idx_shipping_details_delivery_date ON shipping_details(estimated_delivery_date, actual_delivery_date);

CREATE INDEX idx_refunds_created_at ON refunds(created_at);

CREATE INDEX idx_order_returns_requested_at ON order_returns(requested_at);

-- Create scheduled job for cleanup (run daily)
-- This would be set up in your database cron jobs
SELECT cron.schedule(
  'cleanup-expired-orders',
  '0 2 * * *', -- Run daily at 2 AM
  'SELECT cleanup_expired_pending_orders()'
);
`;
