'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        throw new Error(errorDescription || error);
      }

      if (!accessToken || !refreshToken) {
        throw new Error('Missing authentication tokens');
      }

      // Set the session manually
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw sessionError;

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Failed to establish session');
      }

      // Check if user exists in our database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!existingUser) {
        // Create user profile if it doesn't exist
        await supabase.from('users').insert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email?.split('@')[0] || 'User')}&background=dc2626&color=fff`,
          email_verified: session.user.email_confirmed_at !== null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Update user email verification status
        await supabase
          .from('users')
          .update({
            email_verified: session.user.email_confirmed_at !== null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
      }

      setStatus('success');
      setMessage('Authentication successful! Redirecting...');

      // Get redirect URL from localStorage or default to home
      const redirectTo = localStorage.getItem('redirectAfterAuth') || '/';
      localStorage.removeItem('redirectAfterAuth');

      // Delay redirect to show success message
      setTimeout(() => {
        router.push(redirectTo);
      }, 2000);

    } catch (error: any) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Authentication failed');
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />,
          title: 'Completing Authentication',
          description: 'Please wait while we verify your credentials...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-600" />,
          title: 'Authentication Successful!',
          description: message,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'error':
        return {
          icon: <XCircle className="w-16 h-16 text-red-600" />,
          title: 'Authentication Failed',
          description: message,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className={`w-24 h-24 ${statusContent.bgColor} rounded-full flex items-center justify-center`}>
              {statusContent.icon}
            </div>
          </div>
          
          <h1 className={`text-3xl font-bold ${statusContent.color} mb-4`}>
            {statusContent.title}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {statusContent.description}
          </p>

          {/* Security Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Secure Connection</span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Your authentication is protected with end-to-end encryption
            </p>
          </div>

          {/* Loading Progress */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 animate-pulse" style={{ width: '60%' }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                <div className="text-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mx-auto mb-1" />
                  <span>Initiated</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mx-auto mb-1" />
                  <span>Verifying</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto mb-1" />
                  <span>Redirecting</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="space-y-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Try Again
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/')}
              >
                Go to Homepage
              </Button>
              <div className="text-center">
                <a
                  href="mailto:support@xarastore.com"
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {/* Success Countdown */}
          {status === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <div className="text-xl font-bold text-red-600">3</div>
              </div>
              <p className="text-sm text-gray-600">
                Redirecting in 3 seconds...
              </p>
            </div>
          )}
        </div>

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs">
            <div className="font-mono space-y-1">
              <div>Hash: {window.location.hash.substring(0, 50)}...</div>
              <div>Status: {status}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
