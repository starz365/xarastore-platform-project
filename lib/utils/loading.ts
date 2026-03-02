import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';

export async function getRouteInfo() {
  const headersList = await headers();
  const pathname = headersList.get('x-invoke-path') || '/';
  const searchParams = headersList.get('x-invoke-query') || '';
  const userAgent = headersList.get('user-agent') || '';
  const connection = headersList.get('connection') || '';

  const segments = pathname.split('/').filter(Boolean);
  const routeType = determineRouteType(pathname, segments);

  return {
    pathname,
    segments,
    type: routeType.type,
    subType: routeType.subType,
    params: extractParams(pathname, segments),
    isHomePage: pathname === '/',
    searchQuery: extractSearchQuery(searchParams),
    userAgent,
    connectionType: determineConnectionType(connection, userAgent),
    loadingMessage: getLoadingMessage(routeType, segments, searchParams),
    loadingHint: getLoadingHint(routeType, searchParams, userAgent),
    timestamp: Date.now(),
  };
}

function determineRouteType(pathname: string, segments: string[]) {
  if (pathname === '/') return { type: 'home', subType: null };
  if (pathname.startsWith('/product/')) return { type: 'product', subType: 'detail' };
  if (pathname.startsWith('/category/')) return { type: 'category', subType: segments[1] || 'list' };
  if (pathname.startsWith('/shop')) return { type: 'shop', subType: 'listing' };
  if (pathname.startsWith('/cart')) return { type: 'cart', subType: 'view' };
  if (pathname.startsWith('/checkout')) return { type: 'checkout', subType: getCheckoutStep(pathname) };
  if (pathname.startsWith('/account')) return { type: 'account', subType: segments[1] || 'overview' };
  if (pathname.startsWith('/search')) return { type: 'search', subType: 'results' };
  if (pathname.startsWith('/deals')) return { type: 'deals', subType: segments[1] || 'list' };
  if (pathname.startsWith('/brands/')) return { type: 'brand', subType: 'detail' };
  if (pathname.startsWith('/collections/')) return { type: 'collection', subType: 'detail' };
  if (pathname.startsWith('/help')) return { type: 'help', subType: segments[1] || 'index' };
  if (pathname.startsWith('/legal')) return { type: 'legal', subType: segments[1] || 'index' };
  return { type: 'generic', subType: null };
}

function getCheckoutStep(pathname: string): string {
  if (pathname.includes('/address')) return 'address';
  if (pathname.includes('/delivery')) return 'delivery';
  if (pathname.includes('/payment')) return 'payment';
  if (pathname.includes('/confirmation')) return 'confirmation';
  return 'start';
}

function extractParams(pathname: string, segments: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  if (pathname.startsWith('/product/') && segments[1]) params.slug = segments[1];
  if (pathname.startsWith('/category/') && segments[1]) params.slug = segments[1];
  if (pathname.startsWith('/brands/') && segments[1]) params.slug = segments[1];
  if (pathname.startsWith('/collections/') && segments[1]) params.slug = segments[1];
  return params;
}

function extractSearchQuery(searchParams: string): string {
  if (!searchParams) return '';
  try {
    const params = new URLSearchParams(searchParams);
    return params.get('q') || params.get('search') || '';
  } catch {
    return '';
  }
}

function determineConnectionType(connection: string, userAgent: string): string {
  if (connection.includes('keep-alive')) return 'good';
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'mobile';
  }
  return 'standard';
}

function getLoadingMessage(routeType: any, segments: string[], searchQuery: string): string {
  const messages: Record<string, string> = {
    home: 'Loading your personalized shopping experience…',
    product: 'Fetching product details and reviews…',
    category: 'Loading category products and filters…',
    shop: 'Preparing shop catalog…',
    cart: 'Loading your shopping cart…',
    checkout: 'Preparing secure checkout…',
    checkout_address: 'Loading address information…',
    checkout_delivery: 'Calculating delivery options…',
    checkout_payment: 'Initializing payment gateways…',
    account: 'Loading your account…',
    account_orders: 'Fetching your order history…',
    account_wishlist: 'Loading your saved items…',
    account_wardrobe: 'Loading your wardrobe…',
    account_addresses: 'Loading your saved addresses…',
    account_profile: 'Loading your profile information…',
    search: searchQuery ? `Searching for "${searchQuery}"…` : 'Preparing search results…',
    deals: 'Loading exclusive deals and offers…',
    brand: 'Fetching brand information…',
    collection: 'Loading collection products…',
    help: 'Loading help center…',
    legal: 'Loading legal documents…',
    generic: 'Loading page content…',
  };

  const key = routeType.subType
    ? `${routeType.type}_${routeType.subType}`
    : routeType.type;

  return messages[key] || messages.generic;
}

