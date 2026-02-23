-- Insert sample user data for Xarastore
-- Users are real authenticated users from Supabase Auth
-- This script creates user profiles that match the auth.users table

-- Note: The auth.users table is managed by Supabase Auth
-- We only insert into the public.users table for user profiles

INSERT INTO public.users (id, email, full_name, phone, avatar_url, email_verified, created_at, updated_at) VALUES
-- Sample customers
(
    'cc0e8400-e29b-41d4-a716-446655440001',
    'john.doe@example.com',
    'John Doe',
    '+254712345678',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format',
    true,
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '10 days'
),
(
    'cc0e8400-e29b-41d4-a716-446655440002',
    'jane.smith@example.com',
    'Jane Smith',
    '+254723456789',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&auto=format',
    true,
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '5 days'
),
(
    'cc0e8400-e29b-41d4-a716-446655440003',
    'robert.johnson@example.com',
    'Robert Johnson',
    '+254734567890',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format',
    true,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '3 days'
),
(
    'cc0e8400-e29b-41d4-a716-446655440004',
    'sarah.williams@example.com',
    'Sarah Williams',
    '+254745678901',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format',
    true,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '1 day'
),
(
    'cc0e8400-e29b-41d4-a716-446655440005',
    'michael.brown@example.com',
    'Michael Brown',
    '+254756789012',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format',
    true,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '12 hours'
),
(
    'cc0e8400-e29b-41d4-a716-446655440006',
    'emily.davis@example.com',
    'Emily Davis',
    '+254767890123',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format',
    true,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '6 hours'
),
(
    'cc0e8400-e29b-41d4-a716-446655440007',
    'david.wilson@example.com',
    'David Wilson',
    '+254778901234',
    'https://images.unsplash.com/photo-1507591064344-4c6ce005-128?w=400&auto=format',
    true,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '3 hours'
),
(
    'cc0e8400-e29b-41d4-a716-446655440008',
    'jessica.miller@example.com',
    'Jessica Miller',
    '+254789012345',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format',
    true,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '1 hour'
),
(
    'cc0e8400-e29b-41d4-a716-446655440009',
    'daniel.moore@example.com',
    'Daniel Moore',
    '+254790123456',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format',
    true,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '30 minutes'
),
(
    'cc0e8400-e29b-41d4-a716-446655440010',
    'olivia.taylor@example.com',
    'Olivia Taylor',
    '+254701234567',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format',
    true,
    NOW() - INTERVAL '10 days',
    NOW()
);

-- Insert user addresses
INSERT INTO public.user_addresses (id, user_id, name, phone, street, city, state, postal_code, country, is_default, created_at, updated_at) VALUES
-- John Doe's addresses
(
    'dd0e8400-e29b-41d4-a716-446655440001',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'John Doe',
    '+254712345678',
    '123 Main Street',
    'Nairobi',
    'Nairobi County',
    '00100',
    'Kenya',
    true,
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '10 days'
),
(
    'dd0e8400-e29b-41d4-a716-446655440002',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'Work Address',
    '+254712345678',
    '456 Business Avenue',
    'Nairobi',
    'Nairobi County',
    '00100',
    'Kenya',
    false,
    NOW() - INTERVAL '150 days',
    NOW() - INTERVAL '20 days'
),
-- Jane Smith's address
(
    'dd0e8400-e29b-41d4-a716-446655440003',
    'cc0e8400-e29b-41d4-a716-446655440002',
    'Jane Smith',
    '+254723456789',
    '789 Park Road',
    'Mombasa',
    'Mombasa County',
    '80100',
    'Kenya',
    true,
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '5 days'
),
-- Robert Johnson's address
(
    'dd0e8400-e29b-41d4-a716-446655440004',
    'cc0e8400-e29b-41d4-a716-446655440003',
    'Robert Johnson',
    '+254734567890',
    '321 Garden Lane',
    'Kisumu',
    'Kisumu County',
    '40100',
    'Kenya',
    true,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '3 days'
),
-- Sarah Williams' address
(
    'dd0e8400-e29b-41d4-a716-446655440005',
    'cc0e8400-e29b-41d4-a716-446655440004',
    'Sarah Williams',
    '+254745678901',
    '654 Mountain View',
    'Nakuru',
    'Nakuru County',
    '20100',
    'Kenya',
    true,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '1 day'
),
-- Michael Brown's address
(
    'dd0e8400-e29b-41d4-a716-446655440006',
    'cc0e8400-e29b-41d4-a716-446655440005',
    'Michael Brown',
    '+254756789012',
    '987 Lake Drive',
    'Eldoret',
    'Uasin Gishu County',
    '30100',
    'Kenya',
    true,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '12 hours'
);

