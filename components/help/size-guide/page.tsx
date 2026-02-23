'use client';

import { useState } from 'react';
import { Ruler, Shirt, Shoe, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export function SizeGuide() {
  const [category, setCategory] = useState('mens-clothing');

  const categories = [
    { id: 'mens-clothing', label: "Men's Clothing", icon: Shirt },
    { id: 'womens-clothing', label: "Women's Clothing", icon: Shirt },
    { id: 'shoes', label: 'Shoes', icon: Shoe },
    { id: 'kids', label: "Kids' Clothing", icon: User },
  ];

  const sizeCharts = {
    'mens-clothing': {
      title: "Men's Clothing Size Chart",
      measurements: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      chest: ['86-91 cm', '91-97 cm', '97-102 cm', '102-107 cm', '107-112 cm', '112-117 cm'],
      waist: ['71-76 cm', '76-81 cm', '81-86 cm', '86-91 cm', '91-97 cm', '97-102 cm'],
      hip: ['86-91 cm', '91-97 cm', '97-102 cm', '102-107 cm', '107-112 cm', '112-117 cm'],
    },
    'womens-clothing': {
      title: "Women's Clothing Size Chart",
      measurements: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      bust: ['81-86 cm', '86-91 cm', '91-97 cm', '97-102 cm', '102-107 cm', '107-112 cm'],
      waist: ['66-71 cm', '71-76 cm', '76-81 cm', '81-86 cm', '86-91 cm', '91-97 cm'],
      hip: ['86-91 cm', '91-97 cm', '97-102 cm', '102-107 cm', '107-112 cm', '112-117 cm'],
    },
    'shoes': {
      title: 'Shoe Size Chart',
      measurements: ['US', 'UK', 'EU', 'CM'],
      sizes: [
        ['6', '5.5', '38', '24 cm'],
        ['7', '6', '39', '24.5 cm'],
        ['8', '7', '41', '25.5 cm'],
        ['9', '8', '42', '26 cm'],
        ['10', '9', '43', '27 cm'],
        ['11', '10', '44', '28 cm'],
      ],
    },
    'kids': {
      title: "Kids' Clothing Size Chart",
      measurements: ['Age', 'Height', 'Chest', 'Waist'],
      sizes: [
        ['2-3 Years', '92-98 cm', '56 cm', '52 cm'],
        ['4-5 Years', '104-110 cm', '60 cm', '54 cm'],
        ['6-7 Years', '116-122 cm', '64 cm', '57 cm'],
        ['8-9 Years', '128-134 cm', '68 cm', '60 cm'],
        ['10-11 Years', '140-146 cm', '72 cm', '63 cm'],
        ['12-13 Years', '152-158 cm', '76 cm', '66 cm'],
      ],
    },
  };

  const currentChart = sizeCharts[category as keyof typeof sizeCharts];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Ruler className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Find Your Size
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            Use our size guides to ensure the perfect fit. Measurements are in centimeters.
          </p>

          {/* Category Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    isActive
                      ? 'border-red-600 bg-red-50 text-red-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Size Chart */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {currentChart.title}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {currentChart.measurements.map((header) => (
                    <th
                      key={header}
                      className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentChart.sizes?.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border border-gray-200 px-4 py-3 text-gray-700"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {currentChart.chest && (
                  <>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">Chest</td>
                      {currentChart.chest.map((size, index) => (
                        <td key={index} className="border border-gray-200 px-4 py-3">
                          {size}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-gray-200 px-4 py-3 font-medium">Waist</td>
                      {currentChart.waist.map((size, index) => (
                        <td key={index} className="border border-gray-200 px-4 py-3">
                          {size}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">Hip</td>
                      {currentChart.hip.map((size, index) => (
                        <td key={index} className="border border-gray-200 px-4 py-3">
                          {size}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Measurement Guide */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            How to Measure
          </h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-medium text-gray-900 mb-2">Chest/Bust</div>
              <p className="text-sm text-gray-600">
                Measure around the fullest part of your chest/bust, keeping the tape level.
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">Waist</div>
              <p className="text-sm text-gray-600">
                Measure around your natural waistline, keeping the tape comfortably snug.
              </p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-2">Hip</div>
              <p className="text-sm text-gray-600">
                Measure around the fullest part of your hips, about 20cm below your waist.
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">
            Need Help?
          </h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" href="/help">
              Contact Support
            </Button>
            <Button variant="primary" href="/chat">
              Live Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
