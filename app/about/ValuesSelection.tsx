import { Heart, Shield, Zap, Users, Globe, Star } from 'lucide-react';

export function ValuesSection() {
  const values = [
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Every decision starts with our customers\' needs and satisfaction.',
    },
    {
      icon: Shield,
      title: 'Trust & Transparency',
      description: 'We build trust through honest communication and transparent policies.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Constantly improving our platform to deliver better experiences.',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Supporting local businesses and building strong communities.',
    },
    {
      icon: Globe,
      title: 'Sustainability',
      description: 'Committed to environmentally responsible practices.',
    },
    {
      icon: Star,
      title: 'Excellence',
      description: 'Striving for excellence in every aspect of our business.',
    },
  ];

  return (
    <section className="mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Our Values
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          These principles guide our decisions, shape our culture, and define our commitment to you.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.title} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
