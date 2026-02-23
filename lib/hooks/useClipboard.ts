import { useState, useCallback } from 'react';

interface UseClipboardResult {
  isCopied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
  error: Error | null;
}

export function useClipboard(): UseClipboardResult {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not supported');
      }

      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setError(null);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to copy'));
      setIsCopied(false);
    }
  }, []);

  return { isCopied, copyToClipboard, error };
}
