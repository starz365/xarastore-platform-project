'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
    
    // Send error to monitoring service
    if (typeof window !== 'undefined') {
      fetch('/api/error-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.message || 'Unknown error',
          stack: error.stack,
          digest: error.digest,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail - don't log to console
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Error Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Application Error</h1>
            <p className="opacity-90">
              Something went wrong in the application
            </p>
          </div>

          {/* Error Details */}
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
                  <p className="text-red-800 font-mono text-sm break-words">
                    {error?.message || 'An unexpected error occurred'}
                  </p>
                  {error?.digest && (
                    <p className="text-red-700 text-xs mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Troubleshooting Steps */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Try These Steps:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">Refresh the Page</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sometimes a simple refresh can fix the issue
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Home className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">Go to Homepage</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Return to the homepage and try again
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Information */}
            <div className="bg-gray-900 text-gray-300 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Technical Information</span>
                <button
                  onClick={() => {
                    const details = {
                      error: error?.message,
                      stack: error?.stack,
                      digest: error?.digest,
                      url: window.location.href,
                      timestamp: new Date().toISOString(),
                    };
                    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
                    alert('Error details copied to clipboard');
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Copy Details
                </button>
              </div>
              <pre className="text-xs overflow-auto max-h-32">
                {JSON.stringify({
                  timestamp: new Date().toISOString(),
                  path: typeof window !== 'undefined' ? window.location.pathname : '',
                  errorId: error?.digest,
                }, null, 2)}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="primary"
                onClick={() => reset()}
                className="w-full"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                <Home className="w-5 h-5 mr-2" />
                Go to Homepage
              </Button>
            </div>

            {/* Support Links */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap justify-center gap-6">
                <a
                  href="/help"
                  className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
                >
                  Help Center
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <a
                  href="mailto:support@xarastore.com"
                  className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
                >
                  Contact Support
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <a
                  href="https://status.xarastore.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
                >
                  System Status
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            If this error persists, please contact our support team with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}
