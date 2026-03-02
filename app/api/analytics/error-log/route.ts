xarastore/app/api/analytics/error-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/auth/api-keys';
import { captureException } from '@/lib/monitoring/sentry';

const ErrorLogSchema = z.object({
  error_id: z.string().min(1, 'Error ID is required'),
  timestamp: z.string().datetime(),
  level: z.enum(['error', 'warning', 'info', 'debug']),
  message: z.string().min(1, 'Error message is required'),
  stack_trace: z.string().optional(),
  component: z.string().optional(),
  user_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
  url: z.string().url().optional(),
  user_agent: z.string().optional(),
  ip_address: z.string().ip().optional(),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  metadata: z.record(z.any()).optional(),
  breadcrumbs: z.array(z.object({
    timestamp: z.string().datetime(),
    message: z.string(),
    category: z.string().optional(),
    level: z.enum(['error', 'warning', 'info', 'debug']).optional(),
    data: z.record(z.any()).optional(),
  })).optional(),
});

const BulkErrorLogSchema = z.array(ErrorLogSchema).max(100, 'Maximum 100 errors per bulk request');

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimit(ip, 'error-log');
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    // Validate API key for external requests
    const apiKey = request.headers.get('x-api-key');
    const isInternalRequest = request.headers.get('x-internal-request') === process.env.INTERNAL_REQUEST_SECRET;
    
    if (!isInternalRequest && apiKey) {
      const isValidKey = await validateApiKey(apiKey, 'error-logging');
      if (!isValidKey) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Determine if bulk or single error
    const isBulk = Array.isArray(body);
    const schema = isBulk ? BulkErrorLogSchema : ErrorLogSchema;
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const errors = isBulk ? validation.data : [validation.data];
    const errorsToInsert = errors.map(error => ({
      error_id: error.error_id,
      timestamp: error.timestamp,
      level: error.level,
      message: error.message,
      stack_trace: error.stack_trace,
      component: error.component,
      user_id: error.user_id,
      session_id: error.session_id,
      url: error.url,
      user_agent: error.user_agent,
      ip_address: error.ip_address,
      environment: error.environment,
      metadata: error.metadata || {},
      breadcrumbs: error.breadcrumbs || [],
      server_timestamp: new Date().toISOString(),
      server_hostname: process.env.HOSTNAME || 'unknown',
      application_version: process.env.APP_VERSION || '1.0.0',
      created_at: new Date().toISOString(),
    }));

    // Insert errors into database
    const { data: insertedErrors, error: insertError } = await supabase
      .from('error_logs')
      .insert(errorsToInsert)
      .select('id, error_id, level, message, created_at');

    if (insertError) {
      console.error('Failed to insert error logs:', insertError);
      
      // Fallback to file logging if database fails
      await logErrorsToFile(errorsToInsert);
      
      // Send to external monitoring (Sentry)
      errorsToInsert.forEach(error => {
        captureException(new Error(error.message), {
          level: error.level,
          tags: {
            component: error.component,
            environment: error.environment,
            error_id: error.error_id,
          },
          extra: {
            ...error.metadata,
            breadcrumbs: error.breadcrumbs,
            user_id: error.user_id,
            session_id: error.session_id,
          },
        });
      });

      // Still return success to client, but log our failure
      return NextResponse.json(
        { 
          success: true,
          warning: 'Errors logged with fallback mechanisms',
          count: errors.length,
        },
        { status: 202 }
      );
    }

    // Process critical errors for alerts
    const criticalErrors = errors.filter(error => error.level === 'error');
    if (criticalErrors.length > 0 && process.env.NODE_ENV === 'production') {
      await triggerErrorAlerts(criticalErrors);
    }

    // Update error aggregation statistics
    await updateErrorStats(errors);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        count: errors.length,
        inserted_ids: insertedErrors.map(e => e.id),
        critical_count: criticalErrors.length,
        rate_limit: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.resetTime,
        },
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );

  } catch (error: any) {
    // Log our own API error
    console.error('Error log API failure:', error);
    
    // Send to external monitoring
    captureException(error, {
      level: 'error',
      tags: {
        endpoint: 'error-log',
        method: 'POST',
      },
    });

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        error_id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only allow internal requests for reading error logs
    const isInternalRequest = request.headers.get('x-internal-request') === process.env.INTERNAL_REQUEST_SECRET;
    if (!isInternalRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;
    
    const level = searchParams.get('level');
    const component = searchParams.get('component');
    const environment = searchParams.get('environment') || 'production';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const userId = searchParams.get('user_id');
    const sessionId = searchParams.get('session_id');

    // Build query
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    
    if (component) {
      query = query.eq('component', component);
    }
    
    if (environment) {
      query = query.eq('environment', environment);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    if (search) {
      query = query.or(`message.ilike.%${search}%,error_id.ilike.%${search}%,stack_trace.ilike.%${search}%`);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    // Execute query
    const { data: errors, count, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Get error statistics
    const stats = await getErrorStats(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: errors || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
      filters: {
        level,
        component,
        environment,
        start_date: startDate,
        end_date: endDate,
        search,
        user_id: userId,
        session_id: sessionId,
      },
      statistics: stats,
    });

  } catch (error: any) {
    console.error('Failed to fetch error logs:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch error logs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Only allow internal requests for deletion
    const isInternalRequest = request.headers.get('x-internal-request') === process.env.INTERNAL_REQUEST_SECRET;
    if (!isInternalRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('older_than');
    const environment = searchParams.get('environment');
    const level = searchParams.get('level');

    if (!olderThan) {
      return NextResponse.json(
        { error: 'older_than parameter is required' },
        { status: 400 }
      );
    }

    // Build delete query
    let query = supabase
      .from('error_logs')
      .delete()
      .lt('created_at', olderThan);

    if (environment) {
      query = query.eq('environment', environment);
    }
    
    if (level) {
      query = query.eq('level', level);
    }

    const { error: deleteError, count } = await query;

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      deleted_count: count || 0,
      parameters: {
        older_than: olderThan,
        environment,
        level,
      },
    });

  } catch (error: any) {
    console.error('Failed to delete error logs:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete error logs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function logErrorsToFile(errors: any[]) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'error_log_fallback',
      count: errors.length,
      errors: errors.map(error => ({
        error_id: error.error_id,
        level: error.level,
        message: error.message.substring(0, 500),
        component: error.component,
      })),
    };

    // In production, this would write to a log file or external logging service
    console.error('Error log fallback:', JSON.stringify(logEntry));
    
    // Send to external logging service if configured
    if (process.env.LOG_SERVICE_URL) {
      await fetch(process.env.LOG_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      }).catch(err => console.error('Failed to send to log service:', err));
    }
  } catch (error) {
    console.error('Failed to log errors to file:', error);
  }
}

async function triggerErrorAlerts(errors: any[]) {
  try {
    // Group errors by component for better alerting
    const errorsByComponent = errors.reduce((acc, error) => {
      const component = error.component || 'unknown';
      if (!acc[component]) acc[component] = [];
      acc[component].push(error);
      return acc;
    }, {} as Record<string, any[]>);

    // Send alerts for each component
    for (const [component, componentErrors] of Object.entries(errorsByComponent)) {
      // Check if we should alert (rate limiting for alerts)
      const shouldAlert = await checkAlertRateLimit(component);
      
      if (shouldAlert) {
        // Send to alerting service (Slack, PagerDuty, Email, etc.)
        await sendAlert({
          component,
          error_count: componentErrors.length,
          sample_errors: componentErrors.slice(0, 3).map(err => ({
            error_id: err.error_id,
            message: err.message,
            timestamp: err.timestamp,
            user_id: err.user_id,
          })),
          total_errors_last_hour: await getErrorCountLastHour(component),
          environment: componentErrors[0].environment,
        });
      }
    }
  } catch (error) {
    console.error('Failed to trigger error alerts:', error);
  }
}

async function updateErrorStats(errors: any[]) {
  try {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Group errors by component and level
    const stats = errors.reduce((acc, error) => {
      const component = error.component || 'unknown';
      const level = error.level;
      
      if (!acc[component]) acc[component] = {};
      if (!acc[component][level]) acc[component][level] = 0;
      
      acc[component][level]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Update statistics in database
    for (const [component, levels] of Object.entries(stats)) {
      for (const [level, count] of Object.entries(levels)) {
        // Update hourly stats
        await supabase.rpc('update_error_stats', {
          p_component: component,
          p_level: level,
          p_period: 'hour',
          p_timestamp: hourStart.toISOString(),
          p_count: count,
        }).catch(err => console.error('Failed to update hourly stats:', err));

        // Update daily stats
        await supabase.rpc('update_error_stats', {
          p_component: component,
          p_level: level,
          p_period: 'day',
          p_timestamp: dayStart.toISOString(),
          p_count: count,
        }).catch(err => console.error('Failed to update daily stats:', err));
      }
    }
  } catch (error) {
    console.error('Failed to update error stats:', error);
  }
}

async function getErrorStats(startDate?: string | null, endDate?: string | null) {
  try {
    let query = supabase
      .from('error_statistics')
      .select('component, level, period, timestamp, error_count')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: stats, error } = await query;
    
    if (error) {
      throw error;
    }

    // Aggregate statistics
    const totalErrors = (stats || []).reduce((sum, stat) => sum + stat.error_count, 0);
    const byLevel = (stats || []).reduce((acc, stat) => {
      if (!acc[stat.level]) acc[stat.level] = 0;
      acc[stat.level] += stat.error_count;
      return acc;
    }, {} as Record<string, number>);
    
    const byComponent = (stats || []).reduce((acc, stat) => {
      if (!acc[stat.component]) acc[stat.component] = 0;
      acc[stat.component] += stat.error_count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_errors: totalErrors,
      by_level: byLevel,
      by_component: byComponent,
      latest_stats: stats?.slice(0, 10) || [],
    };
  } catch (error) {
    console.error('Failed to get error stats:', error);
    return null;
  }
}

async function checkAlertRateLimit(component: string): Promise<boolean> {
  try {
    const key = `alert_rate_limit:${component}:${new Date().getHours()}`;
    
    // Using Redis or similar for rate limiting
    // This is a simplified implementation
    const currentCount = 0; // Would get from Redis
    
    // Max 1 alert per hour per component
    return currentCount < 1;
  } catch {
    return false;
  }
}

async function sendAlert(alertData: any) {
  try {
    // Send to configured alerting services
    const alertPromises = [];

    // Slack alert
    if (process.env.SLACK_WEBHOOK_URL) {
      alertPromises.push(
        fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🚨 Error Alert: ${alertData.component}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `🚨 ${alertData.component} - Error Alert`,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Environment:*\n${alertData.environment}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Error Count:*\n${alertData.error_count}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Last Hour:*\n${alertData.total_errors_last_hour}`,
                  },
                ],
              },
              {
                type: 'divider',
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Sample Errors:*\n' + alertData.sample_errors.map((err: any) => 
                    `• ${err.message.substring(0, 100)}...`
                  ).join('\n'),
                },
              },
            ],
          }),
        }).catch(err => console.error('Slack alert failed:', err))
      );
    }

    // Email alert
    if (process.env.ALERT_EMAIL) {
      alertPromises.push(
        fetch('/api/internal/send-alert-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-request': process.env.INTERNAL_REQUEST_SECRET!,
          },
          body: JSON.stringify({
            to: process.env.ALERT_EMAIL,
            subject: `🚨 Error Alert: ${alertData.component} - ${alertData.environment}`,
            template: 'error-alert',
            data: alertData,
          }),
        }).catch(err => console.error('Email alert failed:', err))
      );
    }

    await Promise.all(alertPromises);
  } catch (error) {
    console.error('Failed to send alerts:', error);
  }
}

async function getErrorCountLastHour(component: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { count, error } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('component', component)
      .gte('created_at', oneHourAgo.toISOString());

    return error ? 0 : (count || 0);
  } catch {
    return 0;
  }
}

// Define proper CORS headers for this API
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 10;

// Database schema for error logs (to be added to migrations)
/*
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  component TEXT,
  user_id UUID REFERENCES users(id),
  session_id TEXT,
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  environment TEXT NOT NULL DEFAULT 'production',
  metadata JSONB DEFAULT '{}',
  breadcrumbs JSONB DEFAULT '[]',
  server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_hostname TEXT,
  application_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_component ON error_logs(component);
CREATE INDEX idx_error_logs_environment ON error_logs(environment);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX idx_error_logs_error_id ON error_logs(error_id);

CREATE TABLE error_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  level TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(component, level, period, timestamp)
);

CREATE INDEX idx_error_stats_timestamp ON error_statistics(timestamp DESC);
CREATE INDEX idx_error_stats_component ON error_statistics(component);
CREATE INDEX idx_error_stats_period ON error_statistics(period);

CREATE OR REPLACE FUNCTION update_error_stats(
  p_component TEXT,
  p_level TEXT,
  p_period TEXT,
  p_timestamp TIMESTAMP WITH TIME ZONE,
  p_count INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO error_statistics (component, level, period, timestamp, error_count)
  VALUES (p_component, p_level, p_period, p_timestamp, p_count)
  ON CONFLICT (component, level, period, timestamp)
  DO UPDATE SET 
    error_count = error_statistics.error_count + p_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
*/
