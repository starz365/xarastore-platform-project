import { Package, Truck, Recycle, Tree } from 'lucide-react';

export function SustainabilityInitiatives() {
  const initiatives = [
    {
      icon: Package,
      title: 'Sustainable Packaging',
      description: 'Using 100% recyclable and biodegradable packaging materials.',
      progress: 85,
    },
    {
      icon: Truck,
      title: 'Carbon-Neutral Delivery',
      description: 'Offsetting emissions from all deliveries through certified projects.',
      progress: 90,
    },
    {
      icon: Recycle,
      title: 'Product Recycling',
      description: 'Take-back program for electronics and hard-to-recycle items.',
      progress: 70,
    },
    {
      icon: Tree,
      title: 'Reforestation',
      description: 'Planting one tree for every 100 orders placed.',
      progress: 120, // Exceeds 100%
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Our Initiatives
        </h2>
        <p className="text-gray-600 max-w-2xl">
          Concrete actions we're taking to reduce our environmental impact and promote sustainability.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {initiatives.map((initiative) => {
          const Icon = initiative.icon;
          const progress = Math.min(initiative.progress, 100);
          
          return (
            <div key={initiative.title} className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{progress}%</span>
                  <div className="text-sm text-gray-600">Complete</div>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {initiative.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {initiative.description}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-green-600 h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {initiative.progress > 100 && (
                <div className="mt-2 text-sm text-green-600 font-medium">
                  🎉 Exceeding target!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
