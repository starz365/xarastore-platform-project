'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { settingsManager, SiteSettings } from '@/lib/utils/settings';

interface ThemeContextType {
  settings: SiteSettings | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const siteSettings = await settingsManager.getSiteSettings();
      setSettings(siteSettings);
      
      // Apply theme to document
      applyTheme(siteSettings);
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (siteSettings: SiteSettings) => {
    // Update CSS custom properties
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', siteSettings.primary_color);
    root.style.setProperty('--secondary-color', siteSettings.secondary_color);
    
    // Update meta tags
    document.title = siteSettings.site_name + (siteSettings.site_tagline ? ` - ${siteSettings.site_tagline}` : '');
    
    // Update favicon
    if (siteSettings.favicon_url) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = siteSettings.favicon_url;
      }
    }
  };

  useEffect(() => {
    loadSettings();
    
    // Refresh settings every 5 minutes
    const interval = setInterval(loadSettings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, isLoading, refreshSettings: loadSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
