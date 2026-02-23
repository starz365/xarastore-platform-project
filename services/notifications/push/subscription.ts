import { pushNotificationHandler } from './notification-handler';

interface SubscriptionOptions {
  userVisibleOnly?: boolean;
  applicationServerKey?: string;
}

export class PushSubscriptionManager {
  private static instance: PushSubscriptionManager;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.checkSupport();
    this.requestPermission();
  }

  static getInstance(): PushSubscriptionManager {
    if (!PushSubscriptionManager.instance) {
      PushSubscriptionHandler.instance = new PushSubscriptionManager();
    }
    return PushSubscriptionManager.instance;
  }

  private checkSupport() {
    this.isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      this.permission = 'denied';
      return this.permission;
    }

    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  async subscribe(userId: string, options?: SubscriptionOptions): Promise<boolean> {
    if (!this.isSupported || !this.isPermissionGranted()) {
      return false;
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscriptionOptions: PushSubscriptionOptions = {
        userVisibleOnly: options?.userVisibleOnly ?? true,
        applicationServerKey: this.urlBase64ToUint8Array(
          options?.applicationServerKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ),
      };

      const pushSubscription = await registration.pushManager.subscribe(subscriptionOptions);

      // Convert subscription to format we can store
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(pushSubscription.getKey('auth')!),
        },
      };

      // Store subscription on server
      const success = await pushNotificationHandler.subscribeUser(userId, subscriptionData);

      if (success) {
        this.subscription = pushSubscription;
        
        // Store subscription in localStorage for quick access
        localStorage.setItem('push-subscription', JSON.stringify(subscriptionData));
        
        // Dispatch subscription event
        window.dispatchEvent(new CustomEvent('push-subscribed', { detail: subscriptionData }));
      }

      return success;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      
      // Handle specific errors
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            console.error('Push permission denied by user');
            break;
          case 'InvalidStateError':
            console.error('Already subscribed to push notifications');
            break;
          case 'AbortError':
            console.error('Subscription process was aborted');
            break;
        }
      }
      
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      // Unsubscribe from push service
      const success = await this.subscription.unsubscribe();

      if (success) {
        // Remove from server
        await pushNotificationHandler.unsubscribeUser(this.subscription.endpoint);

        // Clear local storage
        localStorage.removeItem('push-subscription');
        this.subscription = null;

        // Dispatch unsubscription event
        window.dispatchEvent(new CustomEvent('push-unsubscribed'));
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        this.subscription = subscription;
        
        // Update last active timestamp on server
        await this.updateLastActive(subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  async checkSubscriptionStatus(): Promise<{
    subscribed: boolean;
    permission: NotificationPermission;
    supported: boolean;
    endpoint?: string;
  }> {
    const subscription = await this.getSubscription();
    
    return {
      subscribed: !!subscription,
      permission: this.permission,
      supported: this.isSupported,
      endpoint: subscription?.endpoint,
    };
  }

  async updateLastActive(subscription: PushSubscription): Promise<void> {
    try {
      // Extract subscription data
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      // Send update to server
      await fetch('/api/push/update-last-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }

  async resubscribe(userId: string): Promise<boolean> {
    try {
      // Get existing subscription from localStorage
      const storedSubscription = localStorage.getItem('push-subscription');
      
      if (!storedSubscription) {
        return false;
      }

      const subscriptionData = JSON.parse(storedSubscription);

      // Resubscribe on server
      const success = await pushNotificationHandler.subscribeUser(userId, subscriptionData);

      if (success) {
        // Update local subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          this.subscription = subscription;
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to resubscribe:', error);
      return false;
    }
  }

  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const result = await pushNotificationHandler.sendNotification(userId, {
        title: 'Test Notification',
        body: 'This is a test push notification from Xarastore.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: 'test-notification',
        requireInteraction: false,
        data: {
          type: 'test',
          url: '/',
          timestamp: Date.now(),
        },
        actions: [
          {
            action: 'open',
            title: 'Open App',
            icon: '/icons/open-72x72.png',
          },
        ],
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  async getSubscriptionInfo(): Promise<{
    browser: string;
    platform: string;
    userAgent: string;
    endpoint: string;
    createdAt: string;
    lastActive: string;
  } | null> {
    if (!this.subscription) {
      return null;
    }

    try {
      const response = await fetch('/api/push/subscription-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription info');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get subscription info:', error);
      return null;
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: {
      orderUpdates?: boolean;
      priceAlerts?: boolean;
      promotions?: boolean;
      securityAlerts?: boolean;
      deliveryUpdates?: boolean;
    }
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/push/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          preferences,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }

  async getUserPreferences(userId: string): Promise<{
    orderUpdates: boolean;
    priceAlerts: boolean;
    promotions: boolean;
    securityAlerts: boolean;
    deliveryUpdates: boolean;
    subscribed: boolean;
    lastActive?: string;
  }> {
    try {
      const response = await fetch(`/api/push/preferences?userId=${userId}`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get preferences:', error);
    }

    // Return defaults if fetch fails
    return {
      orderUpdates: true,
      priceAlerts: true,
      promotions: true,
      securityAlerts: true,
      deliveryUpdates: true,
      subscribed: false,
    };
  }

  async getDeliveryStats(userId: string): Promise<{
    totalSent: number;
    totalOpened: number;
    openRate: number;
    last7Days: Array<{
      date: string;
      sent: number;
      opened: number;
    }>;
  }> {
    try {
      const response = await fetch(`/api/push/stats?userId=${userId}`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get delivery stats:', error);
    }

    return {
      totalSent: 0,
      totalOpened: 0,
      openRate: 0,
      last7Days: [],
    };
  }

  // Utility methods for encoding/decoding
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  }

  // Event listeners for subscription changes
  addEventListener(
    event: 'subscribed' | 'unsubscribed' | 'error',
    callback: (data: any) => void
  ): void {
    window.addEventListener(`push-${event}`, (e: any) => callback(e.detail));
  }

  removeEventListener(
    event: 'subscribed' | 'unsubscribed' | 'error',
    callback: (data: any) => void
  ): void {
    window.removeEventListener(`push-${event}`, (e: any) => callback(e.detail));
  }

  // Periodic subscription validation
  async validateSubscription(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      // Check if subscription is still valid
      const response = await fetch(this.subscription.endpoint, {
        method: 'HEAD',
      });

      const isValid = response.status === 200 || response.status === 404;

      if (!isValid) {
        // Subscription is no longer valid, unsubscribe
        await this.unsubscribe();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to validate subscription:', error);
      return false;
    }
  }

  // Batch subscription operations
  async batchSubscribe(userIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const userId of userIds) {
      try {
        const success = await this.subscribe(userId);
        if (success) {
          results.success.push(userId);
        } else {
          results.failed.push(userId);
        }
      } catch (error) {
        results.failed.push(userId);
      }
    }

    return results;
  }

  async batchUnsubscribe(endpoints: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const endpoint of endpoints) {
      try {
        // This would need server-side implementation
        const response = await fetch('/api/push/batch-unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint }),
        });

        if (response.ok) {
          results.success.push(endpoint);
        } else {
          results.failed.push(endpoint);
        }
      } catch (error) {
        results.failed.push(endpoint);
      }
    }

    return results;
  }
}

export const pushSubscriptionManager = PushSubscriptionManager.getInstance();
