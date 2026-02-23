scripts/db/seeds/products.sql
-- Insert sample products with realistic data for Xarastore
-- Products are admin-configurable via the admin dashboard
-- All IDs are UUIDs for consistency with production

INSERT INTO public.products (id, slug, name, description, price, original_price, sku, brand_id, category_id, images, specifications, rating, review_count, stock, is_featured, is_deal, deal_ends_at, created_at, updated_at) VALUES
-- Electronics Category
(
    '550e8400-e29b-41d4-a716-446655440001',
    'samsung-galaxy-s23',
    'Samsung Galaxy S23 5G',
    'Experience the ultimate smartphone with Samsung Galaxy S23. Featuring a professional-grade camera, stunning Dynamic AMOLED 2X display, and powerful Snapdragon processor for exceptional performance.',
    124999,
    139999,
    'SM-S23-256GB-BLK',
    (SELECT id FROM brands WHERE slug = 'samsung'),
    (SELECT id FROM categories WHERE slug = 'smartphones'),
    ARRAY['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format'],
    '{"display": "6.1-inch Dynamic AMOLED 2X", "processor": "Snapdragon 8 Gen 2", "ram": "8GB", "storage": "256GB", "camera": "50MP + 12MP + 10MP", "battery": "3900mAh", "os": "Android 13"}',
    4.7,
    124,
    45,
    true,
    true,
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'apple-macbook-air-m2',
    'Apple MacBook Air M2',
    'Supercharged by the Apple M2 chip, MacBook Air delivers incredible performance and up to 18 hours of battery life in an incredibly thin and light design.',
    189999,
    209999,
    'MBA-M2-256-SP',
    (SELECT id FROM brands WHERE slug = 'apple'),
    (SELECT id FROM categories WHERE slug = 'laptops'),
    ARRAY['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format'],
    '{"display": "13.6-inch Liquid Retina", "processor": "Apple M2", "ram": "8GB", "storage": "256GB SSD", "battery": "Up to 18 hours", "weight": "1.24kg", "os": "macOS Ventura"}',
    4.8,
    89,
    32,
    true,
    false,
    NULL,
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'sony-wh-1000xm5',
    'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    'Industry-leading noise cancellation with Dual Noise Sensor technology. Enjoy premium sound quality with 30-hour battery life and quick charging.',
    44999,
    54999,
    'WH-1000XM5-BLK',
    (SELECT id FROM brands WHERE slug = 'sony'),
    (SELECT id FROM categories WHERE slug = 'headphones'),
    ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format'],
    '{"noise_cancellation": "Industry-leading", "battery_life": "30 hours", "charging": "Quick charge (3 min = 3 hours)", "weight": "250g", "connectivity": "Bluetooth 5.2", "microphones": "8 microphones"}',
    4.6,
    203,
    67,
    true,
    true,
    NOW() + INTERVAL '3 days',
    NOW(),
    NOW()
),
-- Fashion Category
(
    '550e8400-e29b-41d4-a716-446655440004',
    'nike-air-max-270',
    'Nike Air Max 270 Mens Running Shoes',
    'The Nike Air Max 270 delivers unrivaled, all-day comfort. The oversized Max Air unit provides maximum cushioning under every step.',
    12999,
    15999,
    'NIKE-AM270-BLK',
    (SELECT id FROM brands WHERE slug = 'nike'),
    (SELECT id FROM categories WHERE slug = 'shoes'),
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format'],
    '{"material": "Synthetic leather and mesh", "sole": "Rubber", "closure": "Lace-up", "weight": "320g", "air_unit": "270° Max Air", "color": "Black/White"}',
    4.4,
    56,
    128,
    false,
    true,
    NOW() + INTERVAL '5 days',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'levis-501-original-fit',
    'Levis 501 Original Fit Jeans',
    'The original Levi''s® jeans. Iconic button fly, straight leg, and timeless style that fits your life.',
    8999,
    11999,
    'LEVIS-501-34',
    (SELECT id FROM brands WHERE slug = 'levis'),
    (SELECT id FROM categories WHERE slug = 'jeans'),
    ARRAY['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format'],
    '{"fit": "Original Fit", "rise": "Mid Rise", "leg_opening": "16 inches", "material": "100% Cotton", "wash": "Dark Stonewash", "closure": "Button Fly"}',
    4.3,
    42,
    89,
    false,
    false,
    NULL,
    NOW(),
    NOW()
),
-- Home & Kitchen
(
    '550e8400-e29b-41d4-a716-446655440006',
    'instant-pot-duo-plus',
    'Instant Pot Duo Plus 9-in-1 Electric Pressure Cooker',
    '9-in-1 functionality: Pressure Cooker, Slow Cooker, Rice Cooker, Yogurt Maker, Cake Maker, and more. 8-quart capacity perfect for family meals.',
    18999,
    24999,
    'IP-DUO-PLUS-8',
    (SELECT id FROM brands WHERE slug = 'instant-pot'),
    (SELECT id FROM categories WHERE slug = 'kitchen-appliances'),
    ARRAY['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format'],
    '{"capacity": "8 quarts", "functions": "9-in-1", "power": "1200W", "material": "Stainless Steel", "programs": "14 Smart Programs", "warranty": "1 year"}',
    4.7,
    312,
    24,
    true,
    true,
    NOW() + INTERVAL '2 days',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440007',
    'dyson-v11-torque-drive',
    'Dyson V11 Torque Drive Cordless Vacuum Cleaner',
    'Intelligent suction power automatically adapts to floor type. Up to 60 minutes of fade-free power. LCD screen displays performance in real-time.',
    89999,
    109999,
    'DYSON-V11-TD',
    (SELECT id FROM brands WHERE slug = 'dyson'),
    (SELECT id FROM categories WHERE slug = 'home-appliances'),
    ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format'],
    '{"battery_life": "60 minutes", "suction_power": "185 AW", "dustbin_capacity": "0.76L", "weight": "2.97kg", "filter": "Whole-machine HEPA filtration", "charging_time": "4.5 hours"}',
    4.5,
    178,
    18,
    true,
    false,
    NULL,
    NOW(),
    NOW()
),
-- Sports & Outdoors
(
    '550e8400-e29b-41d4-a716-446655440008',
    'fitbit-charge-5',
    'Fitbit Charge 5 Fitness & Health Tracker',
    'Advanced health and fitness tracking with Daily Readiness Score, stress management, sleep tracking, and built-in GPS.',
    29999,
    39999,
    'FB-C5-BLK',
    (SELECT id FROM brands WHERE slug = 'fitbit'),
    (SELECT id FROM categories WHERE slug = 'fitness-trackers'),
    ARRAY['https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&auto=format', 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&auto=format', 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&auto=format'],
    '{"display": "AMOLED Color Touchscreen", "battery_life": "7 days", "water_resistance": "50m", "gps": "Built-in", "heart_rate": "24/7 Tracking", "compatibility": "iOS & Android"}',
    4.2,
    91,
    56,
    false,
    true,
    NOW() + INTERVAL '10 days',
    NOW(),
    NOW()
),
-- Beauty
(
    '550e8400-e29b-41d4-a716-446655440009',
    'dyson-supersonic-hair-dryer',
    'Dyson Supersonic Hair Dryer',
    'Protects hair from extreme heat damage. Fast drying with intelligent heat control. Engineered for balanced styling.',
    54999,
    69999,
    'DYSON-SS-HD',
    (SELECT id FROM brands WHERE slug = 'dyson'),
    (SELECT id FROM categories WHERE slug = 'hair-care'),
    ARRAY['https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&auto=format', 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&auto=format', 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&auto=format'],
    '{"motor": "Dyson V9 digital motor", "heat_settings": "4 heat settings", "speed_settings": "3 speed settings", "weight": "1.8kg", "wattage": "1600W", "attachments": "4 magnetic attachments"}',
    4.6,
    234,
    12,
    true,
    true,
    NOW() + INTERVAL '1 day',
    NOW(),
    NOW()
),
-- Automotive
(
    '550e8400-e29b-41d4-a716-446655440010',
    'stanley-1000-peak-amp-jump-starter',
    'Stanley 1000 Peak Amp Jump Starter',
    'Jump start your vehicle in seconds. Powerful 1000 peak amps. Includes USB ports for charging devices and built-in safety features.',
    15999,
    19999,
    'STAN-JS1000',
    (SELECT id FROM brands WHERE slug = 'stanley'),
    (SELECT id FROM categories WHERE slug = 'car-accessories'),
    ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format'],
    '{"peak_amps": "1000A", "clamps": "Heavy-duty", "safety": "Spark-proof technology", "ports": "2 USB ports", "battery": "Sealed lead-acid", "warranty": "1 year"}',
    4.4,
    67,
    45,
    false,
    false,
    NULL,
    NOW(),
    NOW()
);

