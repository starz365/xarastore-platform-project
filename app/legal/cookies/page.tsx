xarastore/app/legal/cookies/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Cookie, Settings, Shield, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type CookieCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences';

interface CookiePreference {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export default function CookiesPage() {
  const [preferences, setPreferences] = useState<CookiePreference>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('xarastore-cookie-consent');
    if (!cookieConsent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(cookieConsent);
      setPreferences(savedPreferences);
    }
  }, []);

  const cookieTypes = [
    {
      id: 'necessary',
      name: 'Necessary Cookies',
      description: 'Essential for website functionality',
      alwaysActive: true,
      examples: ['Session management', 'Security features', 'Load balancing'],
    },
    {
      id: 'preferences',
      name: 'Preference Cookies',
      description: 'Remember your settings and preferences',
      alwaysActive: false,
      examples: ['Language selection', 'Region settings', 'Layout preferences'],
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors interact',
      alwaysActive: false,
      examples: ['Page visits', 'Traffic sources', 'User behavior'],
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements',
      alwaysActive: false,
      examples: ['Ad targeting', 'Campaign measurement', 'Interest-based ads'],
    },
  ];

  const handlePreferenceChange = (category: CookieCategory, value: boolean) => {
    setPreferences(prev => ({ ...prev, [category]: value }));
  };

  const savePreferences = () => {
    localStorage.setItem('xarastore-cookie-consent', JSON.stringify(preferences));
    setShowBanner(false);
    
    // In production, this would set actual cookies
    console.log('Cookie preferences saved:', preferences);
    
    // Reload to apply preferences
    window.location.reload();
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('xarastore-cookie-consent', JSON.stringify(allAccepted));
    setShowBanner(false);
    window.location.reload();
  };

  const rejectAll = () => {
    const allRejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    setPreferences(allRejected);
    localStorage.setItem('xarastore-cookie-consent', JSON.stringify(allRejected));
    setShowBanner(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cookie Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="container-responsive py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start space-x-3">
                  <Cookie className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">We use cookies</h3>
                    <p className="text-sm text-gray-600">
                      We use cookies to enhance your browsing experience, analyze site traffic, 
                      and personalize content. By clicking "Accept All", you consent to our use of cookies.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="sm" onClick={rejectAll}>
                  Reject All
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowBanner(false)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </Button>
                <Button variant="primary" size="sm" onClick={acceptAll}>
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="flex items-center space-x-3 mb-4">
            <Cookie className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Cookie Policy</h1>
          </div>
          <p className="text-xl opacity-90 max-w-3xl">
            Learn how we use cookies and similar technologies on Xarastore.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        <div className="max-w-4xl mx-auto">
          {/* Cookie Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold">Cookie Preferences</h2>
              </div>
              <Button variant="secondary" onClick={() => setShowBanner(true)}>
                Change Preferences
              </Button>
            </div>

            <div className="space-y-6">
              {cookieTypes.map((type) => (
                <div key={type.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
                      <p className="text-gray-600">{type.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {type.alwaysActive ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                          Always Active
                        </span>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences[type.id as CookieCategory]}
                            onChange={(e) => handlePreferenceChange(type.id as CookieCategory, e.target.checked)}
                            className="sr-only peer"
                            disabled={type.alwaysActive}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {type.examples.map((example, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Your current preferences are saved.</p>
                  <p className="text-xs text-gray-500">
                    Changes take effect immediately and apply to future visits.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={rejectAll}>
                    Reject All
                  </Button>
                  <Button variant="primary" onClick={savePreferences}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are placed on your device when you visit 
                a website. They are widely used to make websites work more efficiently and 
                provide information to the website owners.
              </p>
              <div className="bg-gray-50 p-6 rounded-lg my-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-6 h-6 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Important</h3>
                </div>
                <p className="text-gray-700">
                  Cookies cannot harm your device or access other information on your device. 
                  They are not viruses or malware.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Session Cookies</h3>
              <p className="text-gray-700 mb-4">
                Temporary cookies that expire when you close your browser. Used for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>Maintaining your shopping cart</li>
                <li>Keeping you logged in during your visit</li>
                <li>Remembering items you've viewed</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Persistent Cookies</h3>
              <p className="text-gray-700 mb-4">
                Remain on your device for a set period or until deleted. Used for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>Remembering your preferences</li>
                <li>Analyzing site traffic patterns</li>
                <li>Personalizing content</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Third-Party Cookies</h3>
              <p className="text-gray-700 mb-4">
                Set by third parties through our site. Used for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Analytics (Google Analytics)</li>
                <li>Advertising (Facebook Pixel, Google Ads)</li>
                <li>Social media features</li>
                <li>Payment processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Duration</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border">Cookie Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border">Duration</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Session ID</td>
                      <td className="px-4 py-3 border">Browser session</td>
                      <td className="px-4 py-3 border">Authentication</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Cart</td>
                      <td className="px-4 py-3 border">7 days</td>
                      <td className="px-4 py-3 border">Shopping cart persistence</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Preferences</td>
                      <td className="px-4 py-3 border">1 year</td>
                      <td className="px-4 py-3 border">User settings</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Analytics</td>
                      <td className="px-4 py-3 border">2 years</td>
                      <td className="px-4 py-3 border">Website statistics</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border">Advertising</td>
                      <td className="px-4 py-3 border">90 days</td>
                      <td className="px-4 py-3 border">Ad personalization</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Cookies</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Browser Controls</h3>
              <p className="text-gray-700 mb-4">
                Most web browsers allow you to control cookies through their settings. 
                You can:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>Delete existing cookies</li>
                <li>Block all or certain cookies</li>
                <li>Set preferences for different websites</li>
                <li>Receive notifications when cookies are set</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Browser-Specific Guides</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Google Chrome</h4>
                  <p className="text-sm text-gray-600">
                    Settings → Privacy and security → Cookies and other site data
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Mozilla Firefox</h4>
                  <p className="text-sm text-gray-600">
                    Options → Privacy & Security → Cookies and Site Data
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Safari</h4>
                  <p className="text-sm text-gray-600">
                    Preferences → Privacy → Cookies and website data
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Microsoft Edge</h4>
                  <p className="text-sm text-gray-600">
                    Settings → Cookies and site permissions → Cookies and site data
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <Bell className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Important Note</h4>
                    <p className="text-blue-800">
                      Blocking certain cookies may affect your ability to use all features 
                      of our Platform. Necessary cookies are required for basic functionality.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                We work with third parties that may set cookies on our Platform. These include:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics Providers</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>
                  <strong>Google Analytics:</strong> Helps us understand how visitors interact 
                  with our Platform. Data is anonymized.
                </li>
                <li>
                  <strong>Hotjar:</strong> Provides heatmaps and user session recordings to 
                  improve user experience.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Advertising Partners</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>
                  <strong>Facebook Pixel:</strong> Helps us measure ad performance and show 
                  relevant ads on Facebook.
                </li>
                <li>
                  <strong>Google Ads:</strong> Tracks conversions from Google advertising 
                  campaigns.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Do Not Track Signals</h2>
              <p className="text-gray-700 mb-4">
                Some browsers offer a "Do Not Track" (DNT) feature that signals your 
                preference not to be tracked online. Currently, there is no universally 
                accepted standard for how to respond to DNT signals.
              </p>
              <p className="text-gray-700">
                We continue to monitor developments around DNT browser technology and 
                will update this policy as standards evolve.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Updates</h2>
              <p className="text-gray-700 mb-4">
                We may update this Cookie Policy periodically to reflect changes in our 
                practices or for operational, legal, or regulatory reasons.
              </p>
              <p className="text-gray-700">
                We encourage you to review this page regularly for the latest information 
                on our cookie practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  If you have questions about our use of cookies, please contact:
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Data Protection Officer</p>
                  <p>Xarastore Limited</p>
                  <p>Email: dpo@xarastore.com</p>
                  <p>Phone: +254 711 123 501</p>
                </div>
              </div>
            </section>

            {/* Update Information */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-gray-600">
                <Cookie className="w-5 h-5" />
                <span>This Cookie Policy was last updated on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