-- Insert sample orders (these would typically be created by the application)
INSERT INTO public.orders (id, order_number, user_id, items, subtotal, shipping, tax, total, status, shipping_address, billing_address, payment_method, payment_status, mpesa_receipt, created_at, updated_at, estimated_delivery) VALUES
(
    'ee0e8400-e29b-41d4-a716-446655440001',
    'XARA-2023-001',
    'cc0e8400-e29b-41d4-a716-446655440001',
    '[
        {
            "id": "item-001",
            "productId": "550e8400-e29b-41d4-a716-446655440001",
            "variantId": "660e8400-e29b-41d4-a716-446655440001",
            "name": "Samsung Galaxy S23 5G - Phantom Black - 256GB",
            "price": 124999,
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format"
        }
    ]'::jsonb,
    124999,
    299,
    20000,
    147298,
    'delivered',
    '{
        "name": "John Doe",
        "phone": "+254712345678",
        "street": "123 Main Street",
        "city": "Nairobi",
        "state": "Nairobi County",
        "postalCode": "00100",
        "country": "Kenya"
    }'::jsonb,
    '{
        "name": "John Doe",
        "phone": "+254712345678",
        "street": "123 Main Street",
        "city": "Nairobi",
        "state": "Nairobi County",
        "postalCode": "00100",
        "country": "Kenya"
    }'::jsonb,
    'mpesa',
    'paid',
    'RB23456789',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '28 days'
),
(
    'ee0e8400-e29b-41d4-a716-446655440002',
    'XARA-2023-002',
    'cc0e8400-e29b-41d4-a716-446655440002',
    '[
        {
            "id": "item-002",
            "productId": "550e8400-e29b-41d4-a716-446655440002",
            "variantId": "660e8400-e29b-41d4-a716-446655440004",
            "name": "Apple MacBook Air M2 - Space Gray - 256GB",
            "price": 189999,
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format"
        },
        {
            "id": "item-003",
            "productId": "550e8400-e29b-41d4-a716-446655440003",
            "variantId": "660e8400-e29b-41d4-a716-446655440003",
            "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
            "price": 44999,
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format"
        }
    ]'::jsonb,
    234998,
    0,
    37599,
    272597,
    'shipped',
    '{
        "name": "Jane Smith",
        "phone": "+254723456789",
        "street": "789 Park Road",
        "city": "Mombasa",
        "state": "Mombasa County",
        "postalCode": "80100",
        "country": "Kenya"
    }'::jsonb,
    '{
        "name": "Jane Smith",
        "phone": "+254723456789",
        "street": "789 Park Road",
        "city": "Mombasa",
        "state": "Mombasa County",
        "postalCode": "80100",
        "country": "Kenya"
    }'::jsonb,
    'card',
    'paid',
    NULL,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '2 days'
),
(
    'ee0e8400-e29b-41d4-a716-446655440003',
    'XARA-2023-003',
    'cc0e8400-e29b-41d4-a716-446655440003',
    '[
        {
            "id": "item-004",
            "productId": "550e8400-e29b-41d4-a716-446655440004",
            "variantId": "660e8400-e29b-41d4-a716-446655440006",
            "name": "Nike Air Max 270 Mens Running Shoes - Black/White - Size 9",
            "price": 12999,
            "quantity": 2,
            "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format"
        },
        {
            "id": "item-005",
            "productId": "550e8400-e29b-41d4-a716-446655440005",
            "variantId": "660e8400-e29b-41d4-a716-446655440009",
            "name": "Levis 501 Original Fit Jeans - Dark Stonewash - 32x32",
            "price": 8999,
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format"
        }
    ]'::jsonb,
    34997,
    299,
    5600,
    40896,
    'processing',
    '{
        "name": "Robert Johnson",
        "phone": "+254734567890",
        "street": "321 Garden Lane",
        "city": "Kisumu",
        "state": "Kisumu County",
        "postalCode": "40100",
        "country": "Kenya"
    }'::jsonb,
    '{
        "name": "Robert Johnson",
        "phone": "+254734567890",
        "street": "321 Garden Lane",
        "city": "Kisumu",
        "state": "Kisumu County",
        "postalCode": "40100",
        "country": "Kenya"
    }'::jsonb,
    'mpesa',
    'paid',
    'RB34567890',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    NOW() + INTERVAL '5 days'
),
(
    'ee0e8400-e29b-41d4-a716-446655440004',
    'XARA-2023-004',
    'cc0e8400-e29b-41d4-a716-446655440004',
    '[
        {
            "id": "item-006",
            "productId": "550e8400-e29b-41d4-a716-446655440006",
            "variantId": "660e8400-e29b-41d4-a716-446655440003",
            "name": "Instant Pot Duo Plus 9-in-1 Electric Pressure Cooker",
            "price": 18999,
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format"
        }
    ]'::jsonb,
    18999,
    299,
    3040,
    22338,
    'pending',
    '{
        "name": "Sarah Williams",
        "phone": "+254745678901",
        "street": "654 Mountain View",
        "city": "Nakuru",
        "state": "Nakuru County",
        "postalCode": "20100",
        "country": "Kenya"
    }'::jsonb,
    '{
        "name": "Sarah Williams",
        "phone": "+254745678901",
        "street": "654 Mountain View",
        "city": "Nakuru",
        "state": "Nakuru County",
        "postalCode": "20100",
        "country": "Kenya"
    }'::jsonb,
    'mpesa',
    'pending',
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '7 days'
);