function getLoadingHint(routeType: any, searchParams: string, userAgent: string): string {
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone');
  const mobileHint = isMobile ? ' (Optimized for mobile)' : '';

  const hints: Record<string, string> = {
    product: `Loading product images, specifications, and reviews${mobileHint}…`,
    category: `Applying filters and sorting products${mobileHint}…`,
    checkout: `Verifying cart items and calculating totals${mobileHint}…`,
    checkout_payment: `Connecting to secure payment processors${mobileHint}…`,
    search: `Searching through thousands of products${mobileHint}…`,
    deals: `Checking for active promotions and discounts${mobileHint}…`,
    account_orders: `Retrieving your complete order history${mobileHint}…`,
    account_wishlist: `Loading all your saved items${mobileHint}…`,
    cart: `Updating cart totals and availability${mobileHint}…`,
  };

  const key = routeType.subType
    ? `${routeType.type}_${routeType.subType}`
    : routeType.type;

  return hints[key] || `Just a moment, we are preparing everything${mobileHint}…`;
}

export async function getRouteLoadingData(routeInfo: any) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    const userId = user?.id;

    switch (routeInfo.type) {
      case 'product':
        return await getProductLoadingData(supabase, routeInfo.params.slug, userId);
      case 'category':
        return await getCategoryLoadingData(supabase, routeInfo.params.slug);
      case 'cart':
        return await getCartLoadingData(supabase, userId);
      case 'checkout':
        return await getCheckoutLoadingData(supabase, userId);
      case 'account':
        return await getAccountLoadingData(supabase, userId, routeInfo.subType);
      case 'search':
        return await getSearchLoadingData(supabase, routeInfo.searchQuery);
      case 'deals':
        return await getDealsLoadingData(supabase);
      case 'brand':
        return await getBrandLoadingData(supabase, routeInfo.params.slug);
      case 'collection':
        return await getCollectionLoadingData(supabase, routeInfo.params.slug);
      case 'home':
        return await getHomeLoadingData(supabase, userId);
      default:
        return await getGenericLoadingData(supabase);
    }
  } catch (error) {
    console.error('Error loading route data:', error);
    return getFallbackLoadingData(routeInfo.type);
  }
}

async function getProductLoadingData(supabase: any, slug: string, userId?: string) {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, stock, rating, review_count')
    .eq('slug', slug)
    .single();

  if (error) throw error;

  const variantsPromise = supabase
    .from('product_variants')
    .select('id, name, stock')
    .eq('product_id', product.id)
    .gt('stock', 0);

  const reviewsPromise = supabase
    .from('reviews')
    .select('id', { count: 'exact' })
    .eq('product_id', product.id);

  const relatedPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('category_id',
      supabase
        .from('products')
        .select('category_id')
        .eq('id', product.id)
        .single()
    )
    .neq('id', product.id)
    .gt('stock', 0);

  const userDataPromise = userId
    ? supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .single()
    : Promise.resolve({ data: null });

  const [variantsResult, reviewsResult, relatedResult, userDataResult] = await Promise.all([
    variantsPromise,
    reviewsPromise,
    relatedPromise,
    userDataPromise,
  ]);

  return {
    productId: product.id,
    productName: product.name,
    currentStock: product.stock,
    rating: product.rating,
    loadingVariants: variantsResult.data?.length > 0,
    variantsCount: variantsResult.data?.length || 0,
    loadingReviews: reviewsResult.count > 0,
    reviewsCount: reviewsResult.count || 0,
    loadingRelated: relatedResult.count > 0,
    relatedCount: relatedResult.count || 0,
    inWishlist: !!userDataResult.data,
    estimatedLoadTime: calculateProductLoadTime(
      variantsResult.data?.length,
      reviewsResult.count,
      relatedResult.count
    ),
    timestamp: Date.now(),
  };
}

