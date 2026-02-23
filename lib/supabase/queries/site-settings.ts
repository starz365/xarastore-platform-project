import { supabase } from '@/lib/supabase/client';
import { withRetry } from '@/lib/network/retry';
import {
  SiteSettings,
  PaymentSettings,
  EmailSettings,
  NotificationSettings,
} from '@/lib/utils/settings';

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
	return withRetry(async () => {
	    const { data, error } = await supabase
	      .from('site_settings')
	      .select('*')
	      .order('created_at', { ascending: false })
	      .limit(1)
	      .single();

	    if (error) throw error;
	    if (!data) throw new Error('Site settings not found');

	    return transformSiteSettings(data);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    throw error;
  }
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Payment settings not found');

    return transformPaymentSettings(data);
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    throw error;
  }
}

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Email settings not found');

    return transformEmailSettings(data);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    throw error;
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Notification settings not found');

    return transformNotificationSettings(data);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }
}

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('name, enabled')
      .order('name');

    if (error) throw error;

    return (data || []).reduce((flags, flag) => {
      flags[flag.name] = flag.enabled;
      return flags;
    }, {} as Record<string, boolean>);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return {};
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update site settings');

    return transformSiteSettings(data);
  } catch (error) {
    console.error('Error updating site settings:', error);
    throw error;
  }
}

export async function updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update payment settings');

    return transformPaymentSettings(data);
  } catch (error) {
    console.error('Error updating payment settings:', error);
    throw error;
  }
}

export async function updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update email settings');

    return transformEmailSettings(data);
  } catch (error) {
    console.error('Error updating email settings:', error);
    throw error;
  }
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update notification settings');

    return transformNotificationSettings(data);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

export async function updateFeatureFlag(name: string, enabled: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('name', name);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating feature flag:', error);
    throw error;
  }
}

export async function batchUpdateFeatureFlags(flags: Array<{ name: string; enabled: boolean }>): Promise<void> {
  try {
    const updates = flags.map(flag =>
      supabase
        .from('feature_flags')
        .update({ enabled: flag.enabled, updated_at: new Date().toISOString() })
        .eq('name', flag.name)
    );

    const results = await Promise.all(updates);
    
    for (const result of results) {
      if (result.error) throw result.error;
    }
  } catch (error) {
    console.error('Error batch updating feature flags:', error);
    throw error;
  }
}

