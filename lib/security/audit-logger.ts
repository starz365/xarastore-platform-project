import { createClient } from '@/lib/supabase/server';

interface AuditLogEntry {
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export class AuditLogger {
  private static async getClient() {
    return await createClient();
  }

  /**
   * Log an audit event
   */
  static async log(action: string, data: Partial<AuditLogEntry> = {}): Promise<void> {
    try {
      const supabase = await this.getClient();
      
      const entry = {
        action,
        user_id: data.userId,
        ip_address: data.ip,
        user_agent: data.userAgent,
        resource: data.resource,
        resource_id: data.resourceId,
        changes: data.changes,
        metadata: data.metadata,
        created_at: data.timestamp || new Date().toISOString(),
      };

      // Log to database
      const { error } = await supabase
        .from('audit_logs')
        .insert(entry);

      if (error) {
        console.error('Failed to write audit log:', error);
      }

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT]', entry);
      }

      // Send to external logging service in production
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalService(entry);
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Log user authentication event
   */
  static async logAuth(
    userId: string,
    action: 'login' | 'logout' | 'failed_login' | 'password_change' | 'email_verification',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`auth.${action}`, {
      userId,
      resource: 'user',
      resourceId: userId,
      metadata,
    });
  }

  /**
   * Log product view
   */
  static async logProductView(
    userId: string | undefined,
    productId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log('product.view', {
      userId,
      resource: 'product',
      resourceId: productId,
      metadata,
    });
  }

  /**
   * Log cart action
   */
  static async logCartAction(
    userId: string,
    action: 'add' | 'remove' | 'update' | 'checkout',
    productId: string,
    quantity?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`cart.${action}`, {
      userId,
      resource: 'cart_item',
      resourceId: productId,
      changes: { quantity },
      metadata,
    });
  }

  /**
   * Log order event
   */
  static async logOrder(
    userId: string,
    orderId: string,
    action: 'created' | 'updated' | 'cancelled' | 'completed' | 'refunded',
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`order.${action}`, {
      userId,
      resource: 'order',
      resourceId: orderId,
      changes,
      metadata,
    });
  }

  /**
   * Log payment event
   */
  static async logPayment(
    userId: string,
    paymentId: string,
    action: 'initiated' | 'processing' | 'completed' | 'failed' | 'refunded',
    amount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`payment.${action}`, {
      userId,
      resource: 'payment',
      resourceId: paymentId,
      changes: { amount },
      metadata,
    });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(
    adminId: string,
    action: string,
    targetResource: string,
    targetId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`admin.${action}`, {
      userId: adminId,
      resource: targetResource,
      resourceId: targetId,
      changes,
      metadata: { ...metadata, isAdmin: true },
    });
  }

  /**
   * Log security event
   */
  static async logSecurity(
    action: 'rate_limit_exceeded' | 'suspicious_activity' | 'blocked_ip' | 'failed_csrf',
    ip: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(`security.${action}`, {
      ip,
      metadata: { ...metadata, severity: 'high' },
    });
  }

  /**
   * Log data export
   */
  static async logDataExport(
    userId: string,
    exportType: string,
    recordCount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log('data.export', {
      userId,
      resource: 'export',
      changes: { type: exportType, count: recordCount },
      metadata,
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const supabase = await this.getClient();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch user audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a resource
   */
  static async getResourceLogs(
    resource: string,
    resourceId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const supabase = await this.getClient();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource', resource)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch resource audit logs:', error);
      return [];
    }
  }

  /**
   * Send audit log to external service (e.g., DataDog, Splunk, etc.)
   */
  private static async sendToExternalService(entry: any): Promise<void> {
    // Implement based on your external logging service
    if (process.env.DATADOG_API_KEY) {
      // Send to DataDog
      await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY,
        },
        body: JSON.stringify({
          ...entry,
          ddsource: 'xarastore',
          service: 'audit-logger',
        }),
      }).catch(console.error);
    }
  }

  /**
   * Clean up old audit logs
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      const supabase = await this.getClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to clean up audit logs:', error);
      }
    } catch (error) {
      console.error('Audit log cleanup failed:', error);
    }
  }
}