async function getCategoryLoadingData(supabase: any, slug: string) {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, product_count, parent_id')
    .eq('slug', slug)
    .single();

  if (categoryError) throw categoryError;

  const filtersPromise = supabase
    .from('category_filters')
    .select('filter_type, filter_values')
    .eq('category_id', category.id);

  const subcategoriesPromise = supabase
    .from('categories')
    .select('id, name, product_count')
    .eq('parent_id', category.id);

  const brandsPromise = supabase
    .from('products')
    .select('brand_id', { count: 'exact' })
    .eq('category_id', category.id)
    .then((result: any) =>
      supabase
        .from('brands')
        .select('id, name')
        .in('id', result.data?.map((p: any) => p.brand_id) || [])
    );

  const priceRangePromise = supabase
    .from('products')
    .select('price')
    .eq('category_id', category.id)
    .order('price', { ascending: true })
    .limit(1);

  const priceRangeMaxPromise = supabase
    .from('products')
    .select('price')
    .eq('category_id', category.id)
    .order('price', { ascending: false })
    .limit(1);

  const [filtersResult, subcategoriesResult, brandsResult, priceRangeMinResult, priceRangeMaxResult] =
    await Promise.all([
      filtersPromise,
      subcategoriesPromise,
      brandsPromise,
      priceRangePromise,
      priceRangeMaxPromise,
    ]);

  const minPrice = priceRangeMinResult.data?.[0]?.price || 0;
  const maxPrice = priceRangeMaxResult.data?.[0]?.price || 100000;

  return {
    categoryId: category.id,
    categoryName: category.name,
    totalProducts: category.product_count,
    loadingFilters: filtersResult.data?.length > 0,
    filterCount: filtersResult.data?.length || 0,
    loadingSubcategories: subcategoriesResult.data?.length > 0,
    subcategoryCount: subcategoriesResult.data?.length || 0,
    loadingBrands: brandsResult.data?.length > 0,
    brandCount: brandsResult.data?.length || 0,
    priceRange: { min: minPrice, max: maxPrice },
    hasParentCategory: !!category.parent_id,
    estimatedLoadTime: calculateCategoryLoadTime(
      category.product_count,
      filtersResult.data?.length,
      subcategoriesResult.data?.length
    ),
    timestamp: Date.now(),
  };
}

async function getCartLoadingData(supabase: any, userId?: string) {
  let cartItems: any[] = [];
  let cartTotal = 0;
  let itemCount = 0;

  if (userId) {
    const { data: serverCart } = await supabase
      .from('user_carts')
      .select('items')
      .eq('user_id', userId)
      .single();

    if (serverCart?.items) {
      cartItems = serverCart.items;
      itemCount = serverCart.items.length;

      const productIds = serverCart.items.map((item: any) => item.product_id);
      const variantIds = serverCart.items.map((item: any) => item.variant_id);

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, price')
          .in('id', productIds);

        const { data: variants } = await supabase
          .from('product_variants')
          .select('id, price')
          .in('id', variantIds);

        cartTotal = serverCart.items.reduce((total: number, item: any) => {
          const product = products?.find((p: any) => p.id === item.product_id);
          const variant = variants?.find((v: any) => v.id === item.variant_id);
          const price = variant?.price || product?.price || 0;
          return total + price * item.quantity;
        }, 0);
      }
    }
  } else {
    const headersList = await headers();
    const cartCookie = headersList
      .get('cookie')
      ?.match(/(?:^|;)\s*xarastore-cart=([^;]+)/)?.[1];

    if (cartCookie) {
      try {
        const cartData = JSON.parse(decodeURIComponent(cartCookie));
        cartItems = cartData.items || [];
        itemCount = cartItems.length;
        cartTotal = cartData.total || 0;
      } catch (e) {
        console.error('Error parsing cart cookie:', e);
      }
    }
  }

  const couponsPromise = supabase
    .from('coupons')
    .select('id, code, discount_type, discount_value, min_purchase')
    .eq('is_active', true)
    .lte('min_purchase', cartTotal)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const stockCheckPromise =
    cartItems.length > 0
      ? supabase
          .from('product_variants')
          .select('id, stock')
          .in('id', cartItems.map((item: any) => item.variant_id))
      : Promise.resolve({ data: [] });

  const [couponsResult, stockResult] = await Promise.all([couponsPromise, stockCheckPromise]);

  const availableCoupons =
    couponsResult.data?.filter((coupon: any) => cartTotal >= coupon.min_purchase) || [];

  const outOfStockItems = stockResult.data?.filter((item: any) => item.stock === 0).length || 0;

  return {
    loadingItems: cartItems.length > 0,
    itemCount,
    cartTotal,
    loadingCoupons: availableCoupons.length > 0,
    availableCoupons: availableCoupons.length,
    loadingStockCheck: cartItems.length > 0,
    outOfStockItems,
    hasItems: itemCount > 0,
    estimatedLoadTime: calculateCartLoadTime(itemCount),
    timestamp: Date.now(),
  };
}

