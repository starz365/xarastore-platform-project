-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR := 'ORD';
  year_part VARCHAR;
  month_part VARCHAR;
  sequence_number INTEGER;
  new_order_number VARCHAR;
BEGIN
  -- Get current year and month
  year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
  month_part := LPAD(EXTRACT(MONTH FROM NOW())::VARCHAR, 2, '0');
  
  -- Get next sequence number for this month
  WITH max_order AS (
    SELECT 
      MAX(SUBSTRING(order_number FROM '^ORD-\d{4}-(\d{2})-(\d+)$')::INTEGER) as max_seq
    FROM orders
    WHERE order_number LIKE 'ORD-' || year_part || '-' || month_part || '-%'
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_order;
  
  -- Construct order number
  new_order_number := prefix || '-' || year_part || '-' || month_part || '-' || 
                     LPAD(sequence_number::VARCHAR, 6, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR := 'INV';
  year_part VARCHAR;
  month_part VARCHAR;
  sequence_number INTEGER;
  new_invoice_number VARCHAR;
BEGIN
  -- Get current year and month
  year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
  month_part := LPAD(EXTRACT(MONTH FROM NOW())::VARCHAR, 2, '0');
  
  -- Get next sequence number for this month
  WITH max_invoice AS (
    SELECT 
      MAX(SUBSTRING(invoice_number FROM '^INV-\d{4}-(\d{2})-(\d+)$')::INTEGER) as max_seq
    FROM payments
    WHERE invoice_number LIKE 'INV-' || year_part || '-' || month_part || '-%'
      AND invoice_number IS NOT NULL
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_invoice;
  
  -- Construct invoice number
  new_invoice_number := prefix || '-' || year_part || '-' || month_part || '-' || 
                       LPAD(sequence_number::VARCHAR, 6, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate tracking numbers
CREATE OR REPLACE FUNCTION generate_tracking_number(carrier VARCHAR DEFAULT 'XARA')
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR;
  date_part VARCHAR;
  random_part VARCHAR;
  new_tracking_number VARCHAR;
BEGIN
  -- Set prefix based on carrier
  CASE UPPER(carrier)
    WHEN 'DHL' THEN prefix := 'DHL';
    WHEN 'FEDEX' THEN prefix := 'FX';
    WHEN 'UPS' THEN prefix := 'UPS';
    WHEN 'ARAMEX' THEN prefix := 'ARMX';
    ELSE prefix := UPPER(carrier);
  END CASE;
  
  -- Get date part (YYMMDD)
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Generate random part (6 alphanumeric characters)
  random_part := SUBSTRING(
    MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT)
    FROM 1 FOR 6
  );
  
  -- Construct tracking number
  new_tracking_number := prefix || date_part || UPPER(random_part);
  
  RETURN new_tracking_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate SKU numbers
CREATE OR REPLACE FUNCTION generate_sku(
  category_code VARCHAR DEFAULT 'GEN',
  brand_code VARCHAR DEFAULT '000',
  sequence_length INTEGER DEFAULT 5
)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR;
  sequence_number INTEGER;
  new_sku VARCHAR;
BEGIN
  -- Construct prefix
  prefix := UPPER(category_code) || '-' || UPPER(brand_code) || '-';
  
  -- Get next sequence number
  WITH max_sku AS (
    SELECT 
      MAX(SUBSTRING(sku FROM '^[A-Z]{3}-[A-Z0-9]{3}-(\d+)$')::INTEGER) as max_seq
    FROM products
    WHERE sku LIKE prefix || '%'
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_sku;
  
  -- Construct SKU
  new_sku := prefix || LPAD(sequence_number::VARCHAR, sequence_length, '0');
  
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate discount codes
CREATE OR REPLACE FUNCTION generate_discount_code(
  code_type VARCHAR DEFAULT 'SALE',
  length INTEGER DEFAULT 8
)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR;
  random_part VARCHAR;
  new_code VARCHAR;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Set prefix based on code type
  CASE UPPER(code_type)
    WHEN 'SALE' THEN prefix := 'SALE';
    WHEN 'WELCOME' THEN prefix := 'WELCOME';
    WHEN 'LOYALTY' THEN prefix := 'LOYAL';
    WHEN 'SEASONAL' THEN prefix := 'SEASON';
    WHEN 'FLASH' THEN prefix := 'FLASH';
    ELSE prefix := UPPER(code_type);
  END CASE;
  
  -- Generate unique code
  WHILE attempts < max_attempts LOOP
    -- Generate random part
    random_part := SUBSTRING(
      MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT)
      FROM 1 FOR length - LENGTH(prefix)
    );
    
    -- Construct code
    new_code := UPPER(prefix || random_part);
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM discounts WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
  END LOOP;
  
  -- If we couldn't generate a unique code, throw an error
  RAISE EXCEPTION 'Could not generate unique discount code after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  user_initials VARCHAR;
  random_part VARCHAR;
  new_code VARCHAR;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Get user initials from email or name
  SELECT 
    COALESCE(
      UPPER(SUBSTRING(full_name FROM '^([A-Z])[A-Z]*\s+([A-Z])[A-Z]*$')),
      UPPER(SUBSTRING(email FROM '^([A-Z])[A-Z]*'))
    ) INTO user_initials
  FROM users
  WHERE id = user_id;
  
  -- Default to 'XR' if no initials
  IF user_initials IS NULL OR user_initials = '' THEN
    user_initials := 'XR';
  END IF;
  
  -- Generate unique code
  WHILE attempts < max_attempts LOOP
    -- Generate random part (4 alphanumeric characters)
    random_part := SUBSTRING(
      MD5(RANDOM()::TEXT || user_id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT)
      FROM 1 FOR 4
    );
    
    -- Construct code
    new_code := UPPER(user_initials || random_part);
    
    -- Check if code already exists in user metadata
    IF NOT EXISTS (
      SELECT 1 
      FROM users 
      WHERE metadata->>'referral_code' = new_code
    ) THEN
      -- Update user with referral code
      UPDATE users
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{referral_code}',
        to_jsonb(new_code)
      )
      WHERE id = user_id;
      
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
  END LOOP;
  
  -- Fallback: use timestamp-based code
  new_code := UPPER(user_initials || TO_CHAR(EXTRACT(EPOCH FROM NOW()), 'FM9999'));
  
  UPDATE users
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{referral_code}',
    to_jsonb(new_code)
  )
  WHERE id = user_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate payment reference numbers
CREATE OR REPLACE FUNCTION generate_payment_reference(payment_method VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR;
  date_part VARCHAR;
  random_part VARCHAR;
  new_reference VARCHAR;
BEGIN
  -- Set prefix based on payment method
  CASE UPPER(payment_method)
    WHEN 'MPESA' THEN prefix := 'MP';
    WHEN 'CARD' THEN prefix := 'CR';
    WHEN 'BANK' THEN prefix := 'BK';
    WHEN 'PAYPAL' THEN prefix := 'PP';
    ELSE prefix := 'PY';
  END CASE;
  
  -- Get date part (YYMMDDHHMM)
  date_part := TO_CHAR(NOW(), 'YYMMDDHH24MI');
  
  -- Generate random part (4 alphanumeric characters)
  random_part := SUBSTRING(
    MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT)
    FROM 1 FOR 4
  );
  
  -- Construct reference number
  new_reference := prefix || date_part || UPPER(random_part);
  
  RETURN new_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate batch numbers for inventory
CREATE OR REPLACE FUNCTION generate_batch_number(
  product_id UUID,
  supplier_code VARCHAR DEFAULT 'SUP'
)
RETURNS VARCHAR AS $$
DECLARE
  product_code VARCHAR;
  date_part VARCHAR;
  sequence_number INTEGER;
  new_batch_number VARCHAR;
BEGIN
  -- Get product code from SKU or generate one
  SELECT 
    SUBSTRING(sku FROM '^([A-Z]{3})') INTO product_code
  FROM products
  WHERE id = product_id;
  
  IF product_code IS NULL THEN
    product_code := 'PRO';
  END IF;
  
  -- Get date part (YYMMDD)
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Get next sequence number for this product and date
  WITH max_batch AS (
    SELECT 
      MAX(SUBSTRING(batch_number FROM '^[A-Z]{3}-[A-Z]{3}-\d{6}-(\d+)$')::INTEGER) as max_seq
    FROM inventory_logs
    WHERE product_id = generate_batch_number.product_id
      AND batch_number LIKE product_code || '-' || UPPER(supplier_code) || '-' || date_part || '-%'
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_batch;
  
  -- Construct batch number
  new_batch_number := product_code || '-' || UPPER(supplier_code) || '-' || 
                     date_part || '-' || LPAD(sequence_number::VARCHAR, 3, '0');
  
  RETURN new_batch_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate return authorization numbers
CREATE OR REPLACE FUNCTION generate_return_authorization_number()
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR := 'RMA';
  year_part VARCHAR;
  month_part VARCHAR;
  sequence_number INTEGER;
  new_ra_number VARCHAR;
BEGIN
  -- Get current year and month
  year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
  month_part := LPAD(EXTRACT(MONTH FROM NOW())::VARCHAR, 2, '0');
  
  -- Get next sequence number for this month
  WITH max_ra AS (
    SELECT 
      MAX(SUBSTRING(ra_number FROM '^RMA-\d{4}-(\d{2})-(\d+)$')::INTEGER) as max_seq
    FROM returns
    WHERE ra_number LIKE 'RMA-' || year_part || '-' || month_part || '-%'
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_ra;
  
  -- Construct RA number
  new_ra_number := prefix || '-' || year_part || '-' || month_part || '-' || 
                   LPAD(sequence_number::VARCHAR, 6, '0');
  
  RETURN new_ra_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate customer IDs
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR := 'CUST';
  year_part VARCHAR;
  sequence_number INTEGER;
  new_customer_id VARCHAR;
BEGIN
  -- Get current year
  year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
  
  -- Get next sequence number for this year
  WITH max_customer AS (
    SELECT 
      MAX(SUBSTRING(customer_id FROM '^CUST-\d{4}-(\d+)$')::INTEGER) as max_seq
    FROM users
    WHERE customer_id LIKE 'CUST-' || year_part || '-%'
  )
  SELECT 
    COALESCE(max_seq, 0) + 1 INTO sequence_number
  FROM max_customer;
  
  -- Construct customer ID
  new_customer_id := prefix || '-' || year_part || '-' || 
                    LPAD(sequence_number::VARCHAR, 6, '0');
  
  RETURN new_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
