import { TrendingUp, Users, Globe, Award } from 'lucide-react';

export function InvestorHero() {
  const highlights = [
    {
      icon: TrendingUp,
      value: '200%',
      label: 'YoY Growth',
      description: 'Revenue growth year-over-year',
    },
    {
      icon: Users,
      value: '1M+',
      label: 'Customers',
      description: 'Active customer base',
    },
    {
      icon: Globe,
      value: '50K+',
      label: 'Products',
      description: 'Active SKUs',
    },
    {
      icon: Award,
      value: '#1',
      label: 'Ranking',
      description: 'Fastest-growing e-commerce in Kenya',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
      <div className="container-responsive py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Investor Relations
          </h1>
          <p className="text-xl opacity-90">
            Building Africa's leading e-commerce platform. Transparent, growth-focused, and investor-ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <div key={highlight.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold mb-1">{highlight.value}</div>
                <div className="font-semibold mb-2">{highlight.label}</div>
                <p className="text-sm text-white/80">{highlight.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
