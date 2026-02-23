'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function BadRequestPage() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-12 h-12 text-red-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">400</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Bad Request</h2>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <p className="text-gray-600 mb-4">
            The server couldn't understand your request. This might be caused by:
          </p>
          <ul className="text-left space-y-2 text-gray-600 mb-6">
            <li className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>Invalid or malformed request syntax</span>
            </li>
            <li className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>Missing or invalid parameters</span>
            </li>
            <li className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span>Session or authentication issues</span>
            </li>
          </ul>
          
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
            <p className="mb-2">If you believe this is an error, please:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button variant="secondary" size="sm" onClick={() => router.push('/help')}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="primary" onClick={handleGoHome}>
            <Home className="w-5 h-5 mr-2" />
            Go to Homepage
          </Button>
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Error Code: <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">400_BAD_REQUEST</code>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Request ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
