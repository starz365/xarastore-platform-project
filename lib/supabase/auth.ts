import { createClient } from './server';

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      return {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata,
      };
    }

    return {
      id: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata,
      ...userData,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function getUserRole(userId: string) {
  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    return 'customer';
  }

  return user.role;
}
