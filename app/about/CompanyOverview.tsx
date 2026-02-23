import { Target, Users, Globe, Award } from 'lucide-react';

export function CompanyOverview() {
  const stats = [
    {
      icon: Users,
      value: '1M+',
      label: 'Happy Customers',
    },
    {
      icon: Globe,
      value: '50K+',
      label: 'Products',
    },
    {
      icon: Award,
      value: '100+',
      label: 'Brands',
    },
    {
      icon: Target,
      value: '99%',
      label: 'Satisfaction Rate',
    },
  ];

  return (
    <section className="mb-16">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Our Story
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Founded in 2023, Xarastore began with a simple mission: to make quality products accessible 
              and affordable for everyone in Kenya. What started as a small online store has grown into 
              Kenya's fastest-growing e-commerce platform.
            </p>
            <p>
              We believe that everyone deserves access to great products at fair prices. Our platform 
              connects customers with trusted sellers, ensuring a seamless shopping experience from 
              discovery to delivery.
            </p>
            <p>
              Today, Xarastore serves millions of customers across Kenya, offering everything from 
              electronics and fashion to home goods and beauty products. Our commitment to innovation, 
              customer satisfaction, and social responsibility drives everything we do.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