-- Insert product variants
INSERT INTO public.product_variants (id, product_id, name, price, original_price, sku, stock, attributes, created_at, updated_at) VALUES
-- Samsung Galaxy S23 variants
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Phantom Black - 256GB',
    124999,
    139999,
    'SM-S23-256-BLK',
    25,
    '{"color": "Phantom Black", "storage": "256GB"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Cream - 256GB',
    124999,
    139999,
    'SM-S23-256-CRM',
    20,
    '{"color": "Cream", "storage": "256GB"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Green - 256GB',
    124999,
    139999,
    'SM-S23-256-GRN',
    0,
    '{"color": "Green", "storage": "256GB"}',
    NOW(),
    NOW()
),
-- MacBook Air variants
(
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'Space Gray - 256GB',
    189999,
    209999,
    'MBA-M2-256-SG',
    15,
    '{"color": "Space Gray", "storage": "256GB"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    'Silver - 256GB',
    189999,
    209999,
    'MBA-M2-256-SLV',
    17,
    '{"color": "Silver", "storage": "256GB"}',
    NOW(),
    NOW()
),
-- Nike Air Max variants
(
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440004',
    'Black/White - Size 9',
    12999,
    15999,
    'NIKE-AM270-9-BLK',
    32,
    '{"color": "Black/White", "size": "9"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440004',
    'Black/White - Size 10',
    12999,
    15999,
    'NIKE-AM270-10-BLK',
    28,
    '{"color": "Black/White", "size": "10"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440004',
    'White/Red - Size 9',
    12999,
    15999,
    'NIKE-AM270-9-WHT',
    24,
    '{"color": "White/Red", "size": "9"}',
    NOW(),
    NOW()
),
-- Levis 501 variants
(
    '660e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440005',
    'Dark Stonewash - 32x32',
    8999,
    11999,
    'LEVIS-501-32-32',
    45,
    '{"wash": "Dark Stonewash", "waist": "32", "inseam": "32"}',
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440005',
    'Dark Stonewash - 34x32',
    8999,
    11999,
    'LEVIS-501-34-32',
    44,
    '{"wash": "Dark Stonewash", "waist": "34", "inseam": "32"}',
    NOW(),
    NOW()
);

-- Update product stock from variants
UPDATE products p SET
    stock = COALESCE((
        SELECT SUM(stock)
        FROM product_variants pv
        WHERE pv.product_id = p.id
    ), 0),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT product_id
    FROM product_variants
);
