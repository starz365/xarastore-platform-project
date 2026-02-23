-- Sample products for testing
-- Run this in Supabase SQL Editor

-- Insert sample products
INSERT INTO products (
  slug, name, description, short_description, 
  price, original_price, sku, 
  brand_id, category_id, 
  images, stock, is_featured, is_deal, is_active
) VALUES
(
  'iphone-15-pro-max',
  'iPhone 15 Pro Max',
  'The iPhone 15 Pro Max features a titanium design, A17 Pro chip, and advanced camera system with 5x optical zoom.',
  'Latest iPhone with titanium design',
  189999.00,
  209999.00,
  'APL-IP15PM-256',
  (SELECT id FROM brands WHERE slug = 'apple'),
  (SELECT id FROM categories WHERE slug = 'electronics'),
  ARRAY['https://images.unsplash.com/photo-1696446702094-16b3fddfbd96?w=800'],
  25,
  true,
  true,
  true
),
(
  'samsung-galaxy-s24-ultra',
  'Samsung Galaxy S24 Ultra',
  'Experience the power of Galaxy AI with the S24 Ultra. Features 200MP camera, S Pen, and stunning display.',
  'Flagship Samsung smartphone',
  169999.00,
  184999.00,
  'SAM-S24U-512',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  (SELECT id FROM categories WHERE slug = 'electronics'),
  ARRAY['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
  30,
  true,
  true,
  true
),
(
  'nike-air-max-90',
  'Nike Air Max 90',
  'Classic Nike Air Max 90 with visible Air unit and iconic waffle outsole. Perfect for everyday wear.',
  'Iconic Nike sneakers',
  12999.00,
  15999.00,
  'NIKE-AM90-BLK-42',
  (SELECT id FROM brands WHERE slug = 'nike'),
  (SELECT id FROM categories WHERE slug = 'fashion'),
  ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
  50,
  true,
  false,
  true
),
(
  'adidas-ultraboost-23',
  'Adidas Ultraboost 23',
  'Premium running shoes with responsive BOOST cushioning and Primeknit upper for maximum comfort.',
  'High-performance running shoes',
  18999.00,
  22999.00,
  'ADI-UB23-BLK-43',
  (SELECT id FROM brands WHERE slug = 'adidas'),
  (SELECT id FROM categories WHERE slug = 'sports'),
  ARRAY['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
  40,
  true,
  true,
  true
),
(
  'hp-pavilion-laptop',
  'HP Pavilion 15',
  'Powerful laptop with Intel Core i7, 16GB RAM, 512GB SSD. Perfect for work and entertainment.',
  '15.6" Full HD laptop',
  84999.00,
  94999.00,
  'HP-PAV15-I7-512',
  (SELECT id FROM brands WHERE slug = 'hp'),
  (SELECT id FROM categories WHERE slug = 'electronics'),
  ARRAY['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800'],
  15,
  false,
  false,
  true
),
(
  'dell-xps-13',
  'Dell XPS 13',
  'Premium ultrabook with stunning InfinityEdge display, 11th Gen Intel Core processor.',
  '13.4" FHD+ ultrabook',
  129999.00,
  149999.00,
  'DELL-XPS13-I7-1TB',
  (SELECT id FROM brands WHERE slug = 'dell'),
  (SELECT id FROM categories WHERE slug = 'electronics'),
  ARRAY['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
  10,
  true,
  false,
  true
);

-- Update product counts
UPDATE categories SET product_count = (
  SELECT COUNT(*) FROM products WHERE products.category_id = categories.id
);

UPDATE brands SET product_count = (
  SELECT COUNT(*) FROM products WHERE products.brand_id = brands.id
);
