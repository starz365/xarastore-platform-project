'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Session {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, any>;
  };
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) {
          setSession(session);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session);
          setError(null);
          setIsLoading(false);

          // Refresh the page on sign out to clear client state
          if (event === 'SIGNED_OUT') {
            router.refresh();
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return {
    session,
    user: session?.user || null,
    isLoading,
    error,
    isAuthenticated: !!session,
  };
}
