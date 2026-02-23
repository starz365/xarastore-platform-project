export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'shipping' | 'payment' | 'promotion' | 'system' | 'review' | 'account';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  channels: NotificationChannel[];
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
    method?: string;
    data?: Record<string, any>;
  }>;
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  channels: NotificationChannel[];
  subject?: string;
  title: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    order_updates: boolean;
    shipping_updates: boolean;
    payment_updates: boolean;
    promotions: boolean;
    system_alerts: boolean;
    reviews: boolean;
    account_security: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    days: number[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailNotification {
  id: string;
  notificationId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'opened' | 'clicked';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  createdAt: string;
}

export interface SMSNotification {
  id: string;
  notificationId: string;
  to: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
  createdAt: string;
}

export interface PushNotification {
  id: string;
  notificationId: string;
  deviceToken: string;
  deviceType: 'ios' | 'android' | 'web';
  title: string;
  body: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  error?: string;
  createdAt: string;
}

export interface WebhookNotification {
  id: string;
  notificationId: string;
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt?: string;
  deliveredAt?: string;
  responseCode?: number;
  responseBody?: string;
  error?: string;
  retryCount: number;
  createdAt: string;
}

export interface NotificationQueue {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  scheduledFor?: string;
  retryCount: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationAnalytics {
  period: string;
  totalSent: number;
  byChannel: Record<NotificationChannel, number>;
  byType: Record<string, number>;
  deliveryRate: number;
  openRate?: number;
  clickRate?: number;
  topNotifications: Array<{
    id: string;
    type: string;
    sent: number;
    opened?: number;
    clicked?: number;
  }>;
}

export interface NotificationTrigger {
  id: string;
  name: string;
  event: string;
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: any;
  }>;
  templateId: string;
  recipients: Array<{
    type: 'user' | 'group' | 'dynamic';
    value: string;
  }>;
  delay?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkNotification {
  id: string;
  name: string;
  templateId: string;
  recipients: {
    type: 'all' | 'segment' | 'list';
    segment?: {
      filters: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
    };
    list?: string[];
  };
  scheduledFor?: string;
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';
  sentCount: number;
  failedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
