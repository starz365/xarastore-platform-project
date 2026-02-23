import { useEffect, useState } from 'react';
import { settingsManager, SiteSettings, PaymentSettings, EmailSettings, NotificationSettings } from '@/lib/utils/settings';

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsManager.getSiteSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      console.error('Failed to load site settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, isLoading, error, refresh: loadSettings };
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsManager.getPaymentSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment settings');
      console.error('Failed to load payment settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, isLoading, error, refresh: loadSettings };
}

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsManager.getEmailSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email settings');
      console.error('Failed to load email settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, isLoading, error, refresh: loadSettings };
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsManager.getNotificationSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification settings');
      console.error('Failed to load notification settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, isLoading, error, refresh: loadSettings };
}

export function useFeatureFlag(featureName: string) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkFeature = async () => {
    try {
      setIsLoading(true);
      const enabled = await settingsManager.isFeatureEnabled(featureName);
      setIsEnabled(enabled);
    } catch (error) {
      console.error(`Failed to check feature flag ${featureName}:`, error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkFeature();
  }, [featureName]);

  return { isEnabled, isLoading, refresh: checkFeature };
}

export function useMaintenanceMode() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const checkMaintenance = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsManager.getSiteSettings();
      setIsMaintenance(settings.maintenance_mode);
      setMessage(settings.maintenance_message || '');
    } catch (error) {
      console.error('Failed to check maintenance mode:', error);
      setIsMaintenance(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkMaintenance();
    
    // Check every minute
    const interval = setInterval(checkMaintenance, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { isMaintenance, message, isLoading, refresh: checkMaintenance };
}
