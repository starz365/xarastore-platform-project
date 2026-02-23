import { supabase } from '../client';

export interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  orders: {
    current: number;
    previous: number;
    change: number;
  };
  customers: {
    current: number;
    previous: number;
    change: number;
  };
  products: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface TrafficData {
  date: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface TopPagesData {
  path: string;
  visitors: number;
  pageviews: number;
  bounceRate: number;
  avgDuration: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface ProductPerformanceData {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
  views: number;
  conversionRate: number;
}

export async function getDashboardAnalytics(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<AnalyticsData> {
  try {
    const currentStart = getPeriodStart(period);
    const previousStart = getPeriodStart(period, true);

    const [
      revenueData,
      ordersData,
      customersData,
      productsData,
    ] = await Promise.all([
      getRevenueComparison(currentStart, previousStart),
      getOrdersComparison(currentStart, previousStart),
      getCustomersComparison(currentStart, previousStart),
      getProductsComparison(currentStart, previousStart),
    ]);

    return {
      revenue: revenueData,
      orders: ordersData,
      customers: customersData,
      products: productsData,
    };
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return {
      revenue: { current: 0, previous: 0, change: 0 },
      orders: { current: 0, previous: 0, change: 0 },
      customers: { current: 0, previous: 0, change: 0 },
      products: { current: 0, previous: 0, change: 0 },
    };
  }
}

export async function getTrafficData(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<TrafficData[]> {
  try {
    const { data, error } = await supabase.rpc('get_traffic_data', {
      p_period: period,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    return [];
  }
}

export async function getTopPages(
  limit: number = 10,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<TopPagesData[]> {
  try {
    const { data, error } = await supabase.rpc('get_top_pages', {
      p_limit: limit,
      p_period: period,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching top pages:', error);
    return [];
  }
}

export async function getSalesData(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<SalesData[]> {
  try {
    const { data, error } = await supabase.rpc('get_sales_data', {
      p_period: period,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return [];
  }
}

export async function getProductPerformance(
  limit: number = 10,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<ProductPerformanceData[]> {
  try {
    const { data, error } = await supabase.rpc('get_product_performance', {
      p_limit: limit,
      p_period: period,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product performance:', error);
    return [];
  }
}

export async function getConversionFunnel(): Promise<{
  views: number;
  addToCart: number;
  checkoutStart: number;
  purchase: number;
  conversionRates: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
    viewToPurchase: number;
  };
}> {
  try {
    const [
      { count: views },
      { count: addToCart },
      { count: checkoutStart },
      { count: purchase },
    ] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event', 'product_view')
        .gte('created_at', getPeriodStart('week')),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event', 'add_to_cart')
        .gte('created_at', getPeriodStart('week')),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event', 'begin_checkout')
        .gte('created_at', getPeriodStart('week')),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event', 'purchase')
        .gte('created_at', getPeriodStart('week')),
    ]);

    const viewsCount = views || 0;
    const addToCartCount = addToCart || 0;
    const checkoutStartCount = checkoutStart || 0;
    const purchaseCount = purchase || 0;

    const conversionRates = {
      viewToCart: viewsCount > 0 ? (addToCartCount / viewsCount) * 100 : 0,
      cartToCheckout: addToCartCount > 0 ? (checkoutStartCount / addToCartCount) * 100 : 0,
      checkoutToPurchase: checkoutStartCount > 0 ? (purchaseCount / checkoutStartCount) * 100 : 0,
      viewToPurchase: viewsCount > 0 ? (purchaseCount / viewsCount) * 100 : 0,
    };

    return {
      views: viewsCount,
      addToCart: addToCartCount,
      checkoutStart: checkoutStartCount,
      purchase: purchaseCount,
      conversionRates,
    };
  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    return {
      views: 0,
      addToCart: 0,
      checkoutStart: 0,
      purchase: 0,
      conversionRates: {
        viewToCart: 0,
        cartToCheckout: 0,
        checkoutToPurchase: 0,
        viewToPurchase: 0,
      },
    };
  }
}

export async function getCustomerSegmentation(): Promise<{
  newCustomers: number;
  returningCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
}> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 60));
    const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));

    const [
      { count: totalCustomers },
      { data: recentOrders },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('user_id, created_at')
        .gte('created_at', ninetyDaysAgo.toISOString()),
    ]);

    const customerOrders = recentOrders?.reduce((acc, order) => {
      if (!acc[order.user_id]) {
        acc[order.user_id] = [];
      }
      acc[order.user_id].push(new Date(order.created_at));
      return acc;
    }, {} as Record<string, Date[]>);

    let newCustomers = 0;
    let returningCustomers = 0;
    let activeCustomers = 0;
    let atRiskCustomers = 0;
    let churnedCustomers = 0;

    if (customerOrders) {
      Object.entries(customerOrders).forEach(([userId, orders]) => {
        const firstOrder = orders[0];
        const lastOrder = orders[orders.length - 1];
        const daysSinceLastOrder = (new Date().getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24);

        if (firstOrder >= thirtyDaysAgo) {
          newCustomers++;
        } else if (orders.length > 1) {
          returningCustomers++;
        }

        if (lastOrder >= thirtyDaysAgo) {
          activeCustomers++;
        } else if (lastOrder >= sixtyDaysAgo && lastOrder < thirtyDaysAgo) {
          atRiskCustomers++;
        } else if (lastOrder < sixtyDaysAgo) {
          churnedCustomers++;
        }
      });
    }

    return {
      newCustomers,
      returningCustomers,
      activeCustomers,
      atRiskCustomers,
      churnedCustomers,
    };
  } catch (error) {
    console.error('Error fetching customer segmentation:', error);
    return {
      newCustomers: 0,
      returningCustomers: 0,
      activeCustomers: 0,
      atRiskCustomers: 0,
      churnedCustomers: 0,
    };
  }
}

export async function getGeographicData(): Promise<
  Array<{
    country: string;
    region: string;
    city: string;
    visitors: number;
    revenue: number;
  }>
> {
  try {
    const { data, error } = await supabase.rpc('get_geographic_data');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    return [];
  }
}

export async function getDeviceData(): Promise<{
  desktop: number;
  mobile: number;
  tablet: number;
  other: number;
}> {
  try {
    const { data, error } = await supabase
      .from('analytics_sessions')
      .select('device_type')
      .gte('created_at', getPeriodStart('month'));

    if (error) throw error;

    const counts = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      other: 0,
    };

    data?.forEach(session => {
      const device = session.device_type?.toLowerCase();
      if (device?.includes('desktop')) counts.desktop++;
      else if (device?.includes('mobile')) counts.mobile++;
      else if (device?.includes('tablet')) counts.tablet++;
      else counts.other++;
    });

    return counts;
  } catch (error) {
    console.error('Error fetching device data:', error);
    return { desktop: 0, mobile: 0, tablet: 0, other: 0 };
  }
}

async function getRevenueComparison(
  currentStart: Date,
  previousStart: Date
): Promise<{ current: number; previous: number; change: number }> {
  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .eq('payment_status', 'paid')
      .gte('created_at', currentStart.toISOString()),
    supabase
      .from('orders')
      .select('total')
      .eq('payment_status', 'paid')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString()),
  ]);

  const current = currentResult.data?.reduce((sum, order) => sum + order.total, 0) || 0;
  const previous = previousResult.data?.reduce((sum, order) => sum + order.total, 0) || 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, change };
}

async function getOrdersComparison(
  currentStart: Date,
  previousStart: Date
): Promise<{ current: number; previous: number; change: number }> {
  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', currentStart.toISOString()),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString()),
  ]);

  const current = currentResult.count || 0;
  const previous = previousResult.count || 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, change };
}

async function getCustomersComparison(
  currentStart: Date,
  previousStart: Date
): Promise<{ current: number; previous: number; change: number }> {
  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', currentStart.toISOString()),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString()),
  ]);

  const current = currentResult.count || 0;
  const previous = previousResult.count || 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, change };
}

async function getProductsComparison(
  currentStart: Date,
  previousStart: Date
): Promise<{ current: number; previous: number; change: number }> {
  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', currentStart.toISOString()),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString()),
  ]);

  const current = currentResult.count || 0;
  const previous = previousResult.count || 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  return { current, previous, change };
}

function getPeriodStart(period: string, previous = false): Date {
  const now = new Date();
  let start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      if (previous) start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      if (previous) start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      if (previous) start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      if (previous) start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return start;
}
