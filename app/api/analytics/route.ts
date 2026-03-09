import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ratelimit } from '@/lib/redis/ratelimit'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/* ------------------------------------------------ */
/* POST /api/analytics */
/* ------------------------------------------------ */

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { success, limit, reset, remaining } = await ratelimit.analytics(ip)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset)
          }
        }
      )
    }

    const body = await request.json()
    const { type, data, sessionId, userId } = body ?? {}

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sanitizedData = sanitizeAnalyticsData(data)

    const analyticsRecord = {
      type,
      data: sanitizedData,
      session_id: sessionId ?? null,
      user_id: userId ?? null,
      user_agent: (request.headers.get('user-agent') ?? 'unknown').slice(0, 500),
      referrer: (request.headers.get('referer') ?? 'direct').slice(0, 500),
      ip_address: ip.slice(0, 100),
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert(analyticsRecord)

    if (error) throw error

    if (type === 'pageview' || type === 'event') {
      await processRealTimeAnalytics(supabase, type, sanitizedData, userId)
    }

    if (sanitizedData?.category === 'ecommerce') {
      await processEcommerceAnalytics(supabase, sanitizedData)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Analytics API error:', error)

    try {
      await supabase.from('analytics_errors').insert({
        error: error?.message ?? 'unknown error',
        endpoint: '/api/analytics',
        created_at: new Date().toISOString()
      })
    } catch (loggingError) {
      console.error('Failed to log analytics error', loggingError)
    }

    return NextResponse.json(
      { success: false, error: 'Analytics processing failed' },
      { status: 500 }
    )
  }
}

/* ------------------------------------------------ */
/* GET /api/analytics */
/* ------------------------------------------------ */

export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    const { searchParams } = new URL(request.url)

    const startDate =
      searchParams.get('start_date') ??
      new Date(Date.now() - 30 * 86400000).toISOString()

    const endDate =
      searchParams.get('end_date') ??
      new Date().toISOString()

    const metrics =
      searchParams.get('metrics')?.split(',') ??
      ['pageviews', 'sessions', 'conversions']

    const analyticsData = await getAggregatedAnalytics(
      supabase,
      startDate,
      endDate,
      metrics
    )

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeframe: { startDate, endDate }
    })
  } catch (error: any) {
    console.error('Analytics GET error:', error)

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/* ------------------------------------------------ */
/* Sanitization */
/* ------------------------------------------------ */

function sanitizeAnalyticsData(data: any) {
  const sanitized = { ...data }

  delete sanitized.email
  delete sanitized.phone
  delete sanitized.password
  delete sanitized.credit_card
  delete sanitized.token
  delete sanitized.api_key

  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
      sanitized[key] = sanitized[key].slice(0, 1000)
    }
  }

  return sanitized
}

/* ------------------------------------------------ */
/* Real-time analytics */
/* ------------------------------------------------ */

async function processRealTimeAnalytics(
  supabase: SupabaseClient<Database>,
  type: string,
  data: any,
  userId?: string
) {
  try {
    const timestamp = new Date().toISOString()
    const hourKey = new Date().toISOString().slice(0, 13)

    const updateData: Record<string, any> = {
      [`${type}_count`]: 1,
      updated_at: timestamp
    }

    if (userId) updateData.unique_users = 1

    await supabase.from('analytics_hourly').upsert(
      {
        hour: hourKey,
        ...updateData
      },
      { onConflict: 'hour' }
    )
  } catch (error) {
    console.error('Real-time analytics error:', error)
  }
}

/* ------------------------------------------------ */
/* Ecommerce analytics */
/* ------------------------------------------------ */

async function processEcommerceAnalytics(
  supabase: SupabaseClient<Database>,
  data: any
) {
  try {
    const { action, product_id, value } = data

    if (action === 'product_view' && product_id) {
      await supabase.rpc('increment_product_views', {
        product_id_param: product_id
      })
    }

    if (action === 'add_to_cart' && product_id) {
      await supabase.rpc('increment_cart_additions', {
        product_id_param: product_id
      })
    }

    if (action === 'purchase' && product_id) {
      await supabase.rpc('increment_product_purchases', {
        product_id_param: product_id,
        amount_param: value ?? 0
      })
    }
  } catch (error) {
    console.error('Ecommerce analytics error:', error)
  }
}

/* ------------------------------------------------ */
/* Aggregated analytics */
/* ------------------------------------------------ */

async function getAggregatedAnalytics(
  supabase: SupabaseClient<Database>,
  startDate: string,
  endDate: string,
  metrics: string[]
) {
  try {
    const { data, error } = await supabase.rpc('get_analytics_aggregates', {
      start_date_param: startDate,
      end_date_param: endDate
    })

    if (error) throw error

    const result = data?.[0] ?? {
      pageviews: 0,
      sessions: 0,
      conversions: 0,
      revenue: 0
    }

    const response: Record<string, any> = {}

    for (const metric of metrics) {
      switch (metric) {
        case 'pageviews':
          response.pageviews = { metric, value: result.pageviews ?? 0 }
          break

        case 'sessions':
          response.sessions = { metric, value: result.sessions ?? 0 }
          break

        case 'conversions':
          response.conversions = { metric, value: result.conversions ?? 0 }
          break

        case 'revenue':
          response.revenue = {
            metric,
            value: result.revenue ?? 0,
            currency: 'KES'
          }
          break

        default:
          response[metric] = { metric, value: 0 }
      }
    }

    return response
  } catch (error) {
    console.error('Analytics aggregation error:', error)

    const fallback: Record<string, any> = {}

    for (const metric of metrics) {
      fallback[metric] = { metric, value: 0 }
    }

    return fallback
  }
}
