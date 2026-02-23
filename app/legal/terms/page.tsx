import { FileText, Clock, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Xarastore',
  description: 'Terms and conditions governing your use of Xarastore platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-xl opacity-90 max-w-3xl">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        <div className="max-w-4xl mx-auto">
          {/* Important Notice */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Important Notice</h3>
                <p className="text-red-800">
                  By accessing or using Xarastore, you agree to be bound by these Terms of Service. 
                  Please read them carefully before using our platform.
                </p>
              </div>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Table of Contents</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li><a href="#1" className="text-red-600 hover:underline">Acceptance of Terms</a></li>
              <li><a href="#2" className="text-red-600 hover:underline">Account Registration</a></li>
              <li><a href="#3" className="text-red-600 hover:underline">Eligibility</a></li>
              <li><a href="#4" className="text-red-600 hover:underline">Product Information</a></li>
              <li><a href="#5" className="text-red-600 hover:underline">Pricing & Payments</a></li>
              <li><a href="#6" className="text-red-600 hover:underline">Order Processing</a></li>
              <li><a href="#7" className="text-red-600 hover:underline">Shipping & Delivery</a></li>
              <li><a href="#8" className="text-red-600 hover:underline">Returns & Refunds</a></li>
              <li><a href="#9" className="text-red-600 hover:underline">User Conduct</a></li>
              <li><a href="#10" className="text-red-600 hover:underline">Intellectual Property</a></li>
              <li><a href="#11" className="text-red-600 hover:underline">Limitation of Liability</a></li>
              <li><a href="#12" className="text-red-600 hover:underline">Indemnification</a></li>
              <li><a href="#13" className="text-red-600 hover:underline">Termination</a></li>
              <li><a href="#14" className="text-red-600 hover:underline">Governing Law</a></li>
              <li><a href="#15" className="text-red-600 hover:underline">Changes to Terms</a></li>
              <li><a href="#16" className="text-red-600 hover:underline">Contact Information</a></li>
            </ol>
          </div>

          {/* Terms Content */}
          <div className="prose prose-lg max-w-none">
            <section id="1" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                These Terms of Service ("Terms") govern your access to and use of Xarastore 
                (the "Platform"), including any content, functionality, and services offered 
                on or through xarastore.com.
              </p>
              <p className="text-gray-700">
                By accessing or using the Platform, you agree to be bound by these Terms and 
                our Privacy Policy. If you do not agree to these Terms, you must not access 
                or use the Platform.
              </p>
            </section>

            <section id="2" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration</h2>
              <p className="text-gray-700 mb-4">
                To access certain features of the Platform, you must register for an account. 
                You agree to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section id="3" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
              <p className="text-gray-700 mb-4">
                You must be at least 18 years old to use the Platform. By using the Platform, 
                you represent and warrant that:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>You are at least 18 years old</li>
                <li>You have the legal capacity to enter into binding contracts</li>
                <li>You are not prohibited from receiving our services under applicable law</li>
                <li>All registration information you submit is truthful and accurate</li>
              </ul>
            </section>

            <section id="4" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Product Information</h2>
              <p className="text-gray-700 mb-4">
                We strive to ensure that product information is accurate. However, we do not 
                warrant that product descriptions, prices, or other content is accurate, 
                complete, reliable, current, or error-free.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg my-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold">Important</span>
                </div>
                <p className="text-sm text-gray-700">
                  Product colors may vary due to display settings. Product availability is 
                  subject to change without notice.
                </p>
              </div>
            </section>

            <section id="5" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Pricing & Payments</h2>
              <p className="text-gray-700 mb-4">
                All prices are in Kenyan Shillings (KES) and include VAT where applicable. 
                We reserve the right to change prices at any time without notice.
              </p>
              <p className="text-gray-700 mb-4">
                Payment must be completed before order processing. We accept:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>M-Pesa</li>
                <li>Credit/Debit Cards (Visa, MasterCard, American Express)</li>
                <li>Bank Transfers</li>
              </ul>
              <p className="text-gray-700">
                All payments are processed securely through PCI-DSS compliant payment gateways.
              </p>
            </section>

            <section id="6" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Order Processing</h2>
              <p className="text-gray-700 mb-4">
                Order confirmation does not signify our acceptance of your order. We reserve 
                the right to cancel any order for any reason, including but not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Product unavailability</li>
                <li>Errors in product or pricing information</li>
                <li>Suspected fraud or unauthorized transaction</li>
                <li>Violation of these Terms</li>
              </ul>
              <p className="text-gray-700">
                We will notify you if your order is cancelled and provide a full refund if 
                payment was processed.
              </p>
            </section>

            <section id="7" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Shipping & Delivery</h2>
              <p className="text-gray-700 mb-4">
                Delivery times are estimates and not guaranteed. Shipping costs and delivery 
                times vary based on:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Delivery location within Kenya</li>
                <li>Shipping method selected</li>
                <li>Product availability</li>
                <li>Weather conditions and other factors beyond our control</li>
              </ul>
              <p className="text-gray-700">
                Risk of loss passes to you upon delivery. You are responsible for inspecting 
                products upon delivery and reporting any damage within 24 hours.
              </p>
            </section>

            <section id="8" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Returns & Refunds</h2>
              <p className="text-gray-700 mb-4">
                Our return policy is detailed in our Returns Policy. Key points include:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>30-day return window for most items</li>
                <li>Items must be unused and in original packaging</li>
                <li>Proof of purchase required</li>
                <li>Refunds processed within 5-10 business days</li>
              </ul>
              <p className="text-gray-700">
                Certain items are non-returnable for hygiene or safety reasons.
              </p>
            </section>

            <section id="9" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. User Conduct</h2>
              <p className="text-gray-700 mb-4">
                You agree not to use the Platform to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>Upload viruses or malicious code</li>
                <li>Attempt to gain unauthorized access</li>
                <li>Interfere with the Platform's operation</li>
                <li>Harass, abuse, or harm others</li>
              </ul>
              <p className="text-gray-700">
                We reserve the right to investigate and take appropriate legal action against 
                violations.
              </p>
            </section>

            <section id="10" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Platform and its entire contents, features, and functionality are owned 
                by Xarastore Limited and are protected by copyright, trademark, and other 
                intellectual property laws.
              </p>
              <p className="text-gray-700">
                You may not reproduce, distribute, modify, or create derivative works without 
                our express written permission.
              </p>
            </section>

            <section id="11" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Xarastore shall not be liable for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages resulting from third-party services</li>
                <li>Force majeure events beyond our control</li>
              </ul>
              <p className="text-gray-700">
                Our total liability shall not exceed the amount paid by you for the specific 
                product giving rise to the claim.
              </p>
            </section>

            <section id="12" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless Xarastore, its affiliates, officers, 
                and employees from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mt-4">
                <li>Your use of the Platform</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of a third party</li>
                <li>Your conduct in connection with the Platform</li>
              </ul>
            </section>

            <section id="13" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your access to the Platform immediately, without 
                prior notice, for conduct that we believe violates these Terms or is harmful 
                to other users, us, or third parties.
              </p>
              <p className="text-gray-700">
                Upon termination, your right to use the Platform will cease immediately. 
                Provisions that should survive termination will do so.
              </p>
            </section>

            <section id="14" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of 
                Kenya, without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-700">
                Any disputes arising from these Terms shall be subject to the exclusive 
                jurisdiction of the courts of Nairobi, Kenya.
              </p>
            </section>

            <section id="15" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. We will notify you 
                of material changes by:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4">
                <li>Posting the new Terms on the Platform</li>
                <li>Sending an email notification</li>
                <li>Displaying a notice on the Platform</li>
              </ul>
              <p className="text-gray-700">
                Your continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section id="16" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Contact Information</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  For questions about these Terms, please contact:
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Xarastore Limited</p>
                  <p>Westlands, Nairobi, Kenya</p>
                  <p>Email: legal@xarastore.com</p>
                  <p>Phone: +254 711 123 500</p>
                </div>
              </div>
            </section>

            {/* Update Information */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span>These Terms were last updated on {new Date().toLocaleDateString('en-US', { 
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
