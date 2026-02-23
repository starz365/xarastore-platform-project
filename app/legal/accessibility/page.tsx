'use client';

import { Accessibility, Eye, Ear, MousePointer, Keyboard } from 'lucide-react';

export default function AccessibilityPage() {
  const features = [
    {
      icon: Eye,
      title: 'Visual Accessibility',
      description: 'High contrast modes, text scaling, and screen reader compatibility',
      features: [
        'WCAG 2.1 AA compliance',
        'Screen reader optimization',
        'Color contrast ratio > 4.5:1',
        'Text resize up to 200% without loss of content',
      ],
    },
    {
      icon: Ear,
      title: 'Auditory Accessibility',
      description: 'Support for hearing-impaired users',
      features: [
        'Video captions and transcripts',
        'Audio description support',
        'Visual alerts for audio notifications',
        'Adjustable audio controls',
      ],
    },
    {
      icon: MousePointer,
      title: 'Motor Accessibility',
      description: 'Keyboard and alternative input support',
      features: [
        'Full keyboard navigation',
        'Voice control compatibility',
        'Touch target size > 44px',
        'Reduced motion options',
      ],
    },
    {
      icon: Keyboard,
      title: 'Cognitive Accessibility',
      description: 'Clear content and predictable navigation',
      features: [
        'Simple, consistent navigation',
        'Clear error messages',
        'Focus indicators',
        'No time limits on tasks',
      ],
    },
  ];

  const accessibilityStatement = {
    conformance: 'Web Content Accessibility Guidelines (WCAG) 2.1 Level AA',
    efforts: [
      'Regular accessibility audits',
      'User testing with assistive technologies',
      'Continuous training for our development team',
      'Feedback integration from disabled users',
    ],
    contact: {
      email: 'accessibility@xarastore.com',
      phone: '+254 700 123 456',
      hours: 'Monday to Friday, 8 AM to 5 PM EAT',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-responsive">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <Accessibility className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Digital Accessibility Statement
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We are committed to making Xarastore accessible to all users, 
            regardless of ability or disability.
          </p>
        </div>

        {/* Commitment */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-8 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">Our Commitment</h2>
            <p className="text-lg mb-6">
              At Xarastore, we believe in creating an inclusive digital experience 
              for everyone. We strive to adhere to the highest standards of 
              accessibility and continuously work to improve the user experience 
              for all visitors.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold">100%</div>
                <div className="text-sm opacity-90">WCAG 2.1 AA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm opacity-90">Accessibility Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm opacity-90">Accessibility Tests</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">Continuous</div>
                <div className="text-sm opacity-90">Improvement</div>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">
            Accessibility Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* How to Use Accessibility Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">How to Use Accessibility Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Browser Shortcuts</h3>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span>Zoom In</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Ctrl + +</code>
                </li>
                <li className="flex justify-between">
                  <span>Zoom Out</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Ctrl + -</code>
                </li>
                <li className="flex justify-between">
                  <span>Navigate Links</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Tab</code>
                </li>
                <li className="flex justify-between">
                  <span>Skip to Content</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Alt + 1</code>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Accessibility Menu</h3>
              <p className="text-gray-600 mb-4">
                Use our built-in accessibility menu to adjust:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full mr-3" />
                  Text size and spacing
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full mr-3" />
                  Color contrast
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full mr-3" />
                  Motion reduction
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full mr-3" />
                  Highlight focus
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Conformance & Contact */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-4">Conformance Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Standard</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {accessibilityStatement.conformance}
                </span>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Our Efforts Include:</h4>
                <ul className="space-y-2">
                  {accessibilityStatement.efforts.map((effort, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3" />
                      {effort}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-4">Feedback & Contact</h3>
            <div className="space-y-6">
              <p className="text-gray-600">
                We welcome feedback on the accessibility of Xarastore. 
                Please let us know if you encounter accessibility barriers.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <a 
                    href={`mailto:${accessibilityStatement.contact.email}`}
                    className="text-red-600 hover:text-red-800"
                  >
                    {accessibilityStatement.contact.email}
                  </a>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Phone</h4>
                  <a 
                    href={`tel:${accessibilityStatement.contact.phone}`}
                    className="text-red-600 hover:text-red-800"
                  >
                    {accessibilityStatement.contact.phone}
                  </a>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Hours</h4>
                  <p className="text-gray-600">{accessibilityStatement.contact.hours}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold mb-2">Response Time</h4>
                <p className="text-sm text-gray-600">
                  We aim to respond to accessibility feedback within 2 business days 
                  and to propose a solution within 10 business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Information */}
        <div className="mt-12 bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Technical Compliance Information
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-red-600 mb-2">100%</div>
              <div className="font-semibold">Keyboard Navigation</div>
              <p className="text-sm text-gray-600 mt-1">All functionality operable via keyboard</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-red-600 mb-2">100%</div>
              <div className="font-semibold">Screen Reader Compatible</div>
              <p className="text-sm text-gray-600 mt-1">Tested with NVDA, JAWS, VoiceOver</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-red-600 mb-2">100%</div>
              <div className="font-semibold">Mobile Accessibility</div>
              <p className="text-sm text-gray-600 mt-1">Optimized for touch and mobile screen readers</p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-12 text-center text-gray-500">
          <p>This statement was last updated on {new Date().toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p className="text-sm mt-2">
            We regularly review and update our accessibility practices.
          </p>
        </div>
      </div>
    </div>
  );
}
