import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ratelimit } from '@/lib/redis/ratelimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(`analytics:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    const body = await request.json();
    const { type, data, sessionId, userId } = body;

    // Validate request
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize and validate data
    const sanitizedData = sanitizeAnalyticsData(data);
    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || 'direct';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';

    // Prepare analytics record
    const analyticsRecord = {
      type,
      data: sanitizedData,
      session_id: sessionId,
      user_id: userId,
      user_agent: userAgent.substring(0, 500),
      referrer: referrer.substring(0, 500),
      ip_address: ipAddress,
      created_at: timestamp,
    };

    // Insert into analytics table
    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(analyticsRecord);

    if (insertError) {
      console.error('Analytics insert error:', insertError);
      throw insertError;
    }

    // Process real-time analytics if needed
    if (type === 'pageview' || type === 'event') {
      await processRealTimeAnalytics(type, sanitizedData, userId);
    }

    // If it's an ecommerce event, update product/category analytics
    if (sanitizedData.category === 'ecommerce') {
      await processEcommerceAnalytics(sanitizedData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    
    // Log error but don't fail the request
    await supabase
      .from('analytics_errors')
      .insert({
        error: error.message,
        endpoint: '/api/analytics',
        created_at: new Date().toISOString(),
      });

    return NextResponse.json(
      { success: false, error: 'Analytics processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();
    const metrics = searchParams.get('metrics')?.split(',') || ['pageviews', 'sessions', 'conversions'];

    // Get aggregated analytics data
    const analyticsData = await getAggregatedAnalytics(startDate, endDate, metrics);

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeframe: { startDate, endDate },
    });
  } catch (error: any) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function sanitizeAnalyticsData(data: any): any {
  // Remove any sensitive information
  const sanitized = { ...data };
  
  // Remove potential PII
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.password;
  delete sanitized.credit_card;
  delete sanitized.token;
  delete sanitized.api_key;
  
  // Truncate long strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
      sanitized[key] = sanitized[key].substring(0, 1000);
    }
  });
  
  return sanitized;
}

async function processRealTimeAnalytics(type: string, data: any, userId?: string) {
  try {
    const timestamp = new Date().toISOString();
    const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    // Update hourly counters
    const updateData: any = {
      [`${type}_count`]: 1,
      updated_at: timestamp,
    };

    if (userId) {
      updateData.unique_users = 1;
    }

    // Use upsert to create or update hourly aggregation
    await supabase
      .from('analytics_hourly')
      .upsert({
        hour: hourKey,
        ...updateData,
      }, {
        onConflict: 'hour',
        ignoreDuplicates: false,
      });
  } catch (error) {
    console.error('Real-time analytics error:', error);
  }
}

async function processEcommerceAnalytics(data: any) {
  try {
    const { action, product_id, category_id, value } = data;
    
    if (action === 'product_view' && product_id) {
      // Update product view count
      await supabase.rpc('increment_product_views', {
        product_id_param: product_id,
      });
    }
    
    if (action === 'add_to_cart' && product_id) {
      // Update product cart addition count
      await supabase.rpc('increment_cart_additions', {
        product_id_param: product_id,
      });
    }
    
    if (action === 'purchase' && product_id) {
      // Update product purchase count
      await supabase.rpc('increment_product_purchases', {
        product_id_param: product_id,
        amount_param: value || 0,
      });
    }
  } catch (error) {
    console.error('Ecommerce analytics error:', error);
  }
}

async function getAggregatedAnalytics(startDate: string, endDate: string, metrics: string[]) {
  const queries = metrics.map(async (metric) => {
    switch (metric) {
      case 'pageviews':
        const { data: pageviews } = await supabase
          .from('analytics_events')
          .select('id', { count: 'exact' })
          .eq('type', 'pageview')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        return { metric: 'pageviews', value: pageviews?.length || 0 };

      case 'sessions':
        const { data: sessions } = await supabase
          .from('analytics_events')
          .select('session_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        const uniqueSessions = new Set(sessions?.map(s => s.session_id)).size;
        return { metric: 'sessions', value: uniqueSessions };

      case 'conversions':
        const { data: conversions } = await supabase
          .from('analytics_events')
          .select('id', { count: 'exact' })
          .eq('data->>action', 'purchase')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        return { metric: 'conversions', value: conversions?.length || 0 };

      case 'revenue':
        const { data: revenueEvents } = await supabase
          .from('analytics_events')
          .select('data')
          .eq('data->>action', 'purchase')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        const totalRevenue = revenueEvents?.reduce((sum, event) => {
          return sum + (event.data?.value || 0);
        }, 0) || 0;
        
        return { metric: 'revenue', value: totalRevenue, currency: 'KES' };

      default:
        return { metric, value: 0 };
    }
  });

  const results = await Promise.all(queries);
  return results.reduce((acc, curr) => {
    acc[curr.metric] = curr;
    return acc;
  }, {} as Record<string, any>);
}
