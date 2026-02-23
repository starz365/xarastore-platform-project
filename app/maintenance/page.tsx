import { Settings, Clock, Wrench, Home } from 'lucide-react';
import { settingsManager } from '@/lib/utils/settings';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function MaintenancePage() {
  const settings = await settingsManager.getSiteSettings();
  const maintenanceMessage = settings.maintenance_message || 'We are currently performing scheduled maintenance to improve your experience.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-red-100">
            <Settings className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Under Maintenance
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {settings.site_name} is temporarily unavailable
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Last updated: {new Date(settings.updated_at).toLocaleString()}</span>
            </div>

            <div className="text-center">
              <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-700">{maintenanceMessage}</p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">What we're doing:</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center justify-center">
                  <span className="inline-block w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                  System upgrades and improvements
                </li>
                <li className="flex items-center justify-center">
                  <span className="inline-block w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                  Performance optimizations
                </li>
                <li className="flex items-center justify-center">
                  <span className="inline-block w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                  Security enhancements
                </li>
                <li className="flex items-center justify-center">
                  <span className="inline-block w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                  New feature deployment
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <p className="text-sm text-gray-600 mb-4">
                We expect to be back online shortly. Thank you for your patience.
              </p>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Check Status
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  asChild
                >
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {settings.site_name}. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Need immediate assistance? Contact us at {settings.contact_email || 'support@xarastore.com'}
          </p>
        </div>
      </div>
    </div>
  );
}
