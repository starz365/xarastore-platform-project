import { Image, FileText, Video, Download } from 'lucide-react';

export function MediaResources() {
  const resources = [
    {
      category: 'Logos',
      items: [
        { name: 'Xarastore Logo (PNG)', size: '2.1 MB', icon: Image },
        { name: 'Xarastore Logo (SVG)', size: '0.8 MB', icon: Image },
        { name: 'Brand Guidelines', size: '5.2 MB', icon: FileText },
      ],
    },
    {
      category: 'Images',
      items: [
        { name: 'Office Photos', size: '15.4 MB', icon: Image },
        { name: 'Team Photos', size: '22.1 MB', icon: Image },
        { name: 'Product Photos', size: '45.3 MB', icon: Image },
      ],
    },
    {
      category: 'Documents',
      items: [
        { name: 'Company Fact Sheet', size: '1.2 MB', icon: FileText },
        { name: 'Executive Bios', size: '2.8 MB', icon: FileText },
        { name: 'Company Timeline', size: '3.1 MB', icon: FileText },
      ],
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Media Resources
        </h2>
        <p className="text-gray-600">
          Download official logos, images, and company information
        </p>
      </div>

      <div className="space-y-8">
        {resources.map((category) => (
          <div key={category.category}>
            <h3 className="font-semibold text-gray-900 mb-4">
              {category.category}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-red-600" />
                      </div>
                      <button className="text-gray-400 hover:text-red-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-500">{item.size}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
