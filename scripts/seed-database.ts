#!/usr/bin/env tsx
import { supabase } from '../lib/supabase/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

// Configuration
const SEED_CONFIG = {
  users: {
    count: 50,
    password: 'Password123!',
  },
  categories: {
    count: 20,
  },
  brands: {
    count: 30,
  },
  products: {
    count: 500,
  },
  reviews: {
    count: 1000,
  },
  orders: {
    count: 200,
  },
};

// Helper functions
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

function generatePhoneNumber(): string {
  const prefixes = ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.string.numeric(7);
  return `254${prefix}${suffix}`;
}

async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  const users = [];
  const hashedPassword = await hashPassword(SEED_CONFIG.users.password);
  
  // Create admin user
  users.push({
    id: faker.string.uuid(),
    email: 'admin@xarastore.com',
    full_name: 'Admin User',
    phone: generatePhoneNumber(),
    avatar_url: `https://ui-avatars.com/api/?name=Admin+User&background=dc2626&color=fff`,
    email_verified: true,
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create customer users
  for (let i = 0; i < SEED_CONFIG.users.count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    
    users.push({
      id: faker.string.uuid(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      full_name: fullName,
      phone: generatePhoneNumber(),
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dc2626&color=fff`,
      email_verified: faker.datatype.boolean(0.8),
      role: 'customer',
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    });
  }

  // Insert users into Supabase
  const { error } = await supabase.from('users').upsert(users);

  if (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }

  console.log(`✅ Seeded ${users.length} users`);
  return users;
}

async function seedCategories() {
  console.log('🌱 Seeding categories...');
  
  const categories = [
    // Electronics
    { name: 'Smartphones', slug: 'smartphones', description: 'Latest smartphones and accessories' },
    { name: 'Laptops', slug: 'laptops', description: 'Laptops, notebooks, and accessories' },
    { name: 'Tablets', slug: 'tablets', description: 'Tablets and e-readers' },
    { name: 'Televisions', slug: 'televisions', description: 'Smart TVs and accessories' },
    { name: 'Audio', slug: 'audio', description: 'Headphones, speakers, and audio equipment' },
    { name: 'Cameras', slug: 'cameras', description: 'Cameras, lenses, and photography gear' },
    { name: 'Gaming', slug: 'gaming', description: 'Gaming consoles, games, and accessories' },
    { name: 'Wearables', slug: 'wearables', description: 'Smart watches and fitness trackers' },
    
    // Fashion
    { name: 'Men\'s Clothing', slug: 'mens-clothing', description: 'Clothing for men' },
    { name: 'Women\'s Clothing', slug: 'womens-clothing', description: 'Clothing for women' },
    { name: 'Kids\' Clothing', slug: 'kids-clothing', description: 'Clothing for children' },
    { name: 'Shoes', slug: 'shoes', description: 'Footwear for all occasions' },
    { name: 'Accessories', slug: 'accessories', description: 'Bags, wallets, and accessories' },
    { name: 'Jewelry', slug: 'jewelry', description: 'Watches, rings, and jewelry' },
    
    // Home & Garden
    { name: 'Furniture', slug: 'furniture', description: 'Home and office furniture' },
    { name: 'Home Decor', slug: 'home-decor', description: 'Home decoration items' },
    { name: 'Kitchen', slug: 'kitchen', description: 'Kitchen appliances and utensils' },
    { name: 'Garden', slug: 'garden', description: 'Garden tools and equipment' },
    { name: 'Lighting', slug: 'lighting', description: 'Home and outdoor lighting' },
    { name: 'Storage', slug: 'storage', description: 'Storage solutions and organizers' },
  ];

  const categoryData = categories.map(category => ({
    id: faker.string.uuid(),
    ...category,
    image: faker.image.urlLoremFlickr({ category: category.slug }),
    product_count: 0,
    created_at: faker.date.past({ years: 1 }).toISOString(),
    updated_at: faker.date.recent({ days: 30 }).toISOString(),
  }));

  const { error } = await supabase.from('categories').upsert(categoryData);

  if (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }

  console.log(`✅ Seeded ${categoryData.length} categories`);
  return categoryData;
}

async function seedBrands() {
  console.log('🌱 Seeding brands...');
  
  const brands = [
    // Electronics brands
    { name: 'Apple', slug: 'apple', description: 'Innovative technology products' },
    { name: 'Samsung', slug: 'samsung', description: 'Electronics and home appliances' },
    { name: 'Sony', slug: 'sony', description: 'Electronics and entertainment' },
    { name: 'LG', slug: 'lg', description: 'Home appliances and electronics' },
    { name: 'Microsoft', slug: 'microsoft', description: 'Software and hardware' },
    { name: 'HP', slug: 'hp', description: 'Computers and printers' },
    { name: 'Dell', slug: 'dell', description: 'Computers and electronics' },
    { name: 'Lenovo', slug: 'lenovo', description: 'Computers and smart devices' },
    { name: 'Asus', slug: 'asus', description: 'Computers and components' },
    { name: 'Acer', slug: 'acer', description: 'Computers and electronics' },
    
    // Fashion brands
    { name: 'Nike', slug: 'nike', description: 'Athletic apparel and footwear' },
    { name: 'Adidas', slug: 'adidas', description: 'Sports apparel and footwear' },
    { name: 'Puma', slug: 'puma', description: 'Sports and casual apparel' },
    { name: 'Levi\'s', slug: 'levis', description: 'Denim and casual wear' },
    { name: 'Zara', slug: 'zara', description: 'Fashion clothing and accessories' },
    { name: 'H&M', slug: 'hm', description: 'Fashion and home products' },
    { name: 'Gucci', slug: 'gucci', description: 'Luxury fashion brand' },
    { name: 'Prada', slug: 'prada', description: 'Luxury fashion and accessories' },
    { name: 'Louis Vuitton', slug: 'louis-vuitton', description: 'Luxury fashion brand' },
    { name: 'Chanel', slug: 'chanel', description: 'Luxury fashion and beauty' },
    
    // Home brands
    { name: 'IKEA', slug: 'ikea', description: 'Furniture and home accessories' },
    { name: 'Home Depot', slug: 'home-depot', description: 'Home improvement products' },
    { name: 'Wayfair', slug: 'wayfair', description: 'Home furniture and decor' },
    { name: 'West Elm', slug: 'west-elm', description: 'Modern furniture and decor' },
    { name: 'Crate & Barrel', slug: 'crate-barrel', description: 'Home furniture and accessories' },
    { name: 'Williams Sonoma', slug: 'williams-sonoma', description: 'Kitchen and home products' },
    { name: 'Pottery Barn', slug: 'pottery-barn', description: 'Home furniture and decor' },
    { name: 'Anthropologie', slug: 'anthropologie', description: 'Women\'s clothing and home decor' },
    { name: 'Bed Bath & Beyond', slug: 'bed-bath-beyond', description: 'Home goods and decor' },
    { name: 'Target', slug: 'target', description: 'General merchandise retailer' },
  ];

  const brandData = brands.map(brand => ({
    id: faker.string.uuid(),
    ...brand,
    logo: faker.image.urlLoremFlickr({ category: brand.slug }),
    product_count: 0,
    created_at: faker.date.past({ years: 1 }).toISOString(),
    updated_at: faker.date.recent({ days: 30 }).toISOString(),
  }));

  const { error } = await supabase.from('brands').upsert(brandData);

  if (error) {
    console.error('❌ Error seeding brands:', error);
    throw error;
  }

  console.log(`✅ Seeded ${brandData.length} brands`);
  return brandData;
}

async function seedProducts(categories: any[], brands: any[]) {
  console.log('🌱 Seeding products...');
  
  const products = [];
  
  for (let i = 0; i < SEED_CONFIG.products.count; i++) {
    const category = faker.helpers.arrayElement(categories);
    const brand = faker.helpers.arrayElement(brands);
    const name = faker.commerce.productName();
    const slug = faker.helpers.slugify(name).toLowerCase();
    const price = parseFloat(faker.commerce.price({ min: 500, max: 50000 }));
    const originalPrice = faker.datatype.boolean(0.3) ? price * faker.number.float({ min: 1.2, max: 2 }) : null;
    const isDeal = originalPrice !== null && faker.datatype.boolean(0.2);
    const stock = faker.number.int({ min: 0, max: 100 });
    
    const product = {
      id: faker.string.uuid(),
      slug,
      name,
      description: faker.commerce.productDescription(),
      price,
      original_price: originalPrice,
      sku: faker.string.alphanumeric(10).toUpperCase(),
      brand_id: brand.id,
      category_id: category.id,
      images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
        faker.image.urlLoremFlickr({ width: 800, height: 800, category: category.slug })
      ),
      specifications: {
        'Color': faker.color.human(),
        'Material': faker.commerce.productMaterial(),
        'Dimensions': `${faker.number.int({ min: 10, max: 100 })} x ${faker.number.int({ min: 10, max: 100 })} x ${faker.number.int({ min: 10, max: 100 })} cm`,
        'Weight': `${faker.number.int({ min: 100, max: 5000 })}g`,
        'Warranty': `${faker.number.int({ min: 1, max: 5 })} years`,
      },
      rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
      review_count: faker.number.int({ min: 0, max: 1000 }),
      stock,
      is_featured: faker.datatype.boolean(0.1),
      is_deal: isDeal,
      deal_ends_at: isDeal ? faker.date.future({ years: 1 }).toISOString() : null,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    };

    products.push(product);
  }

  // Insert products in batches
  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { error } = await supabase.from('products').upsert(batch);

    if (error) {
      console.error(`❌ Error seeding products batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    console.log(`✅ Seeded batch ${i / batchSize + 1} of ${Math.ceil(products.length / batchSize)}`);
  }

  console.log(`✅ Seeded ${products.length} products`);
  return products;
}

async function seedReviews(users: any[], products: any[]) {
  console.log('🌱 Seeding reviews...');
  
  const reviews = [];
  
  for (let i = 0; i < SEED_CONFIG.reviews.count; i++) {
    const user = faker.helpers.arrayElement(users);
    const product = faker.helpers.arrayElement(products);
    
    const review = {
      id: faker.string.uuid(),
      product_id: product.id,
      user_id: user.id,
      rating: faker.number.int({ min: 1, max: 5 }),
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      comment: faker.lorem.paragraphs({ min: 1, max: 3 }),
      images: faker.datatype.boolean(0.3) ? 
        Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
          faker.image.urlLoremFlickr({ width: 600, height: 600 })
        ) : [],
      is_verified: faker.datatype.boolean(0.7),
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
    };

    reviews.push(review);
  }

  // Insert reviews in batches
  const batchSize = 100;
  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);
    const { error } = await supabase.from('reviews').upsert(batch);

    if (error) {
      console.error(`❌ Error seeding reviews batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    console.log(`✅ Seeded batch ${i / batchSize + 1} of ${Math.ceil(reviews.length / batchSize)}`);
  }

  console.log(`✅ Seeded ${reviews.length} reviews`);
  return reviews;
}

async function seedOrders(users: any[], products: any[]) {
  console.log('🌱 Seeding orders...');
  
  const orders = [];
  const orderItems = [];
  
  for (let i = 0; i < SEED_CONFIG.orders.count; i++) {
    const user = faker.helpers.arrayElement(users);
    const orderId = faker.string.uuid();
    const orderNumber = `ORD-${faker.date.recent({ days: 365 }).getFullYear()}-${faker.string.numeric(6)}`;
    
    // Generate order items
    const itemsCount = faker.number.int({ min: 1, max: 5 });
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < itemsCount; j++) {
      const product = faker.helpers.arrayElement(products);
      const quantity = faker.number.int({ min: 1, max: 3 });
      const price = product.price;
      const itemTotal = price * quantity;
      subtotal += itemTotal;
      
      items.push({
        id: faker.string.uuid(),
        product_id: product.id,
        name: product.name,
        price,
        quantity,
        image: product.images[0],
      });

      orderItems.push({
        id: faker.string.uuid(),
        order_id: orderId,
        product_id: product.id,
        name: product.name,
        price,
        quantity,
        created_at: new Date().toISOString(),
      });
    }
    
    const shipping = subtotal > 2000 ? 0 : 299;
    const tax = subtotal * 0.16;
    const total = subtotal + shipping + tax;
    
    const status = faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
    const paymentStatus = status === 'cancelled' ? 'failed' : faker.helpers.arrayElement(['pending', 'paid']);
    
    const order = {
      id: orderId,
      order_number: orderNumber,
      user_id: user.id,
      items,
      subtotal,
      shipping,
      tax,
      total,
      status,
      shipping_address: {
        name: user.full_name,
        phone: user.phone,
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postal_code: faker.location.zipCode(),
        country: 'Kenya',
      },
      payment_method: faker.helpers.arrayElement(['mpesa', 'card', 'bank_transfer']),
      payment_status: paymentStatus,
      mpesa_receipt: paymentStatus === 'paid' ? faker.string.numeric(10) : null,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      updated_at: faker.date.recent({ days: 30 }).toISOString(),
      estimated_delivery: status === 'shipped' || status === 'delivered' ? 
        faker.date.soon({ days: 7 }).toISOString() : null,
    };

    orders.push(order);
  }

  // Insert orders
  const { error: ordersError } = await supabase.from('orders').upsert(orders);
  if (ordersError) {
    console.error('❌ Error seeding orders:', ordersError);
    throw ordersError;
  }

  // Insert order items
  const { error: itemsError } = await supabase.from('order_items').upsert(orderItems);
  if (itemsError) {
    console.error('❌ Error seeding order items:', itemsError);
    throw itemsError;
  }

  console.log(`✅ Seeded ${orders.length} orders with ${orderItems.length} items`);
  return { orders, orderItems };
}

async function updateCounters(categories: any[], brands: any[], products: any[]) {
  console.log('🔄 Updating counters...');
  
  // Update category product counts
  for (const category of categories) {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('category_id', category.id);
    
    await supabase
      .from('categories')
      .update({ product_count: count })
      .eq('id', category.id);
  }
  
  // Update brand product counts
  for (const brand of brands) {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('brand_id', brand.id);
    
    await supabase
      .from('brands')
      .update({ product_count: count })
      .eq('id', brand.id);
  }
  
  console.log('✅ Updated counters');
}

async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');
    console.log('='.repeat(50));
    
    // Check if database is empty
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (userCount && userCount > 0) {
      console.log('⚠️  Database already contains data. Aborting seeding.');
      return;
    }
    
    // Seed data
    const users = await seedUsers();
    const categories = await seedCategories();
    const brands = await seedBrands();
    const products = await seedProducts(categories, brands);
    const reviews = await seedReviews(users, products);
    const orders = await seedOrders(users, products);
    
    // Update counters
    await updateCounters(categories, brands, products);
    
    console.log('='.repeat(50));
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📂 Categories: ${categories.length}`);
    console.log(`   🏷️  Brands: ${brands.length}`);
    console.log(`   🛍️  Products: ${products.length}`);
    console.log(`   ⭐ Reviews: ${reviews.length}`);
    console.log(`   📦 Orders: ${orders.orders.length}`);
    console.log(`   📋 Order Items: ${orders.orderItems.length}`);
    console.log('');
    console.log('🔑 Admin credentials:');
    console.log('   Email: admin@xarastore.com');
    console.log('   Password: Password123!');
    console.log('');
    console.log('🌐 The application is now ready to use!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
