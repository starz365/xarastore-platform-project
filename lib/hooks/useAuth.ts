'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/components/shared/Toast';
import { useAnalytics } from './useAnalytics';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: any | null;
}

interface AuthError {
  message: string;
  status?: number;
}

interface PreorderIntent {
  productId: string;
  productName: string;
  timestamp: string;
}

export function useAuth() {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    session: null,
  });

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        setState({
          user: session?.user || null,
          session: session || null,
          isAuthenticated: !!session,
          isLoading: false,
        });

        // Handle preorder intent after login
        if (session?.user) {
          handlePreorderIntent();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setState({
        user: session?.user || null,
        session: session || null,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Track auth events
      if (event === 'SIGNED_IN') {
        trackEvent({
          category: 'auth',
          action: 'sign_in',
          label: session?.user?.id,
        });
        
        // Handle preorder intent after sign in
        handlePreorderIntent();
      } else if (event === 'SIGNED_OUT') {
        trackEvent({
          category: 'auth',
          action: 'sign_out',
        });
      } else if (event === 'USER_UPDATED') {
        trackEvent({
          category: 'auth',
          action: 'user_updated',
        });
      } else if (event === 'PASSWORD_RECOVERY') {
        trackEvent({
          category: 'auth',
          action: 'password_recovery',
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [trackEvent]);

  // Handle preorder intent stored in localStorage
  const handlePreorderIntent = useCallback(() => {
    try {
      const preorderData = localStorage.getItem('preorderAfterLogin');
      if (preorderData) {
        const intent: PreorderIntent = JSON.parse(preorderData);
        
        // Check if intent is still valid (less than 30 minutes old)
        const intentTime = new Date(intent.timestamp).getTime();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;

        if (now - intentTime <= thirtyMinutes) {
          toast.info('Continue your preorder', {
            description: `Would you like to complete your preorder for ${intent.productName}?`,
            action: {
              label: 'Complete Preorder',
              onClick: () => {
                router.push(`/product/${intent.productId}?preorder=true`);
              },
            },
            duration: 10000,
          });
        }

        // Clear the intent regardless
        localStorage.removeItem('preorderAfterLogin');
      }
    } catch (error) {
      console.error('Error handling preorder intent:', error);
      localStorage.removeItem('preorderAfterLogin');
    }
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success('Signed in successfully!', {
        description: 'Welcome back to Xarastore.',
      });

      trackEvent({
        category: 'auth',
        action: 'sign_in_success',
        label: data.user?.id,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Sign in error:', error);

      let message = 'Failed to sign in';
      if (error.message?.includes('Invalid login credentials')) {
        message = 'Invalid email or password';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Please verify your email before signing in';
      }

      toast.error('Sign in failed', {
        description: message,
      });

      trackEvent({
        category: 'auth',
        action: 'sign_in_error',
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [trackEvent]);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    metadata?: { full_name?: string; phone?: string }
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast.success('Account created successfully!', {
        description: 'Please check your email to verify your account.',
        duration: 8000,
      });

      trackEvent({
        category: 'auth',
        action: 'sign_up',
        label: data.user?.id,
        email: email,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Sign up error:', error);

      let message = 'Failed to create account';
      if (error.message?.includes('User already registered')) {
        message = 'An account with this email already exists';
      }

      toast.error('Sign up failed', {
        description: message,
      });

      trackEvent({
        category: 'auth',
        action: 'sign_up_error',
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [trackEvent]);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      toast.success('Signed out successfully');

      trackEvent({
        category: 'auth',
        action: 'sign_out_success',
      });

      router.push('/');
    } catch (error: any) {
      console.error('Sign out error:', error);

      toast.error('Failed to sign out', {
        description: 'Please try again',
      });

      trackEvent({
        category: 'auth',
        action: 'sign_out_error',
        label: error.message,
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [router, trackEvent]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent!', {
        description: 'Check your inbox for further instructions.',
        duration: 8000,
      });

      trackEvent({
        category: 'auth',
        action: 'password_reset_requested',
        email: email,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);

      toast.error('Failed to send reset email', {
        description: 'Please try again or contact support.',
      });

      trackEvent({
        category: 'auth',
        action: 'password_reset_error',
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [trackEvent]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully!', {
        description: 'You can now sign in with your new password.',
      });

      trackEvent({
        category: 'auth',
        action: 'password_updated',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Password update error:', error);

      toast.error('Failed to update password', {
        description: 'Please try again.',
      });

      trackEvent({
        category: 'auth',
        action: 'password_update_error',
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [trackEvent]);

  const signInWithProvider = useCallback(async (provider: 'google' | 'facebook' | 'twitter') => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      trackEvent({
        category: 'auth',
        action: 'oauth_initiated',
        provider,
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('OAuth sign in error:', error);

      toast.error('Failed to sign in', {
        description: `Could not sign in with ${provider}`,
      });

      trackEvent({
        category: 'auth',
        action: 'oauth_error',
        provider,
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [trackEvent]);

  const updateProfile = useCallback(async (updates: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      // Also update the users table
      if (state.user) {
        await supabase
          .from('users')
          .update({
            full_name: updates.full_name,
            phone: updates.phone,
            avatar_url: updates.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', state.user.id);
      }

      toast.success('Profile updated successfully');

      trackEvent({
        category: 'user',
        action: 'profile_updated',
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Profile update error:', error);

      toast.error('Failed to update profile', {
        description: 'Please try again.',
      });

      trackEvent({
        category: 'user',
        action: 'profile_update_error',
        label: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user, trackEvent]);

  const getSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setState({
        user: session?.user || null,
        session: session || null,
        isAuthenticated: !!session,
        isLoading: false,
      });

      return session;
    } catch (error) {
      console.error('Refresh session error:', error);
      return null;
    }
  }, []);

  const requireAuth = useCallback((redirectTo: string = '/auth/login') => {
    if (!state.isLoading && !state.isAuthenticated) {
      // Store the intended destination
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      router.push(redirectTo);
      return false;
    }
    return state.isAuthenticated;
  }, [state.isLoading, state.isAuthenticated, router]);

  const hasRole = useCallback((role: string | string[]) => {
    if (!state.user) return false;
    
    const userRole = state.user.user_metadata?.role || 'customer';
    const roles = Array.isArray(role) ? role : [role];
    
    return roles.includes(userRole);
  }, [state.user]);

  return {
    // State
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    session: state.session,

    // Core auth methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    signInWithProvider,
    updateProfile,

    // Session management
    getSession,
    refreshSession,

    // Utility methods
    requireAuth,
    hasRole,

    // Helper getters
    userId: state.user?.id,
    userEmail: state.user?.email,
    userMetadata: state.user?.user_metadata,
  };
}

// Export types for use in other components
export type { AuthState, AuthError, PreorderIntent };
