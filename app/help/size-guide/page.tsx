'use client';

import { useState } from 'react';
import { Ruler, Weight, User, Download, Printer, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type SizeCategory = 'clothing' | 'shoes' | 'electronics' | 'home';

export default function SizeGuidePage() {
  const [activeCategory, setActiveCategory] = useState<SizeCategory>('clothing');
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('unisex');

  const categories = [
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'shoes', name: 'Shoes', icon: '👟' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'home', name: 'Home & Furniture', icon: '🛋️' },
  ];

  const clothingSizes = {
    men: [
      { size: 'XS', chest: '86-91 cm', waist: '71-76 cm', hip: '86-91 cm' },
      { size: 'S', chest: '91-97 cm', waist: '76-81 cm', hip: '91-97 cm' },
      { size: 'M', chest: '97-102 cm', waist: '81-86 cm', hip: '97-102 cm' },
      { size: 'L', chest: '102-107 cm', waist: '86-91 cm', hip: '102-107 cm' },
      { size: 'XL', chest: '107-112 cm', waist: '91-97 cm', hip: '107-112 cm' },
      { size: 'XXL', chest: '112-117 cm', waist: '97-102 cm', hip: '112-117 cm' },
    ],
    women: [
      { size: 'XS', bust: '81-86 cm', waist: '61-66 cm', hip: '86-91 cm' },
      { size: 'S', bust: '86-91 cm', waist: '66-71 cm', hip: '91-97 cm' },
      { size: 'M', bust: '91-97 cm', waist: '71-76 cm', hip: '97-102 cm' },
      { size: 'L', bust: '97-102 cm', waist: '76-81 cm', hip: '102-107 cm' },
      { size: 'XL', bust: '102-107 cm', waist: '81-86 cm', hip: '107-112 cm' },
      { size: 'XXL', bust: '107-112 cm', waist: '86-91 cm', hip: '112-117 cm' },
    ],
    unisex: [
      { size: 'XS', chest: '81-86 cm', waist: '66-71 cm', length: '66-71 cm' },
      { size: 'S', chest: '86-91 cm', waist: '71-76 cm', length: '71-76 cm' },
      { size: 'M', chest: '91-97 cm', waist: '76-81 cm', length: '76-81 cm' },
      { size: 'L', chest: '97-102 cm', waist: '81-86 cm', length: '81-86 cm' },
      { size: 'XL', chest: '102-107 cm', waist: '86-91 cm', length: '86-91 cm' },
      { size: 'XXL', chest: '107-112 cm', waist: '91-97 cm', length: '91-97 cm' },
    ],
  };

  const shoeSizes = {
    men: [
      { uk: 6, us: 7, eu: 40, cm: '24.5 cm' },
      { uk: 7, us: 8, eu: 41, cm: '25.5 cm' },
      { uk: 8, us: 9, eu: 42, cm: '26.5 cm' },
      { uk: 9, us: 10, eu: 43, cm: '27.5 cm' },
      { uk: 10, us: 11, eu: 44, cm: '28.5 cm' },
      { uk: 11, us: 12, eu: 45, cm: '29.5 cm' },
    ],
    women: [
      { uk: 3, us: 5, eu: 36, cm: '22.5 cm' },
      { uk: 4, us: 6, eu: 37, cm: '23.5 cm' },
      { uk: 5, us: 7, eu: 38, cm: '24.5 cm' },
      { uk: 6, us: 8, eu: 39, cm: '25.5 cm' },
      { uk: 7, us: 9, eu: 40, cm: '26.5 cm' },
      { uk: 8, us: 10, eu: 41, cm: '27.5 cm' },
    ],
    unisex: [
      { uk: 5, us: 6, eu: 38, cm: '24 cm' },
      { uk: 6, us: 7, eu: 39, cm: '25 cm' },
      { uk: 7, us: 8, eu: 40, cm: '26 cm' },
      { uk: 8, us: 9, eu: 41, cm: '27 cm' },
      { uk: 9, us: 10, eu: 42, cm: '28 cm' },
      { uk: 10, us: 11, eu: 43, cm: '29 cm' },
    ],
  };

  const measurementTips = [
    {
      title: 'Chest/Bust',
      description: 'Measure around the fullest part of your chest, under arms',
      icon: '👕',
    },
    {
      title: 'Waist',
      description: 'Measure around your natural waistline, above belly button',
      icon: '📏',
    },
    {
      title: 'Hip',
      description: 'Measure around the fullest part of your hips',
      icon: '🩳',
    },
    {
      title: 'Inseam',
      description: 'Measure from crotch to bottom of ankle',
      icon: '👖',
    },
  ];

  const printSizeGuide = () => {
    window.print();
  };

  const downloadSizeGuide = () => {
    // In production, this would generate and download a PDF
    alert('PDF download feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="flex items-center space-x-3 mb-4">
            <Ruler className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Size Guide</h1>
          </div>
          <p className="text-xl opacity-90 max-w-3xl">
            Find your perfect fit with our comprehensive size charts and measurement guides.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id as SizeCategory)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
                  activeCategory === category.id
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
                }`}
              >
                <span className="text-xl">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Gender Selection */}
          {activeCategory === 'clothing' || activeCategory === 'shoes' ? (
            <div className="flex space-x-4 mb-8">
              {(['men', 'women', 'unisex'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`px-6 py-2 rounded-full transition-all ${
                    gender === g
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Size Charts */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Size Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {activeCategory === 'clothing' && `${gender.charAt(0).toUpperCase() + gender.slice(1)} Clothing Sizes`}
                    {activeCategory === 'shoes' && `${gender.charAt(0).toUpperCase() + gender.slice(1)} Shoe Sizes`}
                    {activeCategory === 'electronics' && 'Electronics Size Guide'}
                    {activeCategory === 'home' && 'Home & Furniture Dimensions'}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={downloadSizeGuide}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="secondary" size="sm" onClick={printSizeGuide}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {activeCategory === 'clothing' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Size</th>
                          {gender === 'women' ? (
                            <>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Bust (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Waist (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Hip (cm)</th>
                            </>
                          ) : gender === 'men' ? (
                            <>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Chest (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Waist (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Hip (cm)</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Chest (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Waist (cm)</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Length (cm)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {clothingSizes[gender].map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{row.size}</td>
                            {gender === 'women' ? (
                              <>
                                <td className="px-4 py-3">{row.bust}</td>
                                <td className="px-4 py-3">{row.waist}</td>
                                <td className="px-4 py-3">{row.hip}</td>
                              </>
                            ) : gender === 'men' ? (
                              <>
                                <td className="px-4 py-3">{row.chest}</td>
                                <td className="px-4 py-3">{row.waist}</td>
                                <td className="px-4 py-3">{row.hip}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">{row.chest}</td>
                                <td className="px-4 py-3">{row.waist}</td>
                                <td className="px-4 py-3">{row.length}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeCategory === 'shoes' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">UK</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">US</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">EU</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Foot Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {shoeSizes[gender].map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{row.uk}</td>
                            <td className="px-4 py-3">{row.us}</td>
                            <td className="px-4 py-3">{row.eu}</td>
                            <td className="px-4 py-3">{row.cm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeCategory === 'electronics' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Device Dimensions</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-2">Smartphones</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Small</span>
                              <span className="font-medium">4-5 inches</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Medium</span>
                              <span className="font-medium">5-6 inches</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Large</span>
                              <span className="font-medium">6-7 inches</span>
                            </div>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-2">Laptops</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Small</span>
                              <span className="font-medium">11-13 inches</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Medium</span>
                              <span className="font-medium">14-15 inches</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Large</span>
                              <span className="font-medium">16-17 inches</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeCategory === 'home' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Standard Furniture Sizes</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-2">Beds</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Single</span>
                              <span className="font-medium">90 × 190 cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Double</span>
                              <span className="font-medium">135 × 190 cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Queen</span>
                              <span className="font-medium">150 × 200 cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>King</span>
                              <span className="font-medium">180 × 200 cm</span>
                            </div>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-2">Sofas</div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>2-Seater</span>
                              <span className="font-medium">140-160 cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>3-Seater</span>
                              <span className="font-medium">180-220 cm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Corner</span>
                              <span className="font-medium">250-300 cm</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Measurement Guide */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-6 h-6 text-red-600" />
                <h3 className="font-bold">How to Measure</h3>
              </div>
              <div className="space-y-4">
                {measurementTips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Measure in centimeters for accuracy. Use a flexible tape measure.
                  </p>
                </div>
              </div>
            </div>

            {/* Fit Tips */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl p-6">
              <h3 className="font-bold mb-4">Fit Tips</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs">1</span>
                  </div>
                  <span>Consider your preferred fit (slim, regular, loose)</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs">2</span>
                  </div>
                  <span>Check fabric type - some materials stretch</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs">3</span>
                  </div>
                  <span>When in doubt, size up for comfort</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs">4</span>
                  </div>
                  <span>Check product reviews for fit feedback</span>
                </li>
              </ul>
            </div>

            {/* Conversion Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold mb-4">Size Conversion</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">1 inch</span>
                  <span className="text-gray-700">= 2.54 cm</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">1 foot</span>
                  <span className="text-gray-700">= 30.48 cm</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">1 meter</span>
                  <span className="text-gray-700">= 100 cm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* International Sizes */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold mb-6">International Size Conversion</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">International</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">UK</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">US</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">EU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">AUS</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">JP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{size}</td>
                    <td className="px-4 py-3">8-10</td>
                    <td className="px-4 py-3">6-8</td>
                    <td className="px-4 py-3">34-36</td>
                    <td className="px-4 py-3">8-10</td>
                    <td className="px-4 py-3">S-M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
