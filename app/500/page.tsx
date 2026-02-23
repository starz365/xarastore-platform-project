'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Home, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ServerErrorPage() {
  const router = useRouter();
  const [errorId, setErrorId] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Generate unique error ID for tracking
    const id = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setErrorId(id);
    
    // Log error for monitoring
    console.error('500 Server Error:', {
      errorId: id,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Show loading state
    setTimeout(() => {
      if (retryCount < 2) {
        router.refresh();
      } else {
        // After 2 retries, suggest alternative
        setIsRetrying(false);
      }
    }, 1500);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleClearCache = () => {
    // Clear service worker cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Clear localStorage cache
    localStorage.removeItem('xarastore-offline-cache');
    localStorage.removeItem('xarastore-cart');
    
    // Reload page
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="w-32 h-32 bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-600/30">
            <Server className="w-16 h-16 text-red-400" />
          </div>
          
          <div className="mb-6">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              500
            </h1>
            <h2 className="text-2xl font-semibold mb-4">Internal Server Error</h2>
            <p className="text-gray-300 text-lg max-w-lg mx-auto">
              Something went wrong on our end. Our team has been notified and is working to fix it.
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 mb-8">
          <div className="flex items-start space-x-3 mb-6">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg mb-2">What happened?</h3>
              <p className="text-gray-300">
                Our servers encountered an unexpected condition that prevented it from fulfilling your request.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-medium">Try Refreshing</h4>
                  <p className="text-sm text-gray-400">The issue might be temporary</p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleRetry}
                disabled={isRetrying || retryCount >= 3}
              >
                {isRetrying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  'Retry Now'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium">Go to Homepage</h4>
                  <p className="text-sm text-gray-400">Start fresh from the homepage</p>
                </div>
              </div>
              <Button variant="secondary" onClick={handleGoHome}>
                Go Home
              </Button>
            </div>

            {retryCount >= 2 && (
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">Clear Cache</h4>
                    <p className="text-sm text-gray-400">Clear browser cache and reload</p>
                  </div>
                </div>
                <Button variant="secondary" onClick={handleClearCache}>
                  Clear Cache
                </Button>
              </div>
            )}
          </div>

          {retryCount >= 3 && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Still having issues?</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    The problem might persist. Please try again in a few minutes or contact our support team.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                      Hard Refresh
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <a href="mailto:support@xarastore.com?subject=500%20Error%20Report&body=Error%20ID:%20{errorId}">
                        Email Support
                      </a>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <a href="/help" target="_blank">
                        Help Center
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Details */}
        <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Technical Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const details = {
                  errorId,
                  timestamp: new Date().toISOString(),
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                };
                navigator.clipboard.writeText(JSON.stringify(details, null, 2));
                alert('Error details copied to clipboard');
              }}
            >
              Copy Details
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Error ID:</span>
              <code className="text-red-300">{errorId}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span className="text-gray-300">{new Date().toLocaleString('en-KE')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Path:</span>
              <span className="text-gray-300">{window.location.pathname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Retry Attempts:</span>
              <span className="text-gray-300">{retryCount}</span>
            </div>
          </div>
        </div>

        {/* Status Page Link */}
        <div className="mt-8 text-center">
          <a
            href="https://status.xarastore.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Server className="w-4 h-4 mr-2" />
            Check our system status
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
