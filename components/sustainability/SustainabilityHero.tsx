import { Leaf, Recycle, Users, Globe } from 'lucide-react';

export function SustainabilityHero() {
  const pillars = [
    {
      icon: Leaf,
      title: 'Environmental',
      description: 'Reducing our carbon footprint',
    },
    {
      icon: Recycle,
      title: 'Circular Economy',
      description: 'Promoting reuse and recycling',
    },
    {
      icon: Users,
      title: 'Social Impact',
      description: 'Supporting local communities',
    },
    {
      icon: Globe,
      title: 'Ethical Sourcing',
      description: 'Responsible supply chain',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
      <div className="container-responsive py-12 md:py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sustainability at Xarastore
          </h1>
          <p className="text-xl opacity-90">
            Building a responsible business that creates value for people and the planet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{pillar.title}</h3>
                <p className="text-white/80">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
