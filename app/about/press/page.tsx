'use client';

import { Newspaper, Download, Calendar, User, Globe, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PressPage() {
  const pressReleases = [
    {
      id: '2024-q1-results',
      title: 'Xarastore Reports Record Q1 2024 Growth',
      date: 'April 15, 2024',
      summary: 'Company achieves 150% year-over-year growth in Q1 2024',
      category: 'Financial',
      downloads: ['PDF', 'Word'],
    },
    {
      id: 'series-b-announcement',
      title: 'Xarastore Secures $50M Series B Funding',
      date: 'March 1, 2024',
      summary: 'Funding round led by African Growth Fund to expand across Africa',
      category: 'Funding',
      downloads: ['PDF', 'Presentation'],
    },
    {
      id: 'kenya-expansion',
      title: 'Xarastore Launches Same-Day Delivery Across Kenya',
      date: 'February 20, 2024',
      summary: 'New delivery network covers 20 major Kenyan cities',
      category: 'Operations',
      downloads: ['PDF', 'Images'],
    },
    {
      id: 'sustainability-report',
      title: '2023 Sustainability Report Released',
      date: 'January 30, 2024',
      summary: 'Commitment to carbon-neutral operations by 2025',
      category: 'ESG',
      downloads: ['PDF', 'Data'],
    },
    {
      id: 'mpesa-integration',
      title: 'Xarastore Deepens M-Pesa Integration',
      date: 'December 15, 2023',
      summary: 'Enhanced payment options for Kenyan customers',
      category: 'Product',
      downloads: ['PDF', 'Logos'],
    },
    {
      id: 'seller-milestone',
      title: 'Xarastore Reaches 10,000 Seller Milestone',
      date: 'November 5, 2023',
      summary: 'Platform now hosts over 10,000 African businesses',
      category: 'Milestone',
      downloads: ['PDF', 'Infographic'],
    },
  ];

  const mediaKit = {
    logos: [
      { name: 'Primary Logo', formats: ['SVG', 'PNG', 'PDF'] },
      { name: 'Wordmark', formats: ['SVG', 'PNG'] },
      { name: 'Icon', formats: ['SVG', 'PNG'] },
      { name: 'Brand Colors', formats: ['PDF', 'PNG'] },
    ],
    images: [
      { category: 'Team Photos', count: 15 },
      { category: 'Office Photos', count: 8 },
      { category: 'Product Shots', count: 25 },
      { category: 'Event Photos', count: 12 },
    ],
  };

  const leadershipTeam = [
    {
      name: 'Sarah Mwangi',
      title: 'CEO & Founder',
      bio: 'Former e-commerce executive with 15+ years experience',
      contact: 'sarah.press@xarastore.com',
      available: ['Interviews', 'Quotes', 'Speaking'],
    },
    {
      name: 'David Ochieng',
      title: 'CTO',
      bio: 'Tech leader specializing in scalable African solutions',
      contact: 'david.press@xarastore.com',
      available: ['Technical Interviews', 'Product Demos'],
    },
    {
      name: 'Amina Hassan',
      title: 'Head of Operations',
      bio: 'Supply chain expert with Pan-African experience',
      contact: 'amina.press@xarastore.com',
      available: ['Operations', 'Logistics', 'Expansion'],
    },
  ];

  const factsAndFigures = [
    { label: 'Founded', value: '2022' },
    { label: 'Headquarters', value: 'Nairobi, Kenya' },
    { label: 'Countries', value: '15+' },
    { label: 'Team Size', value: '200+' },
    { label: 'Products', value: '100K+' },
    { label: 'Customers', value: '500K+' },
    { label: 'Seller Partners', value: '10K+' },
    { label: 'GMV 2023', value: 'KES 500M+' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-20">
        <div className="container-responsive text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <Newspaper className="w-10 h-10" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Press & Media
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Latest news, media resources, and information about Xarastore
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="container-responsive py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Media Contact</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">General Inquiries</h3>
              <a 
                href="mailto:press@xarastore.com" 
                className="text-red-600 hover:text-red-800"
              >
                press@xarastore.com
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <a 
                href="tel:+254700123456" 
                className="text-red-600 hover:text-red-800"
              >
                +254 700 123 456
              </a>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-6">
            Response time: Within 24 hours for urgent inquiries
          </p>
        </div>
      </div>

      {/* Press Releases */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">Latest Press Releases</h2>
        <div className="space-y-6">
          {pressReleases.map((release) => (
            <div
              key={release.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                        {release.category}
                      </span>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {release.date}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {release.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4">
                      {release.summary}
                    </p>
                    
                    <div className="flex items-center space-x-4">
                      <Button variant="primary" href={`/press/${release.id}`}>
                        Read More
                      </Button>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Download:</span>
                        {release.downloads.map((format) => (
                          <a
                            key={format}
                            href="#"
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            {format}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Media Kit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Kit */}
      <div className="bg-white py-16">
        <div className="container-responsive">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Media Resources
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Brand Assets */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Brand Assets</h3>
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Logos & Branding</h4>
                <div className="space-y-4">
                  {mediaKit.logos.map((asset) => (
                    <div
                      key={asset.name}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <span className="font-medium">{asset.name}</span>
                      <div className="flex items-center space-x-2">
                        {asset.formats.map((format) => (
                          <a
                            key={format}
                            href="#"
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            {format}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-4">Brand Guidelines</h4>
                  <div className="space-y-3">
                    <a href="#" className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300">
                      <span>Brand Guidelines PDF</span>
                      <Download className="w-5 h-5 text-gray-400" />
                    </a>
                    <a href="#" className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300">
                      <span>Press Kit (Complete)</span>
                      <Download className="w-5 h-5 text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Photo Gallery</h3>
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {mediaKit.images.map((category) => (
                    <div
                      key={category.category}
                      className="bg-white rounded-lg p-4 text-center"
                    >
                      <div className="text-2xl font-bold text-red-600 mb-2">{category.count}</div>
                      <div className="text-sm text-gray-600">{category.category}</div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <Button variant="primary" className="w-full">
                    <Download className="w-5 h-5 mr-2" />
                    Download All Images (ZIP, 250MB)
                  </Button>
                  <Button variant="secondary" className="w-full">
                    Request High-Res Photos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leadership Team */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Leadership Team
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {leadershipTeam.map((leader) => (
            <div
              key={leader.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{leader.name}</h3>
                  <p className="text-red-600 font-medium">{leader.title}</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">{leader.bio}</p>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
                <a 
                  href={`mailto:${leader.contact}`}
                  className="text-red-600 hover:text-red-800"
                >
                  {leader.contact}
                </a>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Available For</h4>
                <div className="flex flex-wrap gap-2">
                  {leader.available.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facts & Figures */}
      <div className="bg-gray-50 py-16">
        <div className="container-responsive">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Company Facts & Figures
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {factsAndFigures.map((fact) => (
              <div
                key={fact.label}
                className="bg-white p-6 rounded-xl shadow-sm text-center"
              >
                <div className="text-2xl font-bold text-red-600 mb-2">{fact.value}</div>
                <div className="text-gray-600">{fact.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* In the News */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">In the News</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              outlet: 'TechCrunch',
              title: 'African E-commerce Platform Xarastore Raises $50M',
              date: 'March 2, 2024',
              link: '#',
            },
            {
              outlet: 'Business Daily',
              title: 'Xarastore's Rapid Growth in Kenyan Market',
              date: 'February 25, 2024',
              link: '#',
            },
            {
              outlet: 'Forbes Africa',
              title: 'The Woman Building Africa's Amazon',
              date: 'January 15, 2024',
              link: '#',
            },
            {
              outlet: 'CNBC Africa',
              title: 'Digital Commerce Transforming African Retail',
              date: 'December 10, 2023',
              link: '#',
            },
            {
              outlet: 'Bloomberg',
              title: 'Kenyan Startup Expands Across Continent',
              date: 'November 5, 2023',
              link: '#',
            },
            {
              outlet: 'BBC',
              title: 'How E-commerce is Changing Shopping in Africa',
              date: 'October 20, 2023',
              link: '#',
            },
          ].map((article) => (
            <div
              key={article.outlet}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-900">{article.outlet}</span>
                <span className="text-sm text-gray-500">{article.date}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{article.title}</h3>
              <a
                href={article.link}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Read Article →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Press Mailing List */}
      <div className="container-responsive py-16">
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <Newspaper className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-bold mb-6">Stay Updated</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join our press mailing list to receive the latest news and announcements
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900"
              />
              <Button variant="secondary" className="text-red-600">
                Subscribe
              </Button>
            </div>
            <p className="text-sm opacity-80 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
