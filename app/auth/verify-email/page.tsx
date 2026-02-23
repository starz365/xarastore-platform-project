'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/shared/Toast';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_verified'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    verifyEmailToken();
  }, []);

  const verifyEmailToken = async () => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token || type !== 'signup') {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    try {
      // Verify the OTP token
      const { error, data } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      });

      if (error) {
        // Check if email is already verified
        if (error.message.includes('already verified')) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserEmail(user.email);
            setStatus('already_verified');
            setMessage('Email is already verified');
            return;
          }
        }
        throw error;
      }

      // Update user verification status in our database
      if (data.user) {
        await supabase
          .from('users')
          .update({
            email_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);
      }

      setUserEmail(data.user?.email || null);
      setStatus('success');
      setMessage('Email verified successfully!');
      
      // Show success toast
      toast.success('Email Verified!', {
        description: 'Your email has been successfully verified.',
      });

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        const redirectTo = localStorage.getItem('redirectAfterVerification') || '/';
        localStorage.removeItem('redirectAfterVerification');
        router.push(redirectTo);
      }, 3000);

    } catch (error: any) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Email verification failed');
      
      toast.error('Verification Failed', {
        description: 'Failed to verify email. Please try again or request a new verification link.',
      });
    }
  };

  const resendVerificationEmail = async () => {
    if (!userEmail) {
      toast.error('Email Required', {
        description: 'Please enter your email address to resend verification.',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) throw error;

      toast.success('Verification Email Sent!', {
        description: 'Please check your inbox for the verification link.',
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast.error('Failed to Resend', {
        description: 'Please try again later.',
      });
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />,
          title: 'Verifying Email',
          description: 'Please wait while we verify your email address...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-600" />,
          title: 'Email Verified!',
          description: message,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'already_verified':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-600" />,
          title: 'Already Verified',
          description: message,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'error':
        return {
          icon: <XCircle className="w-16 h-16 text-red-600" />,
          title: 'Verification Failed',
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
          
          <p className="text-gray-600 mb-6">
            {statusContent.description}
          </p>

          {userEmail && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{userEmail}</span>
              </div>
            </div>
          )}

          {/* Loading Progress */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 animate-pulse" style={{ width: '40%' }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                <div className="text-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mx-auto mb-1" />
                  <span>Processing</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto mb-1" />
                  <span>Verifying</span>
                </div>
                <div className="text-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto mb-1" />
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Success Actions */}
          {(status === 'success' || status === 'already_verified') && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                  <div className="text-xl font-bold text-red-600">3</div>
                </div>
                <p className="text-sm text-gray-600">
                  Redirecting to dashboard in 3 seconds...
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/')}
              >
                Go to Homepage
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/account')}
              >
                Go to Account
              </Button>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Common Issues:</p>
                    <ul className="text-sm text-red-700 mt-1 space-y-1">
                      <li>• Verification link expired</li>
                      <li>• Link already used</li>
                      <li>• Invalid verification token</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button
                variant="primary"
                className="w-full"
                onClick={resendVerificationEmail}
              >
                Resend Verification Email
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Go to Login
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push('/help')}
              >
                Contact Support
              </Button>
            </div>
          )}
        </div>

        {/* Benefits of Verification */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Benefits of Email Verification:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">Secure Account</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-gray-600">Order Updates</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-gray-600">Password Recovery</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xs text-gray-600">Exclusive Deals</p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            <span className="font-medium">Security Note:</span> Email verification helps protect your account from unauthorized access and ensures you receive important order updates.
          </p>
        </div>
      </div>
    </div>
  );
}
