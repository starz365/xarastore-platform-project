import { Droplets, Wind, Tree, Recycle } from 'lucide-react';

export function SustainabilityImpact() {
  const impacts = [
    {
      icon: Droplets,
      value: '5M+',
      unit: 'liters',
      label: 'Water Saved',
      description: 'Through efficient logistics and packaging',
    },
    {
      icon: Wind,
      value: '1.2K',
      unit: 'tons',
      label: 'CO₂ Offset',
      description: 'Carbon emissions neutralized',
    },
    {
      icon: Tree,
      value: '50K+',
      unit: 'trees',
      label: 'Planted',
      description: 'Through our reforestation program',
    },
    {
      icon: Recycle,
      value: '85%',
      unit: 'rate',
      label: 'Packaging Recycled',
      description: 'Of all packaging materials',
    },
  ];

  return (
    <section className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Our Impact
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Measuring our progress toward a more sustainable future
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {impacts.map((impact) => {
          const Icon = impact.icon;
          return (
            <div key={impact.label} className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {impact.value}
              </div>
              <div className="text-sm text-gray-600 mb-1">{impact.unit}</div>
              <div className="font-semibold text-gray-900 mb-2">{impact.label}</div>
              <p className="text-sm text-gray-600">{impact.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
