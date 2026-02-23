import { supabase } from '@/lib/supabase/client';

export interface SessionData {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    timezone: string;
  };
  ipAddress?: string;
  location?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  lastUsed: Date;
  location?: string;
}

export class SessionManager {
  private static instance: SessionManager;
  private currentSessionId: string | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private readonly SESSION_KEY = 'xarastore_session_id';
  private readonly DEVICE_ID_KEY = 'xarastore_device_id';
  private readonly LAST_ACTIVITY_KEY = 'xarastore_last_activity';

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initialize(): Promise<void> {
    // Get or create device ID
    await this.getOrCreateDeviceId();
    
    // Check existing session
    await this.restoreSession();
    
    // Set up activity tracking
    this.setupActivityTracking();
    
    // Set up periodic sync
    this.setupPeriodicSync();
  }

  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      
      // Register device in database
      await this.registerDevice(deviceId);
    }
    
    return deviceId;
  }

  private generateDeviceId(): string {
    const randomPart = Math.random().toString(36).substring(2);
    const timestamp = Date.now().toString(36);
    return `device_${timestamp}_${randomPart}`;
  }

  private async registerDevice(deviceId: string): Promise<void> {
    try {
      const deviceInfo = this.getDeviceInfo();
      
      await supabase
        .from('user_devices')
        .upsert({
          device_id: deviceId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          device_name: deviceInfo.name,
          device_type: deviceInfo.type,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          screen_resolution: deviceInfo.screenResolution,
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to register device:', error);
    }
  }

  private getDeviceInfo(): {
    name: string;
    type: 'desktop' | 'mobile' | 'tablet';
    userAgent: string;
    platform: string;
    screenResolution: string;
  } {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    
    // Detect device type
    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      type = /iPad|Tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    
    // Generate device name
    const deviceNames: Record<string, string> = {
      'MacIntel': 'Mac',
      'Win32': 'Windows PC',
      'Win64': 'Windows PC',
      'Linux x86_64': 'Linux PC',
      'iPhone': 'iPhone',
      'iPad': 'iPad',
      'Android': 'Android Device',
    };
    
    const name = deviceNames[platform] || 'Unknown Device';
    
    return {
      name,
      type,
      userAgent,
      platform,
      screenResolution,
    };
  }

  private async restoreSession(): Promise<void> {
    const sessionId = localStorage.getItem(this.SESSION_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    
    if (!sessionId || !lastActivity) {
      await this.createNewSession();
      return;
    }
    
    const lastActivityTime = new Date(lastActivity);
    const now = new Date();
    const timeDiff = now.getTime() - lastActivityTime.getTime();
    
    // Check if session expired
    if (timeDiff > this.sessionTimeout) {
      await this.createNewSession();
      return;
    }
    
    // Try to load session from database
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        await this.createNewSession();
        return;
      }
      
      this.currentSessionId = sessionId;
      await this.updateLastActivity();
      
      // Update device last seen
      const deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
      if (deviceId) {
        await supabase
          .from('user_devices')
          .update({ last_seen: new Date().toISOString() })
          .eq('device_id', deviceId);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      await this.createNewSession();
    }
  }

  private async createNewSession(): Promise<void> {
    const sessionId = this.generateSessionId();
    const deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    
    const sessionData: SessionData = {
      id: sessionId,
      userId: user?.id || 'anonymous',
      deviceInfo: {
        ...this.getDeviceInfo(),
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.sessionTimeout),
      isActive: true,
    };
    
    try {
      await supabase
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          user_id: user?.id,
          device_id: deviceId,
          device_info: sessionData.deviceInfo,
          ip_address: await this.getIPAddress(),
          last_activity: sessionData.lastActivity.toISOString(),
          expires_at: sessionData.expiresAt.toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
        });
      
      this.currentSessionId = sessionId;
      localStorage.setItem(this.SESSION_KEY, sessionId);
      localStorage.setItem(this.LAST_ACTIVITY_KEY, sessionData.lastActivity.toISOString());
      
      // Track session creation
      await this.trackEvent('session_created', { sessionId });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  private generateSessionId(): string {
    const randomPart = Math.random().toString(36).substring(2);
    const timestamp = Date.now().toString(36);
    return `session_${timestamp}_${randomPart}`;
  }

  private async getIPAddress(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return undefined;
    }
  }

  private setupActivityTracking(): void {
    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      this.updateLastActivity().catch(console.error);
    };
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateActivity();
      }
    });
  }

  private setupPeriodicSync(): void {
    // Sync session data every 5 minutes
    setInterval(async () => {
      if (this.currentSessionId) {
        await this.syncSession();
      }
    }, 5 * 60 * 1000);
  }

  async syncSession(): Promise<void> {
    if (!this.currentSessionId) return;
    
    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.sessionTimeout).toISOString(),
        })
        .eq('session_id', this.currentSessionId);
      
      localStorage.setItem(this.LAST_ACTIVITY_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync session:', error);
    }
  }

  async updateLastActivity(): Promise<void> {
    if (!this.currentSessionId) return;
    
    const now = new Date();
    
    // Update local storage
    localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toISOString());
    
    // Debounce database updates (max once per 10 seconds)
    const lastUpdate = localStorage.getItem('last_session_update');
    if (lastUpdate) {
      const lastUpdateTime = new Date(lastUpdate);
      const timeDiff = now.getTime() - lastUpdateTime.getTime();
      if (timeDiff < 10000) return;
    }
    
    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity: now.toISOString(),
          expires_at: new Date(now.getTime() + this.sessionTimeout).toISOString(),
        })
        .eq('session_id', this.currentSessionId);
      
      localStorage.setItem('last_session_update', now.toISOString());
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  async getActiveSessions(): Promise<SessionData[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(session => ({
        id: session.session_id,
        userId: session.user_id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        location: session.location,
        lastActivity: new Date(session.last_activity),
        expiresAt: new Date(session.expires_at),
        isActive: session.is_active,
        metadata: session.metadata,
      }));
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(device => ({
        id: device.device_id,
        name: device.device_name,
        type: device.device_type,
        lastUsed: new Date(device.last_seen),
        location: device.location,
      }));
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_id', sessionId);
      
      if (error) throw error;
      
      // If terminating current session, clear local data
      if (sessionId === this.currentSessionId) {
        this.clearLocalSession();
        await this.createNewSession();
      }
      
      await this.trackEvent('session_terminated', { sessionId });
      return true;
    } catch (error) {
      console.error('Failed to terminate session:', error);
      return false;
    }
  }

  async terminateAllOtherSessions(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !this.currentSessionId) {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('session_id', this.currentSessionId);
      
      if (error) throw error;
      
      await this.trackEvent('all_other_sessions_terminated', { userId: user.id });
      return true;
    } catch (error) {
      console.error('Failed to terminate other sessions:', error);
      return false;
    }
  }

  async terminateDevice(deviceId: string): Promise<boolean> {
    try {
      // Terminate all sessions from this device
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('device_id', deviceId);
      
      if (error) throw error;
      
      // Remove device record
      await supabase
        .from('user_devices')
        .delete()
        .eq('device_id', deviceId);
      
      await this.trackEvent('device_terminated', { deviceId });
      return true;
    } catch (error) {
      console.error('Failed to terminate device:', error);
      return false;
    }
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  getSessionAge(): number {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return 0;
    
    return Date.now() - new Date(lastActivity).getTime();
  }

  getTimeRemaining(): number {
    return Math.max(0, this.sessionTimeout - this.getSessionAge());
  }

  isSessionValid(): boolean {
    return this.getTimeRemaining() > 0;
  }

  async extendSession(duration: number = 30 * 60 * 1000): Promise<void> {
    this.sessionTimeout = duration;
    
    if (this.currentSessionId) {
      await this.updateLastActivity();
    }
  }

  async trackEvent(event: string, data?: Record<string, any>): Promise<void> {
    if (!this.currentSessionId) return;
    
    try {
      await supabase
        .from('session_events')
        .insert({
          session_id: this.currentSessionId,
          event_type: event,
          event_data: data || {},
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to track session event:', error);
    }
  }

  async getSessionAnalytics(
    timeframe: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageDuration: number;
    devices: Record<string, number>;
    locations: Record<string, number>;
  }> {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());
      
      if (error) throw error;
      
      const sessions = data || [];
      const activeSessions = sessions.filter(s => s.is_active);
      
      // Calculate average duration
      const durations = sessions.map(s => {
        const created = new Date(s.created_at);
        const lastActivity = new Date(s.last_activity);
        return lastActivity.getTime() - created.getTime();
      });
      
      const averageDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
      
      // Count devices
      const devices: Record<string, number> = {};
      sessions.forEach(s => {
        const deviceType = s.device_info?.type || 'unknown';
        devices[deviceType] = (devices[deviceType] || 0) + 1;
      });
      
      // Count locations
      const locations: Record<string, number> = {};
      sessions.forEach(s => {
        const country = s.location?.country || 'unknown';
        locations[country] = (locations[country] || 0) + 1;
      });
      
      return {
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        averageDuration,
        devices,
        locations,
      };
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        averageDuration: 0,
        devices: {},
        locations: {},
      };
    }
  }

  clearLocalSession(): void {
    this.currentSessionId = null;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem('last_session_update');
  }

  async logout(): Promise<void> {
    if (this.currentSessionId) {
      await this.terminateSession(this.currentSessionId);
    }
    
    this.clearLocalSession();
    
    // Clear device ID if user is logging out
    localStorage.removeItem(this.DEVICE_ID_KEY);
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true)
        .select('session_id');
      
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}

export const sessionManager = SessionManager.getInstance();

// Initialize on module load
if (typeof window !== 'undefined') {
  sessionManager.initialize().catch(console.error);
}
