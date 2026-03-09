import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { withRetry } from '@/lib/network/retry';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Creates a Supabase client in the current request context
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignored when running in server components without response context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // ignored when running in server components without response context
          }
        },
      },
    }
  );
};

/**
 * Get current session
 */
export const getSession = async () => {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
};

/**
 * Get current user
 */
export const getUser = async () => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return user;
};

/**
 * Require authentication for server handlers
 */
export const requireAuth = async () => {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
};

/**
 * Check user role
 */
export const checkRole = async (requiredRole: string) => {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error checking role:', error);
    throw new Error('Failed to verify permissions');
  }

  if (user.role !== requiredRole && user.role !== 'admin') {
    throw new Error('Insufficient permissions');
  }

  return session;
};

/**
 * Service role client (no user context)
 */
export const getServiceRoleClient = () => {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role environment variables');
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        get() { return undefined; },
        set() { },
        remove() { },
      },
    }
  );
};

export function withAuth(
  handler: (session: any) => Promise<Response>
) {
  return async () => {
    const supabase = await createClient()

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(session)
  }
}

/**
 * Wrapper for authenticated server handlers
 *
export const withAuth = async (
  handler: (session: any) => Promise<Response>
) => {
  try {
    const session = await requireAuth();
    return await handler(session);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Authentication failed' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Wrapper for role-based server handlers
 */
export const withRole = async (
  requiredRole: string,
  handler: (session: any) => Promise<Response>
) => {
  try {
    const session = await checkRole(requiredRole);
    return await handler(session);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Authorization failed' }),
      {
        status: error.message?.includes('Authentication') ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Safe DB operation wrapper
 */
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    console.error(errorMessage, error);
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};