-- Insert sample reviews
INSERT INTO public.reviews (id, product_id, user_id, rating, title, comment, images, is_verified, created_at, updated_at) VALUES
(
    'ff0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'cc0e8400-e29b-41d4-a716-446655440001',
    5,
    'Amazing phone!',
    'The camera quality is outstanding and battery life lasts all day. Definitely worth the price.',
    ARRAY['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format'],
    true,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'cc0e8400-e29b-41d4-a716-446655440002',
    4,
    'Great phone with minor issues',
    'Love the display and performance, but the charging could be faster.',
    ARRAY[]::text[],
    true,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'cc0e8400-e29b-41d4-a716-446655440001',
    5,
    'Best laptop I''ve owned',
    'The M2 chip is incredibly fast and battery life is phenomenal. Perfect for both work and entertainment.',
    ARRAY['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&auto=format'],
    true,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440003',
    'cc0e8400-e29b-41d4-a716-446655440003',
    5,
    'Perfect noise cancellation',
    'These headphones block out all external noise completely. Great for working in busy environments.',
    ARRAY[]::text[],
    true,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440004',
    'cc0e8400-e29b-41d4-a716-446655440004',
    4,
    'Very comfortable',
    'Great for daily wear and running. The cushioning is excellent.',
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format'],
    true,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440006',
    'cc0e8400-e29b-41d4-a716-446655440005',
    5,
    'Game changer in the kitchen',
    'Cooks everything perfectly and saves so much time. The pressure cooking feature is amazing.',
    ARRAY[]::text[],
    true,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
);

-- Insert sample wishlist items
INSERT INTO public.wishlist (id, user_id, product_id, created_at) VALUES
(
    'gg0e8400-e29b-41d4-a716-446655440001',
    'cc0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440007',
    NOW() - INTERVAL '30 days'
),
(
    'gg0e8400-e29b-41d4-a716-446655440002',
    'cc0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440009',
    NOW() - INTERVAL '25 days'
),
(
    'gg0e8400-e29b-41d4-a716-446655440003',
    'cc0e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440008',
    NOW() - INTERVAL '20 days'
),
(
    'gg0e8400-e29b-41d4-a716-446655440004',
    'cc0e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440010',
    NOW() - INTERVAL '15 days'
),
(
    'gg0e8400-e29b-41d4-a716-446655440005',
    'cc0e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440006',
    NOW() - INTERVAL '10 days'
);

-- Update product ratings from reviews
UPDATE products p SET
    rating = COALESCE((
        SELECT AVG(rating)::numeric(3,2)
        FROM reviews r
        WHERE r.product_id = p.id
    ), 0),
    review_count = COALESCE((
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.product_id = p.id
    ), 0),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT product_id
    FROM reviews
);

-- Update brand product counts
UPDATE brands b SET
    product_count = COALESCE((
        SELECT COUNT(*)
        FROM products p
        WHERE p.brand_id = b.id
    ), 0),
    updated_at = NOW();

-- Update category product counts
UPDATE categories c SET
    product_count = COALESCE((
        SELECT COUNT(*)
        FROM products p
        WHERE p.category_id = c.id
    ), 0),
    updated_at = NOW();
