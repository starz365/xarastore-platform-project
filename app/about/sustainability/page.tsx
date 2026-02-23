'use client';

import { Leaf, Recycle, Sun, Droplets, Trees, Package, Truck, Users } from 'lucide-react';

export default function SustainabilityPage() {
  const pillars = [
    {
      icon: Leaf,
      title: 'Environmental Stewardship',
      description: 'Reducing our carbon footprint and promoting eco-friendly practices',
      goals: [
        'Carbon-neutral operations by 2025',
        '100% renewable energy by 2026',
        'Zero-waste packaging initiative',
      ],
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Users,
      title: 'Social Responsibility',
      description: 'Creating positive impact in the communities we serve',
      goals: [
        'Support 10,000 local artisans by 2025',
        'Digital skills training for 5,000 youth',
        'Gender equality in leadership positions',
      ],
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Package,
      title: 'Sustainable Commerce',
      description: 'Building a circular economy through our platform',
      goals: [
        '50% sustainable products by 2025',
        'Product lifecycle management',
        'Repair and refurbishment programs',
      ],
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  const initiatives = [
    {
      title: 'Green Delivery Network',
      description: 'Electric vehicle fleet and optimized delivery routes',
      impact: 'Reduced 25% carbon emissions in logistics',
      icon: Truck,
    },
    {
      title: 'Eco-Packaging',
      description: '100% recyclable and biodegradable packaging materials',
      impact: 'Eliminated 10 tons of plastic waste annually',
      icon: Package,
    },
    {
      title: 'Solar-Powered Warehouses',
      description: 'Renewable energy for our storage and fulfillment centers',
      impact: '40% energy from solar power',
      icon: Sun,
    },
    {
      title: 'Water Conservation',
      description: 'Rainwater harvesting and water recycling systems',
      impact: 'Reduced water usage by 30%',
      icon: Droplets,
    },
  ];

  const progress = [
    { goal: 'Carbon Emissions', current: 65, target: 100, unit: '% reduction' },
    { goal: 'Renewable Energy', current: 40, target: 100, unit: '% usage' },
    { goal: 'Waste Diverted', current: 75, target: 100, unit: '% from landfill' },
    { goal: 'Sustainable Products', current: 35, target: 50, unit: '% of catalog' },
  ];

  const partnerships = [
    {
      name: 'Kenya Forest Service',
      description: 'Tree planting initiative - 50,000 trees planted',
      logo: '🌳',
    },
    {
      name: 'Clean Energy Africa',
      description: 'Solar power for rural communities',
      logo: '☀️',
    },
    {
      name: 'Plastic-Free Kenya',
      description: 'Plastic waste reduction campaign',
      logo: '🔄',
    },
    {
      name: 'Women in Business',
      description: 'Supporting female entrepreneurs',
      logo: '👩🏾‍💼',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="container-responsive text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <Leaf className="w-10 h-10" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Sustainable Commerce
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Building a better future through responsible business practices 
            and environmental stewardship
          </p>
        </div>
      </div>

      {/* Our Commitment */}
      <div className="container-responsive py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Commitment</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            At Xarastore, we believe that commerce should create value not just 
            for shareholders, but for society and the planet.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-200"
              >
                <div className={`w-16 h-16 ${pillar.color} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{pillar.title}</h3>
                <p className="text-gray-600 mb-6">{pillar.description}</p>
                <ul className="space-y-3">
                  {pillar.goals.map((goal, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="bg-white py-16">
        <div className="container-responsive">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Our Progress
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {progress.map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative w-40 h-40 mx-auto mb-6">
                  {/* Progress circle */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${item.current * 2.83} 283`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <div className="text-3xl font-bold text-gray-900">{item.current}%</div>
                      <div className="text-sm text-gray-600">of {item.target}% goal</div>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.goal}</h3>
                <p className="text-sm text-gray-600">{item.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Initiatives */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Key Initiatives
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {initiatives.map((initiative, index) => {
            const Icon = initiative.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8"
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center">
                    <Icon className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{initiative.title}</h3>
                    <p className="text-green-600 font-medium">{initiative.impact}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">{initiative.description}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                  Active initiative
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circular Economy */}
      <div className="bg-gray-50 py-16">
        <div className="container-responsive">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Circular Economy Model
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We're building Africa's first circular e-commerce platform, 
                  focusing on product longevity, reuse, and recycling.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Recycle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Product take-back program for electronics</span>
                  </li>
                  <li className="flex items-start">
                    <Recycle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Refurbishment center for returned items</span>
                  </li>
                  <li className="flex items-start">
                    <Recycle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Materials recycling partnership network</span>
                  </li>
                  <li className="flex items-start">
                    <Recycle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Second-life marketplace for used products</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Circular Economy Impact
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Products Repaired</span>
                    <span className="text-green-600 font-bold">12,500+</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Waste Diverted</span>
                    <span className="text-green-600 font-bold">45 tons</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Carbon Saved</span>
                    <span className="text-green-600 font-bold">150 tons CO₂</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partnerships */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Strategic Partnerships
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {partnerships.map((partner, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200"
            >
              <div className="text-4xl mb-4">{partner.logo}</div>
              <h3 className="font-bold text-gray-900 mb-2">{partner.name}</h3>
              <p className="text-sm text-gray-600">{partner.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Report & Transparency */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-16">
        <div className="container-responsive">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Transparency & Reporting</h2>
              <p className="text-xl opacity-90 mb-8">
                We believe in accountability and regularly report on our 
                sustainability progress.
              </p>
              <div className="space-y-4">
                <a
                  href="#"
                  className="flex items-center justify-between p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <span>2023 Sustainability Report (PDF)</span>
                  <span className="text-sm">Download</span>
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <span>Carbon Footprint Analysis</span>
                  <span className="text-sm">View Data</span>
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <span>Social Impact Metrics</span>
                  <span className="text-sm">See Results</span>
                </a>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Certifications & Standards</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white/20 rounded-xl">
                  <div className="text-2xl font-bold mb-2">B Corp</div>
                  <div className="text-sm opacity-90">Pending 2024</div>
                </div>
                <div className="text-center p-4 bg-white/20 rounded-xl">
                  <div className="text-2xl font-bold mb-2">ISO 14001</div>
                  <div className="text-sm opacity-90">Environmental Management</div>
                </div>
                <div className="text-center p-4 bg-white/20 rounded-xl">
                  <div className="text-2xl font-bold mb-2">SDG Aligned</div>
                  <div className="text-sm opacity-90">UN Sustainable Goals</div>
                </div>
                <div className="text-center p-4 bg-white/20 rounded-xl">
                  <div className="text-2xl font-bold mb-2">Carbon Neutral</div>
                  <div className="text-sm opacity-90">Target 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="container-responsive py-16">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Join Our Sustainability Journey
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Together, we can build a more sustainable future for African commerce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Download Report
            </a>
            <a
              href="/careers"
              className="inline-flex items-center justify-center px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Join Our Team
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Partner With Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