async function getCheckoutLoadingData(supabase: any, userId?: string) {
  const data: any = {
    loadingAddresses: false,
    loadingShipping: false,
    loadingPaymentMethods: false,
    addressCount: 0,
    shippingOptions: 0,
    paymentMethods: 0,
  };

  if (userId) {
    const addressesPromise = supabase
      .from('user_addresses')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const paymentsPromise = supabase
      .from('user_payment_methods')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);

    const shippingPromise = supabase
      .from('shipping_options')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .lte('min_order_amount', 0)
      .or(`max_order_amount.is.null,max_order_amount.gt.${0}`);

    const [addressesResult, paymentsResult, shippingResult] = await Promise.all([
      addressesPromise,
      paymentsPromise,
      shippingPromise,
    ]);

    data.loadingAddresses = addressesResult.count > 0;
    data.addressCount = addressesResult.count || 0;
    data.loadingPaymentMethods = paymentsResult.count > 0;
    data.paymentMethods = paymentsResult.count || 0;
    data.loadingShipping = shippingResult.count > 0;
    data.shippingOptions = shippingResult.count || 0;

    if (addressesResult.count > 0) {
      const { data: defaultAddress } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();
      data.hasDefaultAddress = !!defaultAddress;
    }
  }

  data.paymentMethods += 1;
  data.loadingPaymentMethods = true;

  const countriesResult = await supabase
    .from('shipping_countries')
    .select('country_code', { count: 'exact' })
    .eq('is_active', true);

  data.shippingCountries = countriesResult.count || 0;
  data.estimatedLoadTime = calculateCheckoutLoadTime(
    data.addressCount,
    data.paymentMethods,
    data.shippingOptions
  );
  data.timestamp = Date.now();

  return data;
}

async function getAccountLoadingData(supabase: any, userId?: string, subType?: string) {
  if (!userId) {
    return {
      isAuthenticated: false,
      loadingProfile: false,
      loadingOrders: false,
      loadingWishlist: false,
      estimatedLoadTime: 1000,
      timestamp: Date.now(),
    };
  }

  const promises: Promise<any>[] = [];
  const data: any = { isAuthenticated: true, userId };

  const profilePromise = supabase
    .from('users')
    .select('full_name, email, phone, avatar_url, created_at')
    .eq('id', userId)
    .single();
  promises.push(profilePromise);

  switch (subType) {
    case 'orders':
      promises.push(
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      );
      data.loadingOrders = true;
      break;
    case 'wishlist':
      promises.push(
        supabase.from('wishlist').select('id', { count: 'exact' }).eq('user_id', userId)
      );
      data.loadingWishlist = true;
      break;
    case 'wardrobe':
      promises.push(
        supabase.from('user_wardrobe').select('id', { count: 'exact' }).eq('user_id', userId)
      );
      data.loadingWardrobe = true;
      break;
    case 'addresses':
      promises.push(
        supabase.from('user_addresses').select('id', { count: 'exact' }).eq('user_id', userId)
      );
      data.loadingAddresses = true;
      break;
    case 'profile':
      data.loadingProfile = true;
      break;
  }

  const results = await Promise.all(promises);

  if (results[0].data) {
    const profile = results[0].data;
    data.userName = profile.full_name;
    data.userEmail = profile.email;
    data.memberSince = new Date(profile.created_at).getFullYear();
    data.loadingProfile = true;
  }

  if (subType === 'orders' && results[1]) data.orderCount = results[1].count || 0;
  if (subType === 'wishlist' && results[1]) data.wishlistCount = results[1].count || 0;
  if (subType === 'wardrobe' && results[1]) data.wardrobeCount = results[1].count || 0;
  if (subType === 'addresses' && results[1]) data.addressCount = results[1].count || 0;

  data.estimatedLoadTime = calculateAccountLoadTime(subType);
  data.timestamp = Date.now();

  return data;
}

