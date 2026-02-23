import { Shield, Lock, Eye, Database, UserCheck, Bell } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Xarastore',
  description: 'How we collect, use, and protect your personal information on Xarastore.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-xl opacity-90 max-w-3xl">
            Your privacy is important to us. Learn how we protect and use your information.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        <div className="max-w-4xl mx-auto">
          {/* Privacy Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Privacy Commitment</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Data Protection</h3>
                  <p className="text-sm text-gray-600">We implement industry-standard security measures</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Eye className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Transparency</h3>
                  <p className="text-sm text-gray-600">Clear information about data collection and use</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Database className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Data Control</h3>
                  <p className="text-sm text-gray-600">You control your personal information</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <UserCheck className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Your Rights</h3>
                  <p className="text-sm text-gray-600">Access, correct, or delete your data anytime</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Bell className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Important Update</h3>
                  <p className="text-blue-800">
                    This policy complies with the Kenya Data Protection Act, 2019 and other 
                    applicable privacy regulations. We regularly review and update our 
                    practices to ensure compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">
                We collect information that identifies you as an individual, including:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li><strong>Contact Information:</strong> Name, email address, phone number, shipping address</li>
                <li><strong>Account Information:</strong> Username, password, profile preferences</li>
                <li><strong>Payment Information:</strong> Payment method details, billing address (processed securely by payment processors)</li>
                <li><strong>Order Information:</strong> Purchase history, order details, returns</li>
                <li><strong>Communication Data:</strong> Customer service inquiries, feedback, reviews</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">1.2 Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">
                When you visit our Platform, we automatically collect:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent, links clicked</li>
                <li><strong>Location Data:</strong> General location based on IP address</li>
                <li><strong>Cookies & Tracking:</strong> Session data, preferences (see Cookie Policy)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border">Purpose</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border">Legal Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Process and fulfill orders</td>
                      <td className="px-4 py-3 border">Contractual necessity</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Provide customer support</td>
                      <td className="px-4 py-3 border">Legitimate interest</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Send order updates and delivery notifications</td>
                      <td className="px-4 py-3 border">Contractual necessity</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Personalize shopping experience</td>
                      <td className="px-4 py-3 border">Legitimate interest</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Send marketing communications (with consent)</td>
                      <td className="px-4 py-3 border">Consent</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 border">Improve our Platform and services</td>
                      <td className="px-4 py-3 border">Legitimate interest</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border">Comply with legal obligations</td>
                      <td className="px-4 py-3 border">Legal obligation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Sharing & Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We share your information with trusted third parties who assist in operating 
                our Platform, including:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li><strong>Payment Processors:</strong> M-Pesa, Stripe, PayPal</li>
                <li><strong>Shipping Partners:</strong> Delivery and logistics companies</li>
                <li><strong>Cloud Services:</strong> Hosting and infrastructure providers</li>
                <li><strong>Analytics Providers:</strong> Google Analytics (anonymized data)</li>
                <li><strong>Marketing Tools:</strong> Email service providers (with consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information when required by law, including to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Comply with legal processes or government requests</li>
                <li>Protect our rights, property, or safety</li>
                <li>Prevent fraud or security issues</li>
                <li>Enforce our Terms of Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect 
                your personal information, including:
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Measures</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    <li>SSL/TLS encryption for data transmission</li>
                    <li>Firewalls and intrusion detection systems</li>
                    <li>Regular security assessments</li>
                    <li>Secure data centers</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Organizational Measures</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    <li>Employee privacy training</li>
                    <li>Access controls and authentication</li>
                    <li>Data minimization practices</li>
                    <li>Incident response procedures</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-700">
                While we strive to protect your information, no security system is impenetrable. 
                We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information only for as long as necessary to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>Fulfill the purposes outlined in this policy</li>
                <li>Comply with legal obligations (e.g., tax, accounting)</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain business records as required by law</li>
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> We retain order information for 7 years to comply 
                  with tax and accounting regulations in Kenya.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Under the Kenya Data Protection Act, 2019, you have the following rights:
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Access</h4>
                  <p className="text-sm text-gray-600">Request a copy of your personal data</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Rectification</h4>
                  <p className="text-sm text-gray-600">Correct inaccurate or incomplete data</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Erasure</h4>
                  <p className="text-sm text-gray-600">Request deletion of your data</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Restrict Processing</h4>
                  <p className="text-sm text-gray-600">Limit how we use your data</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Data Portability</h4>
                  <p className="text-sm text-gray-600">Receive your data in a portable format</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Object</h4>
                  <p className="text-sm text-gray-600">Object to certain data processing</p>
                </div>
              </div>
              <p className="text-gray-700">
                To exercise these rights, contact us at privacy@xarastore.com. We respond 
                to all legitimate requests within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                We primarily store and process data within Kenya. When we transfer data 
                internationally, we ensure adequate protection through:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Standard contractual clauses approved by relevant authorities</li>
                <li>Data processing agreements with third parties</li>
                <li>Jurisdictions with adequate data protection laws</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our Platform is not intended for children under 13 years of age. We do not 
                knowingly collect personal information from children under 13.
              </p>
              <p className="text-gray-700">
                If you are a parent or guardian and believe your child has provided us with 
                personal information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy periodically. We will notify you of 
                significant changes by:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Posting the updated policy on this page</li>
                <li>Sending an email notification (for registered users)</li>
                <li>Displaying a notice on our Platform</li>
              </ul>
              <p className="text-gray-700">
                The "Last updated" date at the top indicates when this policy was last revised.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  For privacy-related questions or to exercise your rights, contact our 
                  Data Protection Officer:
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Data Protection Officer</p>
                  <p>Xarastore Limited</p>
                  <p>Westlands, Nairobi, Kenya</p>
                  <p>Email: dpo@xarastore.com</p>
                  <p>Phone: +254 711 123 501</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    You also have the right to lodge a complaint with the Office of the 
                    Data Protection Commissioner in Kenya.
                  </p>
                </div>
              </div>
            </section>

            {/* Update Information */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-gray-600">
                <Shield className="w-5 h-5" />
                <span>This Privacy Policy was last updated on {new Date().toLocaleDateString('en-US', { 
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
