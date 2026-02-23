import { supabase } from '@/lib/supabase/client';
import { smsService } from './sender';
import { SMSTemplateName, getTemplate, renderTemplate, validateTemplateVariables, estimateSMSCount } from './templates';

interface QueuedSMS {
  id: string;
  to: string | string[];
  template: SMSTemplateName;
  data: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retrying';
  retryCount: number;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  retrying: number;
  total: number;
}

export class SMSGateway {
  private static instance: SMSGateway;
  private isProcessing = false;
  private readonly batchSize = 100;
  private readonly retryLimit = 2;
  private readonly retryDelays = [2000, 10000]; // 2s, 10s
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startProcessing();
  }

  static getInstance(): SMSGateway {
    if (!SMSGateway.instance) {
      SMSGateway.instance = new SMSGateway();
    }
    return SMSGateway.instance;
  }

  private startProcessing() {
    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    // Also process on startup
    setTimeout(() => this.processQueue(), 10000);
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  async send(
    to: string | string[],
    template: SMSTemplateName,
    data: Record<string, any>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      scheduledFor?: Date;
      type?: 'transactional' | 'promotional' | 'alert';
    }
  ): Promise<string> {
    try {
      const templateConfig = getTemplate(template);
      if (!templateConfig) {
        throw new Error(`Template not found: ${template}`);
      }

      // Validate template variables
      if (!validateTemplateVariables(templateConfig.content, data)) {
        throw new Error('Missing required template variables');
      }

      // Render template
      const message = renderTemplate(templateConfig.content, data);

      // Check message length
      const smsCount = estimateSMSCount(message);
      if (smsCount > 3) {
        throw new Error(`Message too long (${smsCount} SMS). Maximum is 3 SMS.`);
      }

      const { data: queueData, error } = await supabase
        .from('sms_queue')
        .insert({
          to: Array.isArray(to) ? to : [to],
          template,
          data,
          priority: options?.priority || 'normal',
          status: 'pending',
          retry_count: 0,
          scheduled_for: options?.scheduledFor?.toISOString(),
          message_length: message.length,
          estimated_segments: smsCount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // If high priority, process immediately
      if (options?.priority === 'high' && !options?.scheduledFor) {
        setTimeout(() => this.processQueue(), 100);
      }

      return queueData.id;
    } catch (error) {
      console.error('Failed to queue SMS:', error);
      throw error;
    }
  }

  async sendBulk(
    recipients: Array<{
      to: string;
      template: SMSTemplateName;
      data: Record<string, any>;
    }>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      type?: 'transactional' | 'promotional' | 'alert';
    }
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const recipient of recipients) {
      try {
        const id = await this.send(recipient.to, recipient.template, recipient.data, options);
        ids.push(id);
      } catch (error) {
        console.error('Failed to queue SMS in bulk:', error);
        // Continue with other SMS
      }
    }

    return ids;
  }

  private async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Get pending SMS, ordered by priority and creation time
      const { data: pendingSMS, error } = await supabase
        .from('sms_queue')
        .select('*')
        .in('status', ['pending', 'retrying'])
        .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
        .order('priority', { ascending: false }) // high first
        .order('created_at', { ascending: true })
        .limit(this.batchSize);

      if (error) throw error;

      if (!pendingSMS || pendingSMS.length === 0) {
        return;
      }

      // Mark SMS as processing
      const smsIds = pendingSMS.map(sms => sms.id);
      await this.updateStatus(smsIds, 'processing');

      // Process SMS in parallel with concurrency limit
      const concurrencyLimit = 5;
      const batches = [];
      
      for (let i = 0; i < pendingSMS.length; i += concurrencyLimit) {
        const batch = pendingSMS.slice(i, i + concurrencyLimit);
        batches.push(batch);
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(sms => this.processSMS(sms))
        );
      }

    } catch (error) {
      console.error('Error processing SMS queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSMS(queueItem: any) {
    try {
      const templateConfig = getTemplate(queueItem.template as SMSTemplateName);
      if (!templateConfig) {
        throw new Error(`Template not found: ${queueItem.template}`);
      }

      const message = renderTemplate(templateConfig.content, queueItem.data);

      const result = await smsService.send({
        to: queueItem.to,
        message,
        template: queueItem.template,
        data: queueItem.data,
        type: queueItem.type || 'transactional',
        priority: queueItem.priority,
      });

      if (result.success) {
        await this.updateStatus([queueItem.id], 'sent', {
          message_id: result.messageId,
          provider: result.provider,
          actual_segments: estimateSMSCount(message),
        });
      } else {
        await this.handleFailedSMS(queueItem, result.error);
      }

    } catch (error: any) {
      await this.handleFailedSMS(queueItem, error.message);
    }
  }

  private async handleFailedSMS(queueItem: any, error: string) {
    const retryCount = queueItem.retry_count || 0;

    if (retryCount < this.retryLimit) {
      // Schedule retry
      const retryDelay = this.retryDelays[retryCount] || 30000; // Default 30 seconds
      const retryAt = new Date(Date.now() + retryDelay);

      await supabase
        .from('sms_queue')
        .update({
          status: 'retrying',
          retry_count: retryCount + 1,
          scheduled_for: retryAt.toISOString(),
          last_error: error.substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);
    } else {
      // Mark as failed after retries exhausted
      await this.updateStatus([queueItem.id], 'failed', {
        last_error: error.substring(0, 500),
      });
    }
  }

  private async updateStatus(ids: string[], status: QueuedSMS['status'], additionalData: any = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('sms_queue')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update SMS status:', error);
    }
  }

  async getStats(): Promise<QueueStats> {
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('status');

      if (error) throw error;

      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        retrying: 0,
        total: 0,
      };

      data?.forEach(item => {
        stats[item.status]++;
        stats.total++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        retrying: 0,
        total: 0,
      };
    }
  }

  async getQueueItems(
    status?: QueuedSMS['status'] | QueuedSMS['status'][],
    limit: number = 100,
    offset: number = 0
  ): Promise<QueuedSMS[]> {
    try {
      let query = supabase
        .from('sms_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        to: item.to,
        template: item.template as SMSTemplateName,
        data: item.data,
        priority: item.priority,
        status: item.status,
        retryCount: item.retry_count,
        scheduledFor: item.scheduled_for,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      console.error('Failed to get queue items:', error);
      return [];
    }
  }

  async retryFailedSMS(ids?: string[]): Promise<number> {
    try {
      let query = supabase
        .from('sms_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          scheduled_for: null,
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'failed');

      if (ids) {
        query = query.in('id', ids);
      }

      const { count, error } = await query;

      if (error) throw error;

      // Trigger immediate processing
      setTimeout(() => this.processQueue(), 100);

      return count || 0;
    } catch (error) {
      console.error('Failed to retry SMS:', error);
      return 0;
    }
  }

  async deleteSMS(ids: string[]): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('sms_queue')
        .delete()
        .in('id', ids);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to delete SMS:', error);
      return 0;
    }
  }

  async cleanupOldSMS(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from('sms_queue')
        .delete()
        .in('status', ['sent', 'failed'])
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup old SMS:', error);
      return 0;
    }
  }

  async getPerformanceReport(startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const report = {
        totals: {
          sent: data.filter(d => d.status === 'sent').length,
          failed: data.filter(d => d.status === 'failed').length,
          pending: data.filter(d => d.status === 'pending' || d.status === 'retrying').length,
          total: data.length,
        },
        deliveryRate: 0,
        totalSegments: data.reduce((sum, sms) => sum + (sms.estimated_segments || 1), 0),
        byTemplate: {} as Record<string, number>,
        byHour: {} as Record<string, number>,
        failures: data.filter(d => d.status === 'failed').map(d => ({
          id: d.id,
          template: d.template,
          error: d.last_error,
          createdAt: d.created_at,
        })),
      };

      // Calculate delivery rate
      if (report.totals.total > 0) {
        report.deliveryRate = (report.totals.sent / report.totals.total) * 100;
      }

      // Group by template
      data.forEach(sms => {
        report.byTemplate[sms.template] = (report.byTemplate[sms.template] || 0) + 1;
      });

      // Group by hour
      data.forEach(sms => {
        const hour = new Date(sms.created_at).getHours();
        const key = `${hour}:00`;
        report.byHour[key] = (report.byHour[key] || 0) + 1;
      });

      return report;
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  async getEstimatedCost(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('estimated_segments, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'sent');

      if (error) throw error;

      const totalSegments = data.reduce((sum, sms) => sum + (sms.estimated_segments || 1), 0);
      
      // Average cost per segment in KES
      const costPerSegment = 1.5;
      
      return totalSegments * costPerSegment;
    } catch (error) {
      console.error('Failed to estimate cost:', error);
      return 0;
    }
  }

  async getTemplateUsage(startDate: Date, endDate: Date): Promise<Array<{ template: string; count: number; percentage: number }>> {
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('template')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const templateCounts = data.reduce((acc: Record<string, number>, sms) => {
        acc[sms.template] = (acc[sms.template] || 0) + 1;
        return acc;
      }, {});

      const total = data.length;
      
      return Object.entries(templateCounts)
        .map(([template, count]) => ({
          template,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to get template usage:', error);
      return [];
    }
  }
}

export const smsGateway = SMSGateway.getInstance();
