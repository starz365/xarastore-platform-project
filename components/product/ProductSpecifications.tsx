'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Specification {
  category: string;
  items: Array<{
    name: string;
    value: string;
    highlight?: boolean;
    icon?: React.ReactNode;
  }>;
}

interface ProductSpecificationsProps {
  specifications: Record<string, string>;
  manufacturerInfo?: {
    name: string;
    warranty: string;
    country: string;
    model: string;
  };
  dimensions?: {
    length: string;
    width: string;
    height: string;
    weight: string;
  };
  compliance?: Array<{
    name: string;
    certified: boolean;
    description?: string;
  }>;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function ProductSpecifications({
  specifications,
  manufacturerInfo,
  dimensions,
  compliance,
  className,
  collapsible = true,
  defaultExpanded = true,
}: ProductSpecificationsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState('specifications');

  // Convert flat specifications to categorized structure
  const categorizedSpecs: Specification[] = (() => {
    const categories: Record<string, Specification> = {};
    
    Object.entries(specifications).forEach(([key, value]) => {
      // Extract category from key (e.g., "display_size" -> "Display")
      const category = key.split('_')[0];
      const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
      
      if (!categories[formattedCategory]) {
        categories[formattedCategory] = {
          category: formattedCategory,
          items: [],
        };
      }
      
      // Format key for display
      const formattedKey = key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      categories[formattedCategory].items.push({
        name: formattedKey,
        value,
        highlight: key.includes('feature') || key.includes('key'),
      });
    });
    
    return Object.values(categories);
  })();

  // Add manufacturer info if available
  if (manufacturerInfo) {
    categorizedSpecs.unshift({
      category: 'Manufacturer',
      items: [
        { name: 'Brand', value: manufacturerInfo.name, highlight: true },
        { name: 'Model', value: manufacturerInfo.model },
        { name: 'Warranty', value: manufacturerInfo.warranty },
        { name: 'Country of Origin', value: manufacturerInfo.country },
      ],
    });
  }

  // Add dimensions if available
  if (dimensions) {
    categorizedSpecs.push({
      category: 'Dimensions & Weight',
      items: [
        { name: 'Length', value: dimensions.length },
        { name: 'Width', value: dimensions.width },
        { name: 'Height', value: dimensions.height },
        { name: 'Weight', value: dimensions.weight },
      ],
    });
  }

  const tabs = [
    { id: 'specifications', label: 'Technical Specifications' },
    { id: 'compliance', label: 'Certifications & Compliance' },
    { id: 'features', label: 'Key Features' },
  ];

  const renderSpecifications = () => (
    <div className="space-y-6">
      {categorizedSpecs.map((category) => (
        <div key={category.category} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{category.category}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {category.items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'flex justify-between items-start px-6 py-4',
                  item.highlight && 'bg-red-50'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {item.icon}
                    <span className={cn(
                      'font-medium',
                      item.highlight ? 'text-red-700' : 'text-gray-700'
                    )}>
                      {item.name}
                    </span>
                  </div>
                  {item.highlight && (
                    <p className="text-sm text-red-600 mt-1">Key specification</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className={cn(
                    'font-medium',
                    item.highlight ? 'text-red-700' : 'text-gray-900'
                  )}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-6">
      {compliance ? (
        compliance.map((item, index) => (
          <div
            key={index}
            className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex-shrink-0">
              {item.certified ? (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{item.name}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
            </div>
            <div className="text-sm">
              {item.certified ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Certified
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  Pending
                </span>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No compliance information available</p>
        </div>
      )}
    </div>
  );

  const renderFeatures = () => {
    const features = categorizedSpecs
      .flatMap(category => 
        category.items
          .filter(item => item.highlight)
          .map(item => ({ category: category.category, ...item }))
      );

    return (
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-6 bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-red-700 uppercase tracking-wide">
                  {feature.category}
                </span>
                <h4 className="text-lg font-bold text-gray-900 mt-2">
                  {feature.name}
                </h4>
                <p className="text-gray-700 mt-2">{feature.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const content = (
    <div className={className}>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-4 px-1 border-b-2 font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'specifications' && renderSpecifications()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'features' && renderFeatures()}
      </div>
    </div>
  );

  if (!collapsible) {
    return content;
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Specifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Technical details and specifications
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6">
          {content}
        </div>
      )}
    </div>
  );
}
