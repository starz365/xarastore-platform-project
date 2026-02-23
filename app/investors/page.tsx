import { TrendingUp, Users, Globe, Shield, BarChart, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Investor Relations | Xarastore',
  description: 'Invest in Africa\'s fastest-growing e-commerce platform. Join our mission to revolutionize online shopping across the continent.',
};

export default function InvestorsPage() {
  const metrics = [
    { label: 'Annual Revenue Growth', value: '245%', icon: TrendingUp, description: 'Year-over-year growth' },
    { label: 'Active Customers', value: '1.2M+', icon: Users, description: 'Across East Africa' },
    { label: 'Market Reach', value: '4 Countries', icon: Globe, description: 'Kenya, Uganda, Tanzania, Rwanda' },
    { label: 'Transaction Volume', value: 'KES 2.8B', icon: BarChart, description: 'Annual GMV' },
  ];

  const investmentOpportunities = [
    {
      title: 'Series B Funding',
      amount: '$25M',
      stage: 'Open',
      deadline: 'Q2 2024',
      description: 'Expanding to West Africa and enhancing logistics infrastructure',
      highlights: ['Market expansion', 'Tech infrastructure', 'Talent acquisition'],
    },
    {
      title: 'Strategic Partnerships',
      amount: 'Open',
      stage: 'Ongoing',
      deadline: 'Rolling',
      description: 'Strategic investments from industry leaders in retail and technology',
      highlights: ['Co-branding opportunities', 'Technology exchange', 'Market access'],
    },
  ];

  const milestones = [
    { year: '2021', event: 'Company Founded', detail: 'Launched in Nairobi with seed funding' },
    { year: '2022', event: 'Series A - $8M', detail: 'Expanded to Uganda and Tanzania' },
    { year: '2023', event: '1M Customers', detail: 'Reached major milestone in user growth' },
    { year: '2024', event: 'Profitability', detail: 'Achieved positive EBITDA in Q1' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 text-white">
        <div className="container-responsive py-20 md:py-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4 mr-2" />
              Investment Opportunity
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Building Africa's
              <span className="block text-red-400">E-commerce Future</span>
            </h1>
            <p className="text-xl text-gray-300 mb-10 max-w-3xl">
              Join us in revolutionizing online retail across Africa. We're seeking visionary investors 
              to accelerate our growth and capture the $50B+ African e-commerce opportunity.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" size="lg" asChild>
                <a href="#investment-opportunities">
                  View Opportunities
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white">
                <a href="#contact">
                  Contact Investor Relations
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-16 bg-white">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              By The Numbers
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Data-driven growth and measurable impact across East Africa
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{metric.value}</div>
                  <div className="font-semibold text-gray-800 mb-2">{metric.label}</div>
                  <div className="text-sm text-gray-600">{metric.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Investment Opportunities */}
      <section id="investment-opportunities" className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Investment Opportunities
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Strategic investment rounds designed for maximum impact and returns
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {investmentOpportunities.map((opportunity, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{opportunity.title}</h3>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                          {opportunity.stage}
                        </span>
                        <span className="text-gray-600">Deadline: {opportunity.deadline}</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-red-600">{opportunity.amount}</div>
                  </div>
                  <p className="text-gray-700 mb-6">{opportunity.description}</p>
                  <div className="space-y-3 mb-8">
                    {opportunity.highlights.map((highlight, i) => (
                      <div key={i} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-800">{highlight}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="primary" className="w-full">
                    Express Interest
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth Timeline */}
      <section className="py-16 bg-white">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From startup to regional leader in African e-commerce
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-red-200"></div>
            
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`relative flex items-center mb-12 ${
                  index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                <div className={`w-1/2 ${index % 2 === 0 ? 'pr-12 text-right' : 'pl-12'}`}>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-sm font-semibold text-red-600 mb-2">{milestone.year}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.event}</h3>
                    <p className="text-gray-600">{milestone.detail}</p>
                  </div>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-red-600 rounded-full border-4 border-white"></div>
                <div className="w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Advantages */}
      <section className="py-16 bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Invest in Xarastore
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Unique advantages that position us for exceptional growth
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <Target className="w-12 h-12 mb-6" />
              <h3 className="text-xl font-bold mb-4">First-Mover Advantage</h3>
              <p className="opacity-90">
                Established presence in key African markets with proven local market expertise
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <BarChart className="w-12 h-12 mb-6" />
              <h3 className="text-xl font-bold mb-4">Proven Unit Economics</h3>
              <p className="opacity-90">
                Positive unit economics with scalable model and improving margins
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <Shield className="w-12 h-12 mb-6" />
              <h3 className="text-xl font-bold mb-4">Technology Leadership</h3>
              <p className="opacity-90">
                Proprietary platform optimized for African network conditions and mobile users
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Investor Relations Contact
              </h2>
              <p className="text-gray-600">
                For investment inquiries, due diligence requests, or investor presentations
              </p>
            </div>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    placeholder="Investment Firm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    placeholder="john@firm.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                    placeholder="+254 712 345 678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investment Interest
                </label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none">
                  <option value="">Select investment type</option>
                  <option value="series-b">Series B Round</option>
                  <option value="strategic">Strategic Partnership</option>
                  <option value="debt">Debt Financing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  placeholder="Tell us about your investment interest..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="nda"
                  className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
                />
                <label htmlFor="nda" className="ml-2 text-sm text-gray-700">
                  I'm willing to sign an NDA for detailed financial information
                </label>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Submit Investor Inquiry
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <div className="bg-gray-900 text-gray-400 py-8">
        <div className="container-responsive text-sm">
          <p className="text-center">
            This is not an offer to sell securities. Investment opportunities are available only to accredited 
            investors. Past performance is not indicative of future results. All figures are unaudited estimates.
          </p>
        </div>
      </div>
    </div>
  );
}