export async function getSettingsHistory(
  type: 'site' | 'payment' | 'email' | 'notification',
  limit: number = 10
): Promise<any[]> {
  try {
    let tableName: string;
    switch (type) {
      case 'site': tableName = 'site_settings_history'; break;
      case 'payment': tableName = 'payment_settings_history'; break;
      case 'email': tableName = 'email_settings_history'; break;
      case 'notification': tableName = 'notification_settings_history'; break;
      default: throw new Error('Invalid settings type');
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching settings history:', error);
    return [];
  }
}

export async function createSettingsSnapshot(type: string, data: any, userId: string): Promise<void> {
  try {
    let tableName: string;
    switch (type) {
      case 'site': tableName = 'site_settings_history'; break;
      case 'payment': tableName = 'payment_settings_history'; break;
      case 'email': tableName = 'email_settings_history'; break;
      case 'notification': tableName = 'notification_settings_history'; break;
      default: throw new Error('Invalid settings type');
    }

    const { error } = await supabase
      .from(tableName)
      .insert({
        settings_data: data,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating settings snapshot:', error);
    throw error;
  }
}

export async function getSettingsAuditLog(
  page: number = 1,
  pageSize: number = 20
): Promise<{ logs: any[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('settings_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching settings audit log:', error);
    return { logs: [], total: 0 };
  }
}

export async function logSettingsChange(
  action: string,
  entity: string,
  entityId: string,
  userId: string,
  changes: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('settings_audit_log')
      .insert({
        action,
        entity,
        entity_id: entityId,
        user_id: userId,
        changes,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging settings change:', error);
    // Don't throw here to prevent breaking the main action
  }
}

export async function validateSettingsAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No admin user found
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error validating settings access:', error);
    return false;
  }
}

export async function getSettingsOverview(): Promise<{
  site: SiteSettings;
  payment: PaymentSettings;
  email: EmailSettings;
  notification: NotificationSettings;
  featureFlags: Record<string, boolean>;
}> {
  try {
    const [
      siteSettings,
      paymentSettings,
      emailSettings,
      notificationSettings,
      featureFlags,
    ] = await Promise.all([
      getSiteSettings(),
      getPaymentSettings(),
      getEmailSettings(),
      getNotificationSettings(),
      getFeatureFlags(),
    ]);

    return {
      site: siteSettings,
      payment: paymentSettings,
      email: emailSettings,
      notification: notificationSettings,
      featureFlags,
    };
  } catch (error) {
    console.error('Error fetching settings overview:', error);
    throw error;
  }
}

export async function resetSettingsToDefault(type: string): Promise<void> {
  try {
    const defaultSettings = await getDefaultSettings(type);
    
    switch (type) {
      case 'site':
        await updateSiteSettings(defaultSettings);
        break;
      case 'payment':
        await updatePaymentSettings(defaultSettings);
        break;
      case 'email':
        await updateEmailSettings(defaultSettings);
        break;
      case 'notification':
        await updateNotificationSettings(defaultSettings);
        break;
      default:
        throw new Error('Invalid settings type');
    }
  } catch (error) {
    console.error('Error resetting settings to default:', error);
    throw error;
  }
}

async function getDefaultSettings(type: string): Promise<any> {
  const defaults: Record<string, any> = {
    site: {
      site_name: 'Xarastore',
      site_tagline: "it's a deal",
      primary_color: '#dc2626',
      secondary_color: '#fecaca',
      logo_url: '',
      favicon_url: '',
      contact_email: '',
      support_phone: '',
      business_address: '',
      currency: 'KES',
      currency_symbol: 'KES',
      tax_rate: 0.16,
      shipping_free_threshold: 2000,
      shipping_standard_price: 299,
      shipping_express_price: 599,
      return_window_days: 30,
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      social_facebook: '',
      social_twitter: '',
      social_instagram: '',
      social_tiktok: '',
      google_analytics_id: '',
      facebook_pixel_id: '',
      maintenance_mode: false,
      maintenance_message: '',
    },
    payment: {
      mpesa_enabled: false,
      mpesa_consumer_key: '',
      mpesa_consumer_secret: '',
      mpesa_shortcode: '',
      mpesa_passkey: '',
      mpesa_environment: 'sandbox',
      stripe_enabled: false,
      stripe_publishable_key: '',
      stripe_secret_key: '',
      stripe_webhook_secret: '',
      paypal_enabled: false,
      paypal_client_id: '',
      paypal_secret_key: '',
      bank_transfer_enabled: false,
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_branch: '',
    },
    email: {
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      smtp_encryption: 'tls',
      from_email: '',
      from_name: '',
      order_confirmation_enabled: false,
      order_shipped_enabled: false,
      order_delivered_enabled: false,
      welcome_email_enabled: false,
      password_reset_enabled: false,
      newsletter_enabled: false,
      newsletter_from_name: '',
      newsletter_from_email: '',
    },
    notification: {
      new_order_notification: false,
      new_order_email: '',
      low_stock_threshold: 10,
      low_stock_notification: false,
      low_stock_email: '',
      customer_registration_notification: false,
      customer_registration_email: '',
      review_submitted_notification: false,
      review_submitted_email: '',
    },
  };

  return defaults[type] || {};
}

function transformSiteSettings(data: any): SiteSettings {
  return {
    id: data.id,
    site_name: data.site_name || 'Xarastore',
    site_tagline: data.site_tagline || "it's a deal",
    primary_color: data.primary_color || '#dc2626',
    secondary_color: data.secondary_color || '#fecaca',
    logo_url: data.logo_url || '',
    favicon_url: data.favicon_url || '',
    contact_email: data.contact_email || '',
    support_phone: data.support_phone || '',
    business_address: data.business_address || '',
    currency: data.currency || 'KES',
    currency_symbol: data.currency_symbol || 'KES',
    tax_rate: parseFloat(data.tax_rate) || 0.16,
    shipping_free_threshold: parseFloat(data.shipping_free_threshold) || 2000,
    shipping_standard_price: parseFloat(data.shipping_standard_price) || 299,
    shipping_express_price: parseFloat(data.shipping_express_price) || 599,
    return_window_days: data.return_window_days || 30,
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
    seo_keywords: data.seo_keywords || '',
    social_facebook: data.social_facebook || '',
    social_twitter: data.social_twitter || '',
    social_instagram: data.social_instagram || '',
    social_tiktok: data.social_tiktok || '',
    google_analytics_id: data.google_analytics_id || '',
    facebook_pixel_id: data.facebook_pixel_id || '',
    maintenance_mode: data.maintenance_mode || false,
    maintenance_message: data.maintenance_message || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function transformPaymentSettings(data: any): PaymentSettings {
  return {
    id: data.id,
    mpesa_enabled: data.mpesa_enabled || false,
    mpesa_consumer_key: data.mpesa_consumer_key || '',
    mpesa_consumer_secret: data.mpesa_consumer_secret || '',
    mpesa_shortcode: data.mpesa_shortcode || '',
    mpesa_passkey: data.mpesa_passkey || '',
    mpesa_environment: data.mpesa_environment || 'sandbox',
    stripe_enabled: data.stripe_enabled || false,
    stripe_publishable_key: data.stripe_publishable_key || '',
    stripe_secret_key: data.stripe_secret_key || '',
    stripe_webhook_secret: data.stripe_webhook_secret || '',
    paypal_enabled: data.paypal_enabled || false,
    paypal_client_id: data.paypal_client_id || '',
    paypal_secret_key: data.paypal_secret_key || '',
    bank_transfer_enabled: data.bank_transfer_enabled || false,
    bank_name: data.bank_name || '',
    bank_account_name: data.bank_account_name || '',
    bank_account_number: data.bank_account_number || '',
    bank_branch: data.bank_branch || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function transformEmailSettings(data: any): EmailSettings {
  return {
    id: data.id,
    smtp_host: data.smtp_host || '',
    smtp_port: data.smtp_port || 587,
    smtp_username: data.smtp_username || '',
    smtp_password: data.smtp_password || '',
    smtp_encryption: data.smtp_encryption || 'tls',
    from_email: data.from_email || '',
    from_name: data.from_name || '',
    order_confirmation_enabled: data.order_confirmation_enabled || false,
    order_shipped_enabled: data.order_shipped_enabled || false,
    order_delivered_enabled: data.order_delivered_enabled || false,
    welcome_email_enabled: data.welcome_email_enabled || false,
    password_reset_enabled: data.password_reset_enabled || false,
    newsletter_enabled: data.newsletter_enabled || false,
    newsletter_from_name: data.newsletter_from_name || '',
    newsletter_from_email: data.newsletter_from_email || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function transformNotificationSettings(data: any): NotificationSettings {
  return {
    id: data.id,
    new_order_notification: data.new_order_notification || false,
    new_order_email: data.new_order_email || '',
    low_stock_threshold: data.low_stock_threshold || 10,
    low_stock_notification: data.low_stock_notification || false,
    low_stock_email: data.low_stock_email || '',
    customer_registration_notification: data.customer_registration_notification || false,
    customer_registration_email: data.customer_registration_email || '',
    review_submitted_notification: data.review_submitted_notification || false,
    review_submitted_email: data.review_submitted_email || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function subscribeToSettingsChanges(callback: (payload: any) => void) {
  const channel = supabase
    .channel('settings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payment_settings',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'email_settings',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notification_settings',
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_flags',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function checkSettingsConsistency(): Promise<{
  isValid: boolean;
  issues: Array<{ type: string; message: string; severity: 'warning' | 'error' }>;
}> {
  const issues: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = [];

  try {
    const settings = await getSettingsOverview();

    // Check site settings
    if (!settings.site.site_name) {
      issues.push({
        type: 'site',
        message: 'Site name is not set',
        severity: 'error',
      });
    }

    if (!settings.site.primary_color || !settings.site.primary_color.startsWith('#')) {
      issues.push({
        type: 'site',
        message: 'Primary color is invalid',
        severity: 'warning',
      });
    }

    // Check payment settings
    if (settings.payment.mpesa_enabled) {
      if (!settings.payment.mpesa_consumer_key || !settings.payment.mpesa_consumer_secret) {
        issues.push({
          type: 'payment',
          message: 'M-Pesa is enabled but credentials are missing',
          severity: 'error',
        });
      }
    }

    // Check email settings
    if (
      settings.email.order_confirmation_enabled ||
      settings.email.welcome_email_enabled ||
      settings.email.password_reset_enabled
    ) {
      if (!settings.email.smtp_host || !settings.email.smtp_username) {
        issues.push({
          type: 'email',
          message: 'Email notifications are enabled but SMTP settings are incomplete',
          severity: 'error',
        });
      }
    }

    // Check feature flags
    const requiredFeatures = ['guest_checkout', 'product_reviews'];
    for (const feature of requiredFeatures) {
      if (settings.featureFlags[feature] === undefined) {
        issues.push({
          type: 'feature_flags',
          message: `Required feature flag "${feature}" is missing`,
          severity: 'error',
        });
      }
    }

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues,
    };
  } catch (error) {
    console.error('Error checking settings consistency:', error);
    
    issues.push({
      type: 'system',
      message: 'Failed to check settings consistency',
      severity: 'error',
    });

    return {
      isValid: false,
      issues,
    };
  }
}
