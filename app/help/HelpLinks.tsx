import { FileText, Truck, RefreshCw, Ruler, Shield } from 'lucide-react';

export function HelpLinks() {
  const resources = [
    {
      title: 'Shipping Information',
      description: 'Delivery times, costs, and tracking',
      icon: Truck,
      href: '/help/shipping',
    },
    {
      title: 'Returns & Exchanges',
      description: 'Policy, process, and timelines',
      icon: RefreshCw,
      href: '/help/returns',
    },
    {
      title: 'Size Guide',
      description: 'Find your perfect fit',
      icon: Ruler,
      href: '/help/size-guide',
    },
    {
      title: 'Terms & Conditions',
      description: 'Legal terms and policies',
      icon: FileText,
      href: '/legal/terms',
    },
    {
      title: 'Privacy & Security',
      description: 'How we protect your data',
      icon: Shield,
      href: '/legal/privacy',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Quick Resources
      </h3>
      <div className="space-y-4">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <a
              key={resource.title}
              href={resource.href}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-red-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-red-600">
                  {resource.title}
                </h4>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