async function getSearchLoadingData(supabase: any, query: string) {
  if (!query) {
    return {
      query: '',
      estimatedResults: 0,
      loadingSuggestions: false,
      loadingFilters: false,
      estimatedLoadTime: 500,
      timestamp: Date.now(),
    };
  }

  const resultsPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
    .gt('stock', 0);

  const suggestionsPromise = supabase
    .from('search_suggestions')
    .select('suggestion, search_count')
    .ilike('suggestion', `%${query}%`)
    .order('search_count', { ascending: false })
    .limit(5);

  const filtersPromise = supabase
    .from('search_filters')
    .select('filter_type, filter_values')
    .eq('is_active', true);

  const [resultsResult, suggestionsResult, filtersResult] = await Promise.all([
    resultsPromise,
    suggestionsPromise,
    filtersPromise,
  ]);

  return {
    query,
    estimatedResults: resultsResult.count || 0,
    loadingSuggestions: suggestionsResult.data?.length > 0,
    suggestionCount: suggestionsResult.data?.length || 0,
    loadingFilters: filtersResult.data?.length > 0,
    filterCount: filtersResult.data?.length || 0,
    popularQueries: suggestionsResult.data?.map((s: any) => s.suggestion) || [],
    estimatedLoadTime: calculateSearchLoadTime(resultsResult.count || 0),
    timestamp: Date.now(),
  };
}

async function getDealsLoadingData(supabase: any) {
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const in3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const dealsPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('is_deal', true)
    .gt('stock', 0)
    .or(`deal_ends_at.is.null,deal_ends_at.gt.${now}`);

  const flashDealsPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('is_deal', true)
    .gt('stock', 0)
    .lte('deal_ends_at', in24h);

  const endingSoonPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('is_deal', true)
    .gt('stock', 0)
    .not('deal_ends_at', 'is', null)
    .lte('deal_ends_at', in3d);

  const [dealsResult, flashDealsResult, endingSoonResult] = await Promise.all([
    dealsPromise,
    flashDealsPromise,
    endingSoonPromise,
  ]);

  return {
    totalDeals: dealsResult.count || 0,
    flashDeals: flashDealsResult.count || 0,
    endingSoon: endingSoonResult.count || 0,
    loadingFlashDeals: flashDealsResult.count > 0,
    loadingEndingSoon: endingSoonResult.count > 0,
    hasActiveDeals: dealsResult.count > 0,
    estimatedLoadTime: calculateDealsLoadTime(
      dealsResult.count || 0,
      flashDealsResult.count || 0
    ),
    timestamp: Date.now(),
  };
}

async function getBrandLoadingData(supabase: any, slug: string) {
  const { data: brand, error } = await supabase
    .from('brands')
    .select('id, name, product_count, description')
    .eq('slug', slug)
    .single();

  if (error) throw error;

  const categoriesPromise = supabase
    .from('products')
    .select('category_id', { count: 'exact' })
    .eq('brand_id', brand.id)
    .group('category_id');

  const featuredPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('brand_id', brand.id)
    .eq('is_featured', true)
    .gt('stock', 0);

  const [categoriesResult, featuredResult] = await Promise.all([
    categoriesPromise,
    featuredPromise,
  ]);

  return {
    brandId: brand.id,
    brandName: brand.name,
    totalProducts: brand.product_count,
    categoryCount: categoriesResult.data?.length || 0,
    featuredProducts: featuredResult.count || 0,
    loadingCategories: categoriesResult.data?.length > 0,
    loadingFeatured: featuredResult.count > 0,
    estimatedLoadTime: calculateBrandLoadTime(brand.product_count),
    timestamp: Date.now(),
  };
}

async function getCollectionLoadingData(supabase: any, slug: string) {
  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, name, description, product_count')
    .eq('slug', slug)
    .single();

  if (error) throw error;

  const productsPromise = supabase
    .from('collection_products')
    .select('product_id')
    .eq('collection_id', collection.id)
    .limit(8);

  const categoriesPromise = supabase
    .from('products')
    .select('category_id')
    .in(
      'id',
      supabase
        .from('collection_products')
        .select('product_id')
        .eq('collection_id', collection.id)
    )
    .group('category_id');

  const [productsResult, categoriesResult] = await Promise.all([
    productsPromise,
    categoriesPromise,
  ]);

  return {
    collectionId: collection.id,
    collectionName: collection.name,
    totalProducts: collection.product_count,
    previewProducts: productsResult.data?.length || 0,
    categoryCount: categoriesResult.data?.length || 0,
    loadingProducts: productsResult.data?.length > 0,
    loadingCategories: categoriesResult.data?.length > 0,
    estimatedLoadTime: calculateCollectionLoadTime(collection.product_count),
    timestamp: Date.now(),
  };
}

