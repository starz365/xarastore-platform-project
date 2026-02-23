import { DollarSign, TrendingUp, Users, Package } from 'lucide-react';

export function FinancialHighlights() {
  const metrics = [
    {
      icon: DollarSign,
      title: 'Annual Revenue',
      value: '$25M',
      change: '+200%',
      trend: 'up',
      period: '2023',
    },
    {
      icon: TrendingUp,
      title: 'GMV',
      value: '$75M',
      change: '+180%',
      trend: 'up',
      period: '2023',
    },
    {
      icon: Users,
      title: 'Active Users',
      value: '1.2M',
      change: '+150%',
      trend: 'up',
      period: 'Q4 2023',
    },
    {
      icon: Package,
      title: 'Order Volume',
      value: '850K',
      change: '+220%',
      trend: 'up',
      period: '2023',
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Financial Highlights
        </h2>
        <p className="text-gray-600 max-w-2xl">
          Key performance metrics demonstrating our growth and market leadership.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.trend === 'up';
          
          return (
            <div key={metric.title} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${
                  isPositive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {metric.title}
              </div>
              <div className="text-xs text-gray-500">
                {metric.period}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
