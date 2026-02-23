import { Mail, Phone, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PressContact() {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Press Contact
        </h2>
        <p className="text-gray-600">
          For media inquiries and interview requests
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Contact Information
          </h3>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Email</h4>
                <a
                  href="mailto:press@xarastore.com"
                  className="text-gray-600 hover:text-red-600"
                >
                  press@xarastore.com
                </a>
                <p className="text-sm text-gray-500 mt-1">
                  For all press and media inquiries
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Phone</h4>
                <a
                  href="tel:+254700123456"
                  className="text-gray-600 hover:text-red-600"
                >
                  +254 700 123 456
                </a>
                <p className="text-sm text-gray-500 mt-1">
                  Press line (Mon-Fri 9AM-5PM EAT)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Response Time</h4>
                <p className="text-gray-600">Within 24 hours</p>
                <p className="text-sm text-gray-500 mt-1">
                  We aim to respond to all inquiries promptly
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Press Inquiry Form
          </h3>
          <div className="space-y-4">
            <p className="text-gray-600">
              For specific requests or interview scheduling, please use our press inquiry form.
            </p>
            <Button variant="primary" className="w-full" href="/press/contact">
              Submit Press Inquiry
            </Button>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Urgent Requests
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    For time-sensitive requests, please call our press line directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
