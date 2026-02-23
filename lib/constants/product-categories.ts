export const productCategories = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Latest gadgets, smartphones, laptops, and accessories',
    icon: '💻',
    slug: 'electronics',
    parentId: null,
    attributes: ['brand', 'model', 'color', 'storage', 'ram', 'screen_size'],
    filters: ['price_range', 'brand', 'condition', 'rating'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular', 'rating'],
    image: '/categories/electronics.jpg',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Clothing, shoes, accessories, and jewelry',
    icon: '👕',
    slug: 'fashion',
    parentId: null,
    attributes: ['size', 'color', 'material', 'gender', 'age_group'],
    filters: ['price_range', 'size', 'color', 'brand', 'material'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/fashion.jpg',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'home_garden',
    name: 'Home & Garden',
    description: 'Furniture, decor, kitchenware, and gardening tools',
    icon: '🏠',
    slug: 'home-garden',
    parentId: null,
    attributes: ['material', 'color', 'dimensions', 'style'],
    filters: ['price_range', 'room_type', 'style', 'material'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/home-garden.jpg',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'beauty_health',
    name: 'Beauty & Health',
    description: 'Skincare, makeup, haircare, and wellness products',
    icon: '💄',
    slug: 'beauty-health',
    parentId: null,
    attributes: ['skin_type', 'hair_type', 'scent', 'volume'],
    filters: ['price_range', 'brand', 'skin_type', 'hair_type'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/beauty-health.jpg',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'sports_outdoors',
    name: 'Sports & Outdoors',
    description: 'Sporting goods, fitness equipment, and outdoor gear',
    icon: '⚽',
    slug: 'sports-outdoors',
    parentId: null,
    attributes: ['sport_type', 'size', 'material', 'age_group'],
    filters: ['price_range', 'sport_type', 'brand', 'size'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/sports-outdoors.jpg',
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car parts, accessories, tools, and maintenance products',
    icon: '🚗',
    slug: 'automotive',
    parentId: null,
    attributes: ['vehicle_type', 'brand', 'model', 'year'],
    filters: ['price_range', 'vehicle_type', 'brand', 'compatibility'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/automotive.jpg',
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'toys_games',
    name: 'Toys & Games',
    description: 'Toys, board games, video games, and collectibles',
    icon: '🎮',
    slug: 'toys-games',
    parentId: null,
    attributes: ['age_group', 'type', 'brand', 'theme'],
    filters: ['price_range', 'age_group', 'type', 'brand'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/toys-games.jpg',
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'books_media',
    name: 'Books & Media',
    description: 'Books, magazines, movies, music, and educational materials',
    icon: '📚',
    slug: 'books-media',
    parentId: null,
    attributes: ['genre', 'author', 'format', 'language'],
    filters: ['price_range', 'genre', 'format', 'language'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/books-media.jpg',
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'smartphones',
    name: 'Smartphones',
    description: 'Latest smartphones and mobile devices',
    icon: '📱',
    slug: 'smartphones',
    parentId: 'electronics',
    attributes: ['brand', 'model', 'storage', 'ram', 'screen_size', 'camera'],
    filters: ['price_range', 'brand', 'storage', 'ram'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/smartphones.jpg',
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'laptops',
    name: 'Laptops',
    description: 'Laptops, notebooks, and portable computers',
    icon: '💻',
    slug: 'laptops',
    parentId: 'electronics',
    attributes: ['brand', 'model', 'processor', 'ram', 'storage', 'screen_size'],
    filters: ['price_range', 'brand', 'processor', 'ram'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/laptops.jpg',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'mens_fashion',
    name: "Men's Fashion",
    description: 'Clothing and accessories for men',
    icon: '👔',
    slug: 'mens-fashion',
    parentId: 'fashion',
    attributes: ['size', 'color', 'material', 'style'],
    filters: ['price_range', 'size', 'color', 'brand'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/mens-fashion.jpg',
    isActive: true,
    sortOrder: 11,
  },
  {
    id: 'womens_fashion',
    name: "Women's Fashion",
    description: 'Clothing and accessories for women',
    icon: '👗',
    slug: 'womens-fashion',
    parentId: 'fashion',
    attributes: ['size', 'color', 'material', 'style'],
    filters: ['price_range', 'size', 'color', 'brand'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/womens-fashion.jpg',
    isActive: true,
    sortOrder: 12,
  },
  {
    id: 'kitchen_appliances',
    name: 'Kitchen Appliances',
    description: 'Kitchen gadgets and appliances',
    icon: '🍳',
    slug: 'kitchen-appliances',
    parentId: 'home_garden',
    attributes: ['type', 'brand', 'power', 'capacity'],
    filters: ['price_range', 'type', 'brand', 'capacity'],
    sortOptions: ['price_low', 'price_high', 'newest', 'popular'],
    image: '/categories/kitchen-appliances.jpg',
    isActive: true,
    sortOrder: 13,
  },
] as const;

export type CategoryId = typeof productCategories[number]['id'];

export const categoryMap = productCategories.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {} as Record<CategoryId, typeof productCategories[number]>);

export const slugToCategoryMap = productCategories.reduce((acc, category) => {
  acc[category.slug] = category;
  return acc;
}, {} as Record<string, typeof productCategories[number]>);

export function getTopLevelCategories() {
  return productCategories.filter(category => category.parentId === null);
}

export function getSubcategories(parentId: CategoryId) {
  return productCategories.filter(category => category.parentId === parentId);
}

export function getCategoryPath(categoryId: CategoryId): typeof productCategories {
  const path: typeof productCategories = [];
  let currentId: string | null = categoryId;
  
  while (currentId) {
    const category = categoryMap[currentId as CategoryId];
    if (category) {
      path.unshift(category);
      currentId = category.parentId;
    } else {
      break;
    }
  }
  
  return path;
}

export function getCategoryTree() {
  const tree: Array<typeof productCategories[number] & { children: typeof productCategories }> = [];
  
  const topLevel = getTopLevelCategories();
  
  for (const category of topLevel) {
    const children = getSubcategories(category.id);
    tree.push({ ...category, children });
  }
  
  return tree;
}

export const categoryAttributes = {
  electronics: ['brand', 'model', 'color', 'storage', 'ram', 'screen_size', 'battery', 'os'],
  fashion: ['size', 'color', 'material', 'gender', 'age_group', 'style', 'season'],
  home_garden: ['material', 'color', 'dimensions', 'style', 'room_type', 'weight'],
  beauty_health: ['skin_type', 'hair_type', 'scent', 'volume', 'ingredients', 'benefits'],
  sports_outdoors: ['sport_type', 'size', 'material', 'age_group', 'skill_level', 'weather_resistance'],
  automotive: ['vehicle_type', 'brand', 'model', 'year', 'compatibility', 'material'],
  toys_games: ['age_group', 'type', 'brand', 'theme', 'number_of_players', 'batteries_required'],
  books_media: ['genre', 'author', 'format', 'language', 'publisher', 'isbn'],
} as const;

export function getCategoryAttributes(categoryId: CategoryId): string[] {
  const category = categoryMap[categoryId];
  if (!category) return [];
  
  const parentAttributes = category.parentId 
    ? getCategoryAttributes(category.parentId)
    : [];
  
  const categorySpecific = categoryAttributes[category.id as keyof typeof categoryAttributes] || [];
  
  return [...new Set([...parentAttributes, ...category.attributes, ...categorySpecific])];
}

export const categoryTaxRates = {
  electronics: 0.16,
  fashion: 0.16,
  home_garden: 0.16,
  beauty_health: 0.16,
  sports_outdoors: 0.16,
  automotive: 0.16,
  toys_games: 0.16,
  books_media: 0.00, // Tax exempt in Kenya
} as const;

export function getCategoryTaxRate(categoryId: CategoryId): number {
  const category = categoryMap[categoryId];
  if (!category) return 0.16;
  
  const rootCategory = category.parentId 
    ? categoryMap[category.parentId] || category
    : category;
  
  return categoryTaxRates[rootCategory.id as keyof typeof categoryTaxRates] || 0.16;
}
