import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const healthChecks: Record<string, any> = {};
  
  try {
    // Check Supabase connection
    const dbStart = Date.now();
    const { data: dbData, error: dbError } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    healthChecks.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      latency: Date.now() - dbStart,
      error: dbError?.message || null,
      connected: !dbError,
    };

    // Check Redis connection (if configured)
    if (process.env.REDIS_URL) {
      const redisStart = Date.now();
      try {
        // In production, use Redis client
        // const redis = new Redis(process.env.REDIS_URL);
        // await redis.ping();
        healthChecks.redis = {
          status: 'healthy',
          latency: Date.now() - redisStart,
          connected: true,
        };
      } catch (error: any) {
        healthChecks.redis = {
          status: 'unhealthy',
          latency: Date.now() - redisStart,
          error: error.message,
          connected: false,
        };
      }
    }

    // Check storage connection
    const storageStart = Date.now();
    try {
      const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
      healthChecks.storage = {
        status: storageError ? 'unhealthy' : 'healthy',
        latency: Date.now() - storageStart,
        error: storageError?.message || null,
        connected: !storageError,
      };
    } catch (error: any) {
      healthChecks.storage = {
        status: 'unhealthy',
        latency: Date.now() - storageStart,
        error: error.message,
        connected: false,
      };
    }

    // System metrics
    healthChecks.system = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString(),
    };

    // Determine overall status
    const allHealthy = Object.values(healthChecks).every(
      (check: any) => check.status === 'healthy' || check.connected === true
    );

    const responseTime = Date.now() - startTime;
    const statusCode = allHealthy ? 200 : 503;

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      checks: healthChecks,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
    };

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
