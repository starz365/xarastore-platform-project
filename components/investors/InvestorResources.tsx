import { FileText, BarChart, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function InvestorResources() {
  const resources = [
    {
      category: 'Financial Reports',
      items: [
        { name: '2023 Annual Report', date: 'Mar 15, 2024', size: '8.2 MB', icon: FileText },
        { name: 'Q4 2023 Earnings', date: 'Feb 28, 2024', size: '4.1 MB', icon: BarChart },
        { name: '2024 Investor Deck', date: 'Jan 15, 2024', size: '12.5 MB', icon: FileText },
      ],
    },
    {
      category: 'Presentations',
      items: [
        { name: 'Company Overview', date: 'Dec 20, 2023', size: '6.8 MB', icon: FileText },
        { name: 'Market Strategy', date: 'Nov 10, 2023', size: '9.3 MB', icon: BarChart },
        { name: 'Growth Metrics', date: 'Oct 5, 2023', size: '5.7 MB', icon: BarChart },
      ],
    },
  ];

  const events = [
    { date: 'May 15, 2024', title: 'Q1 2024 Earnings Call', type: 'Earnings' },
    { date: 'Aug 20, 2024', title: 'H1 2024 Results', type: 'Financial' },
    { date: 'Nov 12, 2024', title: 'Q3 2024 Update', type: 'Update' },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Documents */}
        <div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Documents & Reports
            </h3>
            <p className="text-gray-600">
              Download our latest financial reports and presentations
            </p>
          </div>

          <div className="space-y-6">
            {resources.map((category) => (
              <div key={category.category}>
                <h4 className="font-medium text-gray-900 mb-4">
                  {category.category}
                </h4>
                <div className="space-y-3">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.date} • {item.size}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Upcoming Events
            </h3>
            <p className="text-gray-600">
              Investor events, earnings calls, and presentations
            </p>
          </div>

          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.title}
                className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {event.date}
                      </div>
                      <div className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mt-2">
                        {event.type}
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">
                    Add to Calendar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">
              Email Alerts
            </h4>
            <p className="text-gray-600 text-sm mb-4">
              Get notified about new reports and upcoming events
            </p>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <Button variant="primary">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
