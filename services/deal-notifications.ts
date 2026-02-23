import { supabase } from '@/lib/supabase/client';
import { Product } from '@/types';

export class DealNotificationService {
  private static instance: DealNotificationService;

  private constructor() {}

  static getInstance(): DealNotificationService {
    if (!DealNotificationService.instance) {
      DealNotificationService.instance = new DealNotificationService();
    }
    return DealNotificationService.instance;
  }

  async notifyUsersAboutFlashDeal(product: Product) {
    try {
      // Get users who have wishlisted this product or similar products
      const { data: wishlistUsers } = await supabase
        .from('wishlist')
        .select('user_id')
        .eq('product_id', product.id);

      // Get users who have purchased from same category
      const { data: categoryUsers } = await supabase
        .from('orders')
        .select('user_id')
        .eq('status', 'delivered')
        .contains('items', [{ category_id: product.category.id }]);

      const userIds = new Set([
        ...(wishlistUsers?.map(u => u.user_id) || []),
        ...(categoryUsers?.map(u => u.user_id) || []),
      ]);

      // Send notifications
      for (const userId of userIds) {
        await this.sendNotification(userId, {
          type: 'flash_deal',
          title: 'Flash Sale Alert!',
          body: `${product.name} is now on flash sale. Hurry before it's gone!`,
          data: {
            productId: product.id,
            productSlug: product.slug,
            dealEndsAt: product.dealEndsAt,
          },
        });
      }

      // Send push notifications if enabled
      await this.sendPushNotifications(Array.from(userIds), {
        title: '⚡ Flash Sale Started!',
        body: `Don't miss ${product.name} at a special price`,
      });

    } catch (error) {
      console.error('Error notifying users about flash deal:', error);
    }
  }

  async notifyUsersAboutDealEndingSoon(product: Product, hoursLeft: number) {
    try {
      // Get users who have this product in cart
      const { data: cartUsers } = await supabase
        .from('user_carts')
        .select('user_id')
        .contains('items', [{ product_id: product.id }]);

      const userIds = cartUsers?.map(u => u.user_id) || [];

      for (const userId of userIds) {
        await this.sendNotification(userId, {
          type: 'deal_ending',
          title: 'Deal Ending Soon!',
          body: `${product.name} deal ends in ${hoursLeft} hours. Complete your purchase now!`,
          data: {
            productId: product.id,
            productSlug: product.slug,
            hoursLeft,
          },
        });
      }

    } catch (error) {
      console.error('Error notifying users about ending deal:', error);
    }
  }

  async subscribeToDealNotifications(userId: string, preferences: {
    flashSales: boolean;
    endingDeals: boolean;
    newDeals: boolean;
    categoryDeals: string[];
  }) {
    try {
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          deal_preferences: preferences,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error subscribing to deal notifications:', error);
    }
  }

  private async sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      data?: Record<string, any>;
    }
  ) {
    try {
      // Store notification in database
      await supabase.from('notifications').insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        read: false,
        created_at: new Date().toISOString(),
      });

      // Send real-time notification via Supabase Realtime
      const channel = supabase.channel(`notifications:${userId}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'notification',
            payload: notification,
          });
        }
      });

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  private async sendPushNotifications(
    userIds: string[],
    notification: { title: string; body: string }
  ) {
    // In production, integrate with push notification service
    // like Firebase Cloud Messaging, OneSignal, etc.
    console.log('Push notification would be sent:', { userIds, notification });
  }
}

export const dealNotifications = DealNotificationService.getInstance();
