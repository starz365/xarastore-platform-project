scripts/db/seeds/categories.sql
-- Insert product categories for Xarastore
-- Categories are admin-configurable via admin dashboard

INSERT INTO public.categories (id, slug, name, description, parent_id, image, product_count, created_at, updated_at) VALUES
-- Top-level categories
(
    'aa0e8400-e29b-41d4-a716-446655440001',
    'electronics',
    'Electronics',
    'Discover the latest gadgets, devices, and electronics for your home and office.',
    NULL,
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440002',
    'fashion',
    'Fashion',
    'Stay stylish with our curated collection of clothing, shoes, and accessories.',
    NULL,
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440003',
    'home-garden',
    'Home & Garden',
    'Everything you need to create your perfect home and beautiful garden.',
    NULL,
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440004',
    'beauty',
    'Beauty & Personal Care',
    'Premium beauty products, skincare, and personal care essentials.',
    NULL,
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440005',
    'sports-outdoors',
    'Sports & Outdoors',
    'Gear and equipment for all your sports and outdoor adventures.',
    NULL,
    'https://images.unsplash.com/photo-1536922246289-88c42f957773?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440006',
    'automotive',
    'Automotive',
    'Car accessories, tools, and maintenance products for your vehicle.',
    NULL,
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440007',
    'groceries',
    'Groceries',
    'Fresh produce, pantry staples, and household essentials delivered to your door.',
    NULL,
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440008',
    'toys-games',
    'Toys & Games',
    'Fun and educational toys, games, and entertainment for all ages.',
    NULL,
    'https://images.unsplash.com/photo-1594787318280-5358075c9326?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Electronics subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440009',
    'smartphones',
    'Smartphones',
    'Latest smartphones from top brands with the best features and prices.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440010',
    'laptops',
    'Laptops & Computers',
    'Powerful laptops, desktops, and computer accessories for work and play.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440011',
    'headphones',
    'Headphones & Audio',
    'Premium headphones, earphones, and audio equipment for immersive sound.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440012',
    'tv-home-theater',
    'TV & Home Theater',
    'Smart TVs, sound systems, and home theater equipment for cinematic experience.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440013',
    'cameras',
    'Cameras & Photography',
    'DSLR cameras, mirrorless cameras, and photography accessories.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440014',
    'gaming',
    'Gaming',
    'Gaming consoles, accessories, and games for all platforms.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440015',
    'wearables',
    'Wearable Technology',
    'Smartwatches, fitness trackers, and wearable devices.',
    'aa0e8400-e29b-41d4-a716-446655440001',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Fashion subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440016',
    'mens-clothing',
    'Men''s Clothing',
    'Stylish clothing for men including shirts, pants, jackets, and more.',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440017',
    'womens-clothing',
    'Women''s Clothing',
    'Trendy and comfortable clothing for women including dresses, tops, and more.',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440018',
    'shoes',
    'Shoes',
    'Footwear for all occasions including sneakers, formal shoes, and boots.',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440019',
    'accessories',
    'Accessories',
    'Fashion accessories including bags, belts, watches, and jewelry.',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440020',
    'jeans',
    'Jeans',
    'Denim jeans in various fits, washes, and styles for men and women.',
    'aa0e8400-e29b-41d4-a716-446655440002',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Home & Garden subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440021',
    'furniture',
    'Furniture',
    'Quality furniture for living room, bedroom, dining room, and office.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440022',
    'home-decor',
    'Home Decor',
    'Decorative items, lighting, wall art, and home accents.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440023',
    'kitchen-appliances',
    'Kitchen Appliances',
    'Essential kitchen appliances for cooking, baking, and food preparation.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440024',
    'home-appliances',
    'Home Appliances',
    'Large and small appliances for your home including cleaning, laundry, and climate control.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440025',
    'garden-outdoor',
    'Garden & Outdoor',
    'Plants, gardening tools, outdoor furniture, and patio accessories.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440026',
    'bedding-bath',
    'Bedding & Bath',
    'Comfortable bedding, towels, bath mats, and bath accessories.',
    'aa0e8400-e29b-41d4-a716-446655440003',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Beauty subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440027',
    'skincare',
    'Skincare',
    'Cleansers, moisturizers, serums, and treatments for healthy skin.',
    'aa0e8400-e29b-41d4-a716-446655440004',
    'https://images.unsplash.com/photo-1556228578-9c360e1d8d34?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440028',
    'makeup',
    'Makeup',
    'Cosmetics including foundation, lipstick, eyeshadow, and beauty tools.',
    'aa0e8400-e29b-41d4-a716-446655440004',
    'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440029',
    'hair-care',
    'Hair Care',
    'Shampoo, conditioner, styling products, and hair tools.',
    'aa0e8400-e29b-41d4-a716-446655440004',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440030',
    'fragrances',
    'Fragrances',
    'Perfumes, colognes, and body sprays for men and women.',
    'aa0e8400-e29b-41d4-a716-446655440004',
    'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440031',
    'personal-care',
    'Personal Care',
    'Shaving, oral care, deodorants, and personal grooming products.',
    'aa0e8400-e29b-41d4-a716-446655440004',
    'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Sports & Outdoors subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440032',
    'fitness-equipment',
    'Fitness Equipment',
    'Exercise machines, weights, yoga mats, and home gym equipment.',
    'aa0e8400-e29b-41d4-a716-446655440005',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440033',
    'team-sports',
    'Team Sports',
    'Equipment for football, basketball, volleyball, and other team sports.',
    'aa0e8400-e29b-41d4-a716-446655440005',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440034',
    'outdoor-recreation',
    'Outdoor Recreation',
    'Camping gear, hiking equipment, fishing gear, and outdoor accessories.',
    'aa0e8400-e29b-41d4-a716-446655440005',
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440035',
    'fitness-trackers',
    'Fitness Trackers',
    'Smartwatches and activity trackers for monitoring health and fitness.',
    'aa0e8400-e29b-41d4-a716-446655440005',
    'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440036',
    'athletic-apparel',
    'Athletic Apparel',
    'Sportswear, running shoes, and performance clothing for athletes.',
    'aa0e8400-e29b-41d4-a716-446655440005',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
-- Automotive subcategories
(
    'aa0e8400-e29b-41d4-a716-446655440037',
    'car-accessories',
    'Car Accessories',
    'Interior and exterior accessories for your vehicle.',
    'aa0e8400-e29b-41d4-a716-446655440006',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440038',
    'car-care',
    'Car Care',
    'Cleaning products, waxes, polishes, and maintenance supplies.',
    'aa0e8400-e29b-41d4-a716-446655440006',
    'https://images.unsplash.com/photo-1565689221354-d77d21c52c68?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440039',
    'car-electronics',
    'Car Electronics',
    'GPS systems, dash cams, audio systems, and car chargers.',
    'aa0e8400-e29b-41d4-a716-446655440006',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440040',
    'tools-equipment',
    'Tools & Equipment',
    'Automotive tools, jacks, tire repair kits, and diagnostic equipment.',
    'aa0e8400-e29b-41d4-a716-446655440006',
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format',
    0,
    NOW(),
    NOW()
),
(
    'aa0e8400-e29b-41d4-a716-446655440041',
    'motorcycle',
    'Motorcycle',
    'Motorcycle accessories, gear, and maintenance products.',
    'aa0e8400-e29b-41d4-a716-446655440006',
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format',
    0,
    NOW(),
    NOW()
);

-- Update parent category product counts
UPDATE categories c SET
    product_count = COALESCE((
        SELECT COUNT(*)
        FROM products p
        WHERE p.category_id = c.id
    ), 0),
    updated_at = NOW()
WHERE parent_id IS NULL;
