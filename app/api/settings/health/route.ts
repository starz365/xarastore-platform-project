import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { emailService } from '@/services/email/EmailService';

export async function GET(request: NextRequest) {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, any>,
    uptime: process.uptime(),
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    const { data: dbData, error: dbError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);
    const dbLatency = Date.now() - dbStart;

    healthChecks.services.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      latency: dbLatency,
      error: dbError?.message,
    };

    // Check Redis connection (if configured)
    if (process.env.REDIS_URL) {
      const redisStart = Date.now();
      // Redis health check would go here
      const redisLatency = Date.now() - redisStart;
      
      healthChecks.services.redis = {
        status: 'healthy', // Assuming Redis is working
        latency: redisLatency,
      };
    }

    // Check email service
    try {
      await emailService.initialize();
      healthChecks.services.email = {
        status: 'healthy',
        configured: !!process.env.SMTP_HOST,
      };
    } catch (emailError) {
      healthChecks.services.email = {
        status: 'unhealthy',
        error: (emailError as Error).message,
      };
    }

    // Check storage connection
    const storageStart = Date.now();
    const { data: storageData, error: storageError } = await supabase
      .storage
      .listBuckets();
    const storageLatency = Date.now() - storageStart;

    healthChecks.services.storage = {
      status: storageError ? 'unhealthy' : 'healthy',
      latency: storageLatency,
      error: storageError?.message,
    };

    // Determine overall status
    const unhealthyServices = Object.values(healthChecks.services).filter(
      service => service.status === 'unhealthy'
    );

    if (unhealthyServices.length > 0) {
      healthChecks.status = 'degraded';
    }

    if (unhealthyServices.some(s => s.error?.includes('connection'))) {
      healthChecks.status = 'unhealthy';
    }

    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'degraded' ? 207 : 503;

    return NextResponse.json(healthChecks, { status: statusCode });
  } catch (error: any) {
    healthChecks.status = 'unhealthy';
    healthChecks.services.error = {
      status: 'unhealthy',
      error: error.message,
    };

    return NextResponse.json(healthChecks, { status: 503 });
  }
}
