'use client';
import { useEffect, useState } from 'react';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';

/**
 * Client wrapper for components that rely on window/navigator,
 * preventing hydration mismatch errors.
 */
export default function ClientComponentsWrapper() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <>
      <InstallPrompt />
      <OfflineIndicator />
    </>
  );
}
