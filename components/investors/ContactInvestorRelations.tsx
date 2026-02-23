import { Mail, Phone, Building, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ContactInvestorRelations() {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Investor Relations Team
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Michael Njoroge</h4>
                <p className="text-gray-600">Head of Investor Relations</p>
                <div className="mt-2 space-y-1">
                  <a href="mailto:investors@xarastore.com" className="text-sm text-gray-600 hover:text-blue-600 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    investors@xarastore.com
                  </a>
                  <a href="tel:+254700654321" className="text-sm text-gray-600 hover:text-blue-600 flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    +254 700 654 321
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Mailing Address</h4>
                <p className="text-gray-600">
                  Xarastore Investor Relations<br />
                  P.O. Box 12345-00100<br />
                  Nairobi, Kenya
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Investor Inquiry
          </h3>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              For investor inquiries, analyst coverage, or meeting requests, please contact our Investor Relations team.
            </p>
            
            <div className="space-y-4">
              <Button variant="primary" className="w-full" href="mailto:investors@xarastore.com">
                <Mail className="w-4 h-4 mr-2" />
                Email Investor Relations
              </Button>
              
              <Button variant="secondary" className="w-full" href="tel:+254700654321">
                <Phone className="w-4 h-4 mr-2" />
                Call Investor Relations
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> For media inquiries, please contact our Press Office at{' '}
                <a href="mailto:press@xarastore.com" className="text-blue-600 hover:underline">
                  press@xarastore.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
