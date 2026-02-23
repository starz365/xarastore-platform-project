import { Shield, Lock, CheckCircle, AlertCircle, Eye, Fingerprint } from 'lucide-react';

export function PaymentSecurity() {
  const securityFeatures = [
    {
      icon: Shield,
      title: 'PCI DSS Compliant',
      description: 'We meet the highest security standards for payment processing.',
    },
    {
      icon: Lock,
      title: 'SSL Encryption',
      description: 'All data is encrypted with 256-bit SSL security.',
    },
    {
      icon: CheckCircle,
      title: '3D Secure',
      description: 'Additional authentication for card payments.',
    },
    {
      icon: Eye,
      title: 'Fraud Monitoring',
      description: '24/7 monitoring for suspicious activities.',
    },
    {
      icon: Fingerprint,
      title: 'Biometric Auth',
      description: 'Secure authentication with biometric data.',
    },
    {
      icon: AlertCircle,
      title: 'Buyer Protection',
      description: 'Full refund if item is not as described.',
    },
  ];

  const safePractices = [
    'We never store your CVV or full card details',
    'All transactions are tokenized for security',
    'Real-time fraud detection and prevention',
    'Regular security audits and penetration testing',
    'GDPR compliant data protection',
    'Bank-level security infrastructure',
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Your Payment is Secure</h2>
        <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
          We use industry-leading security measures to protect your payment information 
          and ensure safe transactions.
        </p>
      </div>

      {/* Security Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {securityFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-red-300 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Safe Practices */}
      <div className="bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-xl p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Our Security Practices</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {safePractices.map((practice, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-gray-700">{practice}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Encryption Info */}
      <div className="bg-gray-900 text-white rounded-xl p-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4">Military-Grade Encryption</h3>
            <p className="text-gray-300 mb-6">
              All sensitive data is protected with AES-256 encryption, the same 
              standard used by banks and government agencies worldwide.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-green-400" />
                <span>End-to-end encrypted transactions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Secure data transmission</span>
              </div>
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-green-400" />
                <span>Zero knowledge of your payment details</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">256-bit</div>
              <div className="text-lg font-semibold mb-4">SSL Encryption</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Security Level</span>
                  <span className="text-green-400">Maximum</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Protocol</span>
                  <span className="text-green-400">TLS 1.3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Certification</span>
                  <span className="text-green-400">EV SSL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Certifications & Compliance</h3>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {/* In production, these would be actual certification logos */}
          <div className="px-6 py-3 bg-gray-100 rounded-lg">
            <span className="font-bold text-gray-800">PCI DSS</span>
            <span className="text-xs text-gray-600 block mt-1">Level 1</span>
          </div>
          <div className="px-6 py-3 bg-gray-100 rounded-lg">
            <span className="font-bold text-gray-800">ISO 27001</span>
            <span className="text-xs text-gray-600 block mt-1">Certified</span>
          </div>
          <div className="px-6 py-3 bg-gray-100 rounded-lg">
            <span className="font-bold text-gray-800">GDPR</span>
            <span className="text-xs text-gray-600 block mt-1">Compliant</span>
          </div>
          <div className="px-6 py-3 bg-gray-100 rounded-lg">
            <span className="font-bold text-gray-800">SSL</span>
            <span className="text-xs text-gray-600 block mt-1">EV Certified</span>
          </div>
        </div>
      </div>

      {/* Final Assurance */}
      <div className="bg-gradient-to-r from-green-50 to-white border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-4">100% Safe Checkout Guarantee</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We guarantee the security of your payment information. If you experience any 
          unauthorized charges, we'll cover the full amount.
        </p>
        <div className="mt-6 inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-full font-medium">
          <Shield className="w-5 h-5 mr-2" />
          Secure Checkout Guaranteed
        </div>
      </div>
    </div>
  );
}