async function getHomeLoadingData(supabase: any, userId?: string) {
  const featuredPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('is_featured', true)
    .gt('stock', 0);

  const dealsPromise = supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('is_deal', true)
    .gt('stock', 0);

  const categoriesPromise = supabase
    .from('categories')
    .select('id', { count: 'exact' })
    .is('parent_id', null);

  const userDataPromise = userId
    ? Promise.all([
        supabase.from('wishlist').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte(
            'created_at',
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          ),
      ])
    : Promise.resolve([{ count: 0 }, { count: 0 }]);

  const [featuredResult, dealsResult, categoriesResult, userDataResults] = await Promise.all([
    featuredPromise,
    dealsPromise,
    categoriesPromise,
    userDataPromise,
  ]);

  const [wishlistResult, recentOrdersResult] = userDataResults;

  return {
    featuredProducts: featuredResult.count || 0,
    activeDeals: dealsResult.count || 0,
    mainCategories: categoriesResult.count || 0,
    userWishlistCount: wishlistResult.count || 0,
    recentOrders: recentOrdersResult.count || 0,
    loadingFeatured: featuredResult.count > 0,
    loadingDeals: dealsResult.count > 0,
    loadingCategories: categoriesResult.count > 0,
    hasUserData: userId && (wishlistResult.count > 0 || recentOrdersResult.count > 0),
    estimatedLoadTime: calculateHomeLoadTime(
      featuredResult.count || 0,
      dealsResult.count || 0,
      categoriesResult.count || 0
    ),
    timestamp: Date.now(),
  };
}

async function getGenericLoadingData(supabase: any) {
  const [productsResult, categoriesResult, brandsResult, usersResult] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact' }).gt('stock', 0),
    supabase.from('categories').select('id', { count: 'exact' }),
    supabase.from('brands').select('id', { count: 'exact' }),
    supabase.from('users').select('id', { count: 'exact' }),
  ]);

  return {
    totalProducts: productsResult.count || 0,
    totalCategories: categoriesResult.count || 0,
    totalBrands: brandsResult.count || 0,
    totalUsers: usersResult.count || 0,
    loadingStats: true,
    estimatedLoadTime: 1000,
    timestamp: Date.now(),
  };
}

function getFallbackLoadingData(type: string) {
  const fallbacks: Record<string, any> = {
    product: { productId: null, loadingVariants: true, loadingReviews: true, loadingRelated: true, estimatedLoadTime: 2000, timestamp: Date.now() },
    category: { categoryId: null, loadingFilters: true, loadingProducts: true, estimatedCount: 0, estimatedLoadTime: 1500, timestamp: Date.now() },
    cart: { loadingItems: true, loadingTotals: true, loadingCoupons: true, estimatedLoadTime: 1000, timestamp: Date.now() },
    checkout: { loadingAddresses: true, loadingShipping: true, loadingPaymentMethods: true, estimatedLoadTime: 1500, timestamp: Date.now() },
    account: { loadingProfile: true, loadingOrders: true, loadingWishlist: true, estimatedLoadTime: 1200, timestamp: Date.now() },
  };
  return fallbacks[type] || { loading: true, estimatedLoadTime: 1000, timestamp: Date.now() };
}

function calculateProductLoadTime(variants: number, reviews: number, related: number): number {
  return 800 + variants * 50 + Math.min(reviews, 50) * 20 + Math.min(related, 20) * 30;
}

function calculateCategoryLoadTime(products: number, filters: number, subcategories: number): number {
  return 700 + Math.min(products, 1000) * 2 + filters * 100 + subcategories * 150;
}

function calculateCartLoadTime(items: number): number {
  return 600 + items * 100;
}

function calculateCheckoutLoadTime(addresses: number, payments: number, shipping: number): number {
  return 900 + addresses * 80 + payments * 120 + shipping * 100;
}

function calculateAccountLoadTime(subType?: string): number {
  const times: Record<string, number> = { orders: 1200, wishlist: 1000, wardrobe: 1500, addresses: 800, profile: 600 };
  return times[subType || 'profile'] || 1000;
}

function calculateSearchLoadTime(results: number): number {
  return 800 + Math.min(results, 1000) * 1.5;
}

function calculateDealsLoadTime(totalDeals: number, flashDeals: number): number {
  return 700 + Math.min(totalDeals, 500) * 3 + flashDeals * 150;
}

function calculateBrandLoadTime(products: number): number {
  return 750 + Math.min(products, 500) * 2.5;
}

function calculateCollectionLoadTime(products: number): number {
  return 800 + Math.min(products, 200) * 4;
}

function calculateHomeLoadTime(featured: number, deals: number, categories: number): number {
  return 900 + Math.min(featured, 20) * 40 + Math.min(deals, 20) * 35 + Math.min(categories, 12) * 60;
}
