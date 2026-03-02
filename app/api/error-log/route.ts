import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Initialize Supabase admin client with service role key for error logging
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Validation schema for error log
const errorLogSchema = z.object({
  message: z.string().min(1).max(5000),
  stack: z.string().optional(),
  component: z.string().max(200).optional(),
  type: z.enum(['client', 'api', 'database', 'payment', 'auth', 'network', 'unknown']).default('unknown'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  context: z.record(z.any()).optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().max(100).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.string().datetime().optional(),
});

// Database schema (to be created in Supabase)
/*
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  component VARCHAR(200),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  context JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  url VARCHAR(2000),
  user_agent VARCHAR(500),
  ip_address INET,
  status VARCHAR(50) DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_status ON error_logs(status);
*/

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    
    // Validate with zod schema
    const validationResult = errorLogSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid error log format',
          details: validationResult.error.errors,
          requestId,
        },
        { status: 400 }
      );
    }

    const errorData = validationResult.data;
    
    // Get client information from headers
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || errorData.userAgent || 'unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const referer = headersList.get('referer') || '';
    const origin = headersList.get('origin') || '';

    // Get session from auth header if present
    let userId = errorData.userId;
    const authHeader = headersList.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (!authError && user) {
          userId = user.id;
        }
      } catch {
        // Silently fail auth extraction
      }
    }

    // Generate session ID if not provided
    const sessionId = errorData.sessionId || randomUUID();

    // Enrich context with additional information
    const enrichedContext = {
      ...(errorData.context || {}),
      requestId,
      timestamp: errorData.timestamp || new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      referer,
      origin,
      headers: {
        accept: headersList.get('accept'),
        acceptLanguage: headersList.get('accept-language'),
        cacheControl: headersList.get('cache-control'),
      },
    };

    // Determine if this is a critical error that needs immediate attention
    const isCritical = errorData.severity === 'critical' || 
                      (errorData.type === 'payment' && errorData.severity === 'high') ||
                      (errorData.message.toLowerCase().includes('database connection')) ||
                      (errorData.message.toLowerCase().includes('authentication failed'));

    // Prepare error log entry
    const errorLogEntry = {
      message: errorData.message,
      stack: errorData.stack,
      component: errorData.component,
      type: errorData.type,
      severity: errorData.severity,
      context: enrichedContext,
      user_id: userId,
      session_id: sessionId,
      url: errorData.url || referer,
      user_agent: userAgent,
      ip_address: ipAddress,
      status: isCritical ? 'critical' : 'new',
      tags: [
        `env:${process.env.NODE_ENV}`,
        `type:${errorData.type}`,
        `severity:${errorData.severity}`,
        ...(isCritical ? ['critical', 'urgent'] : []),
        ...(errorData.component ? [`component:${errorData.component}`] : []),
      ],
      metadata: {
        requestId,
        processingTimeMs: Date.now() - startTime,
        nodeEnv: process.env.NODE_ENV,
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in database
    const { data: insertedLog, error: dbError } = await supabaseAdmin
      .from('error_logs')
      .insert(errorLogEntry)
      .select()
      .single();

    if (dbError) {
      console.error('Failed to store error log in database:', dbError);
      
      // Fallback: Write to file system in production
      if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const path = require('path');
        const logDir = path.join(process.cwd(), 'logs');
        
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
        const logEntry = JSON.stringify({
          ...errorLogEntry,
          _fallback: true,
          _dbError: dbError.message,
        }) + '\n';
        
        fs.appendFileSync(logFile, logEntry);
      }
      
      throw new Error('Database storage failed, used fallback');
    }

    // Send critical alerts if needed
    if (isCritical) {
      // Send email to on-call team
      if (process.env.ON_CALL_EMAIL) {
        try {
          await fetch(process.env.EMAIL_SERVICE_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.EMAIL_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to: process.env.ON_CALL_EMAIL.split(','),
              subject: `🚨 CRITICAL ERROR: ${errorData.message.substring(0, 100)}`,
              template: 'critical-error-alert',
              data: {
                errorId: insertedLog?.id || requestId,
                message: errorData.message,
                type: errorData.type,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                url: errorData.url,
                component: errorData.component,
                userId: userId || 'anonymous',
                severity: errorData.severity,
              },
            }),
          });
        } catch {
          // Silently fail email notification
        }
      }

      // Send to Slack/webhook if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 *Critical Error in ${process.env.NODE_ENV}*`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Error:* ${errorData.message}\n*Type:* ${errorData.type}\n*Severity:* ${errorData.severity}\n*Component:* ${errorData.component || 'N/A'}\n*URL:* ${errorData.url || 'N/A'}\n*Time:* ${new Date().toISOString()}`,
                  },
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: 'View in Dashboard' },
                      url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/errors/${insertedLog?.id}`,
                    },
                  ],
                },
              ],
            }),
          });
        } catch {
          // Silently fail Slack notification
        }
      }

      // Send to PagerDuty if configured for critical errors
      if (process.env.PAGERDUTY_INTEGRATION_KEY) {
        try {
          await fetch('https://events.pagerduty.com/v2/enqueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
              event_action: 'trigger',
              payload: {
                summary: errorData.message.substring(0, 250),
                source: 'xarastore-api',
                severity: errorData.severity === 'critical' ? 'critical' : 'error',
                timestamp: new Date().toISOString(),
                component: errorData.component || 'unknown',
                group: errorData.type,
                class: 'error',
                custom_details: {
                  errorId: insertedLog?.id,
                  url: errorData.url,
                  userId: userId,
                  environment: process.env.NODE_ENV,
                },
              },
            }),
          });
        } catch {
          // Silently fail PagerDuty notification
        }
      }
    }

    // Track error metrics for monitoring
    if (process.env.DATADOG_API_KEY) {
      try {
        const metrics = [
          {
            metric: 'xarastore.errors.count',
            points: [[Math.floor(Date.now() / 1000), 1]],
            type: 'count',
            tags: [
              `environment:${process.env.NODE_ENV}`,
              `type:${errorData.type}`,
              `severity:${errorData.severity}`,
              `component:${errorData.component || 'unknown'}`,
            ],
          },
          {
            metric: 'xarastore.errors.processing_time',
            points: [[Math.floor(Date.now() / 1000), Date.now() - startTime]],
            type: 'gauge',
            tags: [`environment:${process.env.NODE_ENV}`],
          },
        ];

        await fetch(`https://api.datadoghq.com/api/v1/series?api_key=${process.env.DATADOG_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series: metrics }),
        });
      } catch {
        // Silently fail metrics submission
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      errorId: insertedLog?.id || requestId,
      message: 'Error logged successfully',
      critical: isCritical,
      processingTimeMs: Date.now() - startTime,
    }, { status: 201 });

  } catch (error) {
    // Ultimate fallback - log to console with request ID
    console.error(`[ERROR-LOG-FAILURE][${requestId}]`, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
      processingTimeMs: Date.now() - startTime,
    });

    // Try to write to file system as last resort
    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(process.cwd(), 'logs', 'critical');
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `error-logger-failure-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify({
        requestId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }) + '\n');
    } catch {
      // Nothing we can do at this point
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process error log',
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  try {
    // Check authentication for viewing errors
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('error_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    // Execute query with pagination
    const { data: errors, error: fetchError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw fetchError;
    }

    // Get statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('error_logs')
      .select('type, severity, status, count(*)', { count: 'exact', head: false })
      .group_by('type, severity, status');

    if (statsError) {
      console.error('Failed to fetch error statistics:', statsError);
    }

    return NextResponse.json({
      success: true,
      data: errors,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      statistics: stats || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch error logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('id');

    if (!errorId) {
      return NextResponse.json(
        { success: false, error: 'Error ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, assignedTo, resolutionNotes } = body;

    // Validate input
    if (!status && !assignedTo && !resolutionNotes) {
      return NextResponse.json(
        { success: false, error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }
    }

    if (assignedTo) {
      updateData.assigned_to = assignedTo;
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }

    // Update error log
    const { data: updatedError, error: updateError } = await supabaseAdmin
      .from('error_logs')
      .update(updateData)
      .eq('id', errorId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedError,
      message: 'Error log updated successfully',
    });

  } catch (error) {
    console.error('Failed to update error log:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update error log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('id');

    if (!errorId) {
      return NextResponse.json(
        { success: false, error: 'Error ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Instead of hard delete, move to archive or mark as deleted
    const { error: deleteError } = await supabaseAdmin
      .from('error_logs')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
        metadata: {
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        },
      })
      .eq('id', errorId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Error log archived successfully',
    });

  } catch (error) {
    console.error('Failed to archive error log:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to archive error log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
