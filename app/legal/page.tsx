import { FileText, Shield, Truck, Cookie, Eye, Scale } from 'lucide-react';
import Link from 'next/link';

const legalPages = [
  {
    title: 'Terms of Service',
    description: 'Rules and guidelines for using Xarastore',
    icon: FileText,
    href: '/legal/terms',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your data',
    icon: Shield,
    href: '/legal/privacy',
    color: 'bg-green-100 text-green-600',
  },
  {
    title: 'Shipping Policy',
    description: 'Delivery timelines, costs, and restrictions',
    icon: Truck,
    href: '/legal/shipping',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Cookie Policy',
    description: 'How we use cookies and tracking technologies',
    icon: Cookie,
    href: '/legal/cookies',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    title: 'Accessibility Statement',
    description: 'Our commitment to accessible shopping',
    icon: Eye,
    href: '/legal/accessibility',
    color: 'bg-red-100 text-red-600',
  },
  {
    title: 'Legal Compliance',
    description: 'Regulatory and compliance information',
    icon: Scale,
    href: '/legal/compliance',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

export const metadata = {
  title: 'Legal & Policies | Xarastore',
  description: 'Legal documents, policies, and terms governing your use of Xarastore.',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Legal & Policies</h1>
          <p className="text-xl opacity-90 max-w-3xl">
            Transparency and trust are at the core of everything we do.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        {/* Legal Pages Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {legalPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.title}
                href={page.href}
                className="group block bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start space-x-4">
                  <div className={`${page.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors mb-2">
                      {page.title}
                    </h3>
                    <p className="text-sm text-gray-600">{page.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Compliance Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Regulatory Compliance</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Business Registration</h3>
              <div className="space-y-3">
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-700">Company Name</span>
                  <span className="font-medium">Xarastore Limited</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-700">Registration Number</span>
                  <span className="font-medium">CR-123456789</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span className="text-gray-700">VAT Number</span>
                  <span className="font-medium">VAT-987654321</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Registered Address</span>
                  <span className="font-medium text-right">Westlands, Nairobi</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Certifications</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-medium">PCI DSS Compliant</h4>
                    <p className="text-sm text-gray-600">Secure payment processing</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold">GDPR</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Data Protection</h4>
                    <p className="text-sm text-gray-600">GDPR compliant data handling</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold">ISO</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Quality Standards</h4>
                    <p className="text-sm text-gray-600">ISO 27001 certified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Legal */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Legal Inquiries</h2>
              <p className="opacity-90">
                For legal matters, subpoenas, or regulatory inquiries
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 opacity-80" />
                <span className="font-medium">legal@xarastore.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 opacity-80" />
                <span className="font-medium">+254 711 123 500</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
