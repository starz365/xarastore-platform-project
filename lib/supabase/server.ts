import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { withRetry } from '@/lib/network/retry';

export const createClient = async () => {
  const cookieStore = await cookies(); // ← await added

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );
};

export const getSession = async () => {
  const supabase = await createClient(); // ← await
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

export const getUser = async () => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient(); // ← await
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

export const requireAuth = async () => {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
};

export const checkRole = async (requiredRole: string) => {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const supabase = await createClient(); // ← await
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

export const getServiceRoleClient = () => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
};

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

// ← REMOVED: export const supabase = createClient();
//    This ran at module load time outside a request context and caused the crash.
//    Call createClient() directly inside each function that needs it.
