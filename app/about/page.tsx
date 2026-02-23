'use client';

import { Users, Target, Globe, Award, Heart, TrendingUp } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To make quality products accessible and affordable for everyone in Africa',
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: Heart,
      title: 'Customer First',
      description: 'We exist to serve our customers with integrity and transparency',
      color: 'bg-pink-100 text-pink-600',
    },
    {
      icon: Globe,
      title: 'Local Impact',
      description: 'Creating opportunities and supporting local economies across Africa',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Award,
      title: 'Quality Promise',
      description: 'Every product meets our strict standards of quality and authenticity',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: Users,
      title: 'Team Culture',
      description: 'Diverse, passionate team driving innovation in African e-commerce',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: TrendingUp,
      title: 'Growth Mindset',
      description: 'Continuously evolving to better serve our community',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const milestones = [
    { year: '2022', event: 'Xarastore founded in Nairobi, Kenya' },
    { year: '2023 Q1', event: 'Launched first 1,000 products' },
    { year: '2023 Q2', event: 'Reached 10,000 customers' },
    { year: '2023 Q3', event: 'Expanded to 5 African countries' },
    { year: '2023 Q4', event: 'Processed KES 100M in orders' },
    { year: '2024', event: 'Aiming to serve 1M customers' },
  ];

  const teamMembers = [
    {
      name: 'Sarah Mwangi',
      role: 'CEO & Founder',
      bio: 'Former e-commerce executive with 15+ years experience',
      image: '👩🏾‍💼',
    },
    {
      name: 'David Ochieng',
      role: 'CTO',
      bio: 'Tech leader specializing in scalable African solutions',
      image: '👨🏾‍💻',
    },
    {
      name: 'Amina Hassan',
      role: 'Head of Operations',
      bio: 'Supply chain expert with Pan-African experience',
      image: '👩🏾‍🔧',
    },
    {
      name: 'James Kamau',
      role: 'Head of Marketing',
      bio: 'Digital marketing pioneer in African markets',
      image: '👨🏾‍💼',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Happy Customers' },
    { value: '100K+', label: 'Products Listed' },
    { value: '15+', label: 'African Countries' },
    { value: 'KES 500M+', label: 'Orders Processed' },
    { value: '200+', label: 'Team Members' },
    { value: '99.5%', label: 'Customer Satisfaction' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-20">
        <div className="container-responsive text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Redefining E-commerce in Africa
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Xarastore is more than just a marketplace - we're building the future of 
            African commerce, one deal at a time.
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="container-responsive py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Founded in 2022 in Nairobi, Kenya, Xarastore was born from a simple 
                observation: millions of Africans lacked access to affordable, 
                quality products while local businesses struggled to reach wider markets.
              </p>
              <p>
                We started with a small team and a big vision - to create a platform 
                that connects buyers and sellers across Africa, making commerce 
                seamless, secure, and accessible to everyone.
              </p>
              <p>
                Today, we've grown into one of Africa's fastest-growing e-commerce 
                platforms, but our founding principles remain: trust, value, and 
                community.
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-red-600 mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div className="bg-white py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do at Xarastore
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200"
                >
                  <div className={`w-14 h-14 ${value.color} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Our Journey</h2>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-red-200"></div>
          
          {/* Milestones */}
          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className="w-1/2 pr-8" style={{ 
                  textAlign: index % 2 === 0 ? 'right' : 'left',
                  paddingRight: index % 2 === 0 ? '2rem' : '0',
                  paddingLeft: index % 2 === 0 ? '0' : '2rem',
                }}>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-2xl font-bold text-red-600 mb-2">{milestone.year}</div>
                    <p className="text-gray-700">{milestone.event}</p>
                  </div>
                </div>
                
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="w-6 h-6 bg-red-600 rounded-full border-4 border-white"></div>
                </div>
                
                <div className="w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leadership Team */}
      <div className="bg-gray-50 py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The passionate leaders driving Xarastore's mission
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="text-5xl text-center mb-4">{member.image}</div>
                  <h3 className="text-xl font-bold text-gray-900 text-center">{member.name}</h3>
                  <p className="text-red-600 font-medium text-center mb-3">{member.role}</p>
                  <p className="text-gray-600 text-center text-sm">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Impact */}
      <div className="container-responsive py-16">
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Our Impact</h2>
              <div className="space-y-4">
                <p className="opacity-90">
                  Beyond commerce, we're committed to creating positive change in 
                  the communities we serve.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Created 500+ direct jobs across Africa
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Supported 2,000+ local businesses
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Donated KES 10M+ to community initiatives
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                    Trained 1,000+ entrepreneurs in digital skills
                  </li>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">500+</div>
                <div>Jobs Created</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">2,000+</div>
                <div>Businesses Supported</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">KES 10M+</div>
                <div>Community Investment</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">1,000+</div>
                <div>Entrepreneurs Trained</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Us */}
      <div className="bg-white py-16">
        <div className="container-responsive text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Join Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            We're always looking for talented, passionate individuals to help us 
            build the future of African e-commerce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/careers"
              className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              View Careers
            </a>
            <a
              href="/investors"
              className="inline-flex items-center justify-center px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Investor Relations
            </a>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="container-responsive py-16">
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Have questions about Xarastore? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@xarastore.com"
              className="text-red-600 hover:text-red-800 font-medium"
            >
              hello@xarastore.com
            </a>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a
              href="/press"
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Press Inquiries
            </a>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a
              href="/help"
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Support Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
