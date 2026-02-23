import { useState, useEffect } from 'react';
import UAParser from 'ua-parser-js';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  browser: string;
  os: string;
  device: string;
  isTouchDevice: boolean;
  isLandscape: boolean;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    isWindows: false,
    isMacOS: false,
    isLinux: false,
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false,
    browser: '',
    os: '',
    device: '',
    isTouchDevice: false,
    isLandscape: false,
  });

  useEffect(() => {
    const parser = new UAParser();
    const result = parser.getResult();

    const isTouchDevice = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      (navigator as any).msMaxTouchPoints > 0;

    const isLandscape = window.matchMedia('(orientation: landscape)').matches;

    setDeviceInfo({
      isMobile: result.device.type === 'mobile',
      isTablet: result.device.type === 'tablet',
      isDesktop: result.device.type === undefined,
      isIOS: result.os.name === 'iOS',
      isAndroid: result.os.name === 'Android',
      isWindows: result.os.name?.includes('Windows') || false,
      isMacOS: result.os.name === 'Mac OS',
      isLinux: result.os.name === 'Linux',
      isChrome: result.browser.name === 'Chrome',
      isFirefox: result.browser.name === 'Firefox',
      isSafari: result.browser.name === 'Safari',
      isEdge: result.browser.name === 'Edge',
      browser: result.browser.name || 'Unknown',
      os: result.os.name || 'Unknown',
      device: result.device.type || 'desktop',
      isTouchDevice,
      isLandscape,
    });
  }, []);

  return deviceInfo;
}
