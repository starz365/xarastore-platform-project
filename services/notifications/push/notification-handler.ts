import { supabase } from '@/lib/supabase/client';

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: {
    notificationId: string;
    type: string;
    [key: string]: any;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  dismissed: number;
  failed: number;
}

export class PushNotificationHandler {
  private static instance: PushNotificationHandler;
  private vapidPublicKey: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): PushNotificationHandler {
    if (!PushNotificationHandler.instance) {
      PushNotificationHandler.instance = new PushNotificationHandler();
    }
    return PushNotificationHandler.instance;
  }

  private async initialize() {
    if (this.isInitialized) return;

    // Load VAPID public key from environment or database
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;

    if (!this.vapidPublicKey) {
      const { data: config } = await supabase
        .from('push_config')
        .select('vapid_public_key')
        .single();

      if (config) {
        this.vapidPublicKey = config.vapid_public_key;
      }
    }

    this.isInitialized = true;
  }

  async subscribeUser(userId: string, subscription: PushSubscription): Promise<boolean> {
    try {
      await this.initialize();

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', subscription.endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            user_id: userId,
            keys: subscription.keys,
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            status: 'active',
          });

        if (error) throw error;
      }

      // Update user preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          push_notifications: true,
          updated_at: new Date().toISOString(),
        });

      return true;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return false;
    }
  }

  async unsubscribeUser(endpoint: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', endpoint);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe user:', error);
      return false;
    }
  }

  async sendNotification(
    userId: string,
    notification: PushNotification
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      await this.initialize();

      // Get user's push subscription
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        return {
          success: false,
          error: 'No active push subscription found',
        };
      }

      // Create notification record
      const { data: notificationRecord, error: createError } = await supabase
        .from('push_notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          image: notification.image,
          url: notification.url,
          data: notification.data,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Send push notification
      const result = await this.sendPushNotification(subscription, {
        ...notification,
        data: {
          ...notification.data,
          notificationId: notificationRecord.id,
        },
      });

      if (result.success) {
        // Update notification status
        await supabase
          .from('push_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notificationRecord.id);
      } else {
        await supabase
          .from('push_notifications')
          .update({
            status: 'failed',
            error: result.error,
          })
          .eq('id', notificationRecord.id);
      }

      return {
        success: result.success,
        notificationId: notificationRecord.id,
        error: result.error,
      };
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendToAll(notification: PushNotification, filters?: {
    segment?: string;
    userGroup?: string;
    minLastActive?: Date;
  }): Promise<{ sent: number; failed: number; total: number }> {
    try {
      let query = supabase
        .from('push_subscriptions')
        .select('*, user:users(id, preferences)')
        .eq('status', 'active');

      if (filters?.segment) {
        query = query.eq('user.preferences->segment', filters.segment);
      }

      if (filters?.userGroup) {
        query = query.eq('user.preferences->user_group', filters.userGroup);
      }

      if (filters?.minLastActive) {
        query = query.gte('last_active', filters.minLastActive.toISOString());
      }

      const { data: subscriptions, error } = await query;

      if (error) throw error;

      if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0, total: 0 };
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendNotification(sub.user_id, notification))
      );

      const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - sent;

      return { sent, failed, total: results.length };
    } catch (error) {
      console.error('Failed to send to all:', error);
      return { sent: 0, failed: 0, total: 0 };
    }
  }

  private async sendPushNotification(
    subscription: any,
    notification: PushNotification
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      // Convert notification to Web Push format
      const pushPayload = {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-96x96.png',
        image: notification.image,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
        tag: notification.tag,
        timestamp: notification.timestamp || Date.now(),
        vibrate: notification.vibrate,
      };

      // Send via our API endpoint
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: pushSubscription,
          payload: pushPayload,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: error || 'Failed to send push notification',
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async recordNotificationInteraction(
    notificationId: string,
    interaction: 'opened' | 'clicked' | 'dismissed'
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      switch (interaction) {
        case 'opened':
          updateData.opened_at = new Date().toISOString();
          break;
        case 'clicked':
          updateData.clicked_at = new Date().toISOString();
          break;
        case 'dismissed':
          updateData.dismissed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('push_notifications')
        .update(updateData)
        .eq('id', notificationId);

      if (error) throw error;

      // Update analytics
      await this.updateNotificationStats(notificationId, interaction);

      return true;
    } catch (error) {
      console.error('Failed to record interaction:', error);
      return false;
    }
  }

  private async updateNotificationStats(notificationId: string, interaction: string) {
    try {
      const { data: notification } = await supabase
        .from('push_notifications')
        .select('type')
        .eq('id', notificationId)
        .single();

      if (!notification) return;

      const today = new Date().toISOString().split('T')[0];

      // Get or create daily stats
      const { data: existing } = await supabase
        .from('push_stats_daily')
        .select('*')
        .eq('date', today)
        .eq('notification_type', notification.type)
        .single();

      if (existing) {
        const updateData: any = {};
        updateData[interaction] = (existing[interaction] || 0) + 1;
        updateData.updated_at = new Date().toISOString();

        await supabase
          .from('push_stats_daily')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('push_stats_daily')
          .insert({
            date: today,
            notification_type: notification.type,
            [interaction]: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  async getNotificationStats(
    notificationId: string
  ): Promise<NotificationStats | null> {
    try {
      const { data: notification } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (!notification) return null;

      return {
        sent: notification.sent_at ? 1 : 0,
        delivered: notification.delivered_at ? 1 : 0,
        opened: notification.opened_at ? 1 : 0,
        clicked: notification.clicked_at ? 1 : 0,
        dismissed: notification.dismissed_at ? 1 : 0,
        failed: notification.error ? 1 : 0,
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return null;
    }
  }

  async getUserStats(userId: string): Promise<{
    total: number;
    sent: number;
    opened: number;
    clickRate: number;
    lastNotification?: string;
  }> {
    try {
      const { data: notifications, error } = await supabase
        .from('push_notifications')
        .select('sent_at, opened_at, clicked_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = notifications.length;
      const sent = notifications.filter(n => n.sent_at).length;
      const opened = notifications.filter(n => n.opened_at).length;
      const clicked = notifications.filter(n => n.clicked_at).length;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      const lastNotification = notifications[0]?.sent_at;

      return {
        total,
        sent,
        opened,
        clickRate,
        lastNotification,
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return {
        total: 0,
        sent: 0,
        opened: 0,
        clickRate: 0,
      };
    }
  }

  async getDailyStats(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('push_stats_daily')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      return data.map(day => ({
        date: day.date,
        sent: day.sent || 0,
        opened: day.opened || 0,
        clicked: day.clicked || 0,
        openRate: day.sent > 0 ? (day.opened / day.sent) * 100 : 0,
        clickRate: day.opened > 0 ? (day.clicked / day.opened) * 100 : 0,
      }));
    } catch (error) {
      console.error('Failed to get daily stats:', error);
      return [];
    }
  }

  async cleanupOldNotifications(days: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from('push_notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  async cleanupInactiveSubscriptions(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('status', 'inactive')
        .lt('updated_at', cutoffDate.toISOString());

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup inactive subscriptions:', error);
      return 0;
    }
  }

  async getActiveSubscribers(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to get active subscribers:', error);
      return 0;
    }
  }

  async getOptInRate(): Promise<number> {
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: subscribedUsers } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (totalUsers === 0) return 0;

      return (subscribedUsers || 0) / totalUsers * 100;
    } catch (error) {
      console.error('Failed to get opt-in rate:', error);
      return 0;
    }
  }

  async sendScheduledNotification(
    notification: PushNotification,
    scheduleFor: Date,
    filters?: {
      segment?: string;
      userGroup?: string;
    }
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert({
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          image: notification.image,
          url: notification.url,
          data: notification.data,
          filters,
          schedule_for: scheduleFor.toISOString(),
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error: any) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async cancelScheduledNotification(scheduleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
      return false;
    }
  }
}

export const pushNotificationHandler = PushNotificationHandler.getInstance();
