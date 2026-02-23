'use client';

import { Briefcase, MapPin, DollarSign, Clock, Users, Zap, Award, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function CareersPage() {
  const jobOpenings = [
    {
      id: 'backend-2024',
      title: 'Senior Backend Engineer',
      department: 'Engineering',
      location: 'Nairobi, Kenya',
      type: 'Full-time',
      salary: 'KES 300K - 500K',
      description: 'Build scalable backend systems for our e-commerce platform',
      requirements: ['5+ years experience', 'Node.js/Python', 'PostgreSQL', 'AWS'],
      posted: '2 days ago',
    },
    {
      id: 'frontend-2024',
      title: 'Frontend Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      salary: 'KES 250K - 400K',
      description: 'Create beautiful, responsive user interfaces with React/Next.js',
      requirements: ['3+ years experience', 'React/TypeScript', 'Next.js', 'Tailwind CSS'],
      posted: '1 week ago',
    },
    {
      id: 'product-2024',
      title: 'Product Manager',
      department: 'Product',
      location: 'Nairobi, Kenya',
      type: 'Full-time',
      salary: 'KES 350K - 550K',
      description: 'Lead product strategy and roadmap for our marketplace',
      requirements: ['5+ years PM experience', 'E-commerce background', 'Data-driven'],
      posted: '3 days ago',
    },
    {
      id: 'marketing-2024',
      title: 'Growth Marketing Manager',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time',
      salary: 'KES 280K - 450K',
      description: 'Drive user acquisition and retention across African markets',
      requirements: ['4+ years experience', 'Digital marketing', 'Analytics', 'Team leadership'],
      posted: '5 days ago',
    },
    {
      id: 'customer-2024',
      title: 'Customer Success Lead',
      department: 'Operations',
      location: 'Nairobi, Kenya',
      type: 'Full-time',
      salary: 'KES 200K - 350K',
      description: 'Build and scale our customer support operations',
      requirements: ['3+ years experience', 'Customer service', 'Process optimization', 'Team management'],
      posted: '1 week ago',
    },
    {
      id: 'data-2024',
      title: 'Data Analyst',
      department: 'Data',
      location: 'Remote',
      type: 'Full-time',
      salary: 'KES 250K - 400K',
      description: 'Turn data into insights that drive business decisions',
      requirements: ['3+ years experience', 'SQL/Python', 'Data visualization', 'Statistics'],
      posted: '4 days ago',
    },
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: 'Competitive Salary',
      description: 'Above-market compensation with regular reviews',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Users,
      title: 'Team Culture',
      description: 'Collaborative, supportive, and diverse team environment',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Zap,
      title: 'Growth Opportunities',
      description: 'Clear career progression and learning budget',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: Award,
      title: 'Impact',
      description: 'Work that directly improves lives across Africa',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Heart,
      title: 'Health & Wellness',
      description: 'Comprehensive medical insurance and wellness programs',
      color: 'bg-pink-100 text-pink-600',
    },
    {
      icon: Clock,
      title: 'Flexibility',
      description: 'Remote work options and flexible hours',
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Operations',
    'Data',
    'Finance',
    'Legal',
  ];

  const values = [
    {
      title: 'Customer Obsession',
      description: 'We start with the customer and work backwards',
    },
    {
      title: 'Ownership',
      description: 'We act on behalf of the entire company',
    },
    {
      title: 'Innovation',
      description: 'We embrace new ideas and calculated risks',
    },
    {
      title: 'Inclusion',
      description: 'We value diverse perspectives and backgrounds',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-20">
        <div className="container-responsive text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Build the Future of African Commerce
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            Join our mission to make quality products accessible to everyone in Africa.
            Work with passionate people on meaningful challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" href="#openings">
              View Open Positions
            </Button>
            <Button variant="outline" size="lg" className="text-white border-white" href="#values">
              Our Culture
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container-responsive py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">200+</div>
            <div className="text-gray-600">Team Members</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">15+</div>
            <div className="text-gray-600">Countries</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">50%</div>
            <div className="text-gray-600">Leadership Women</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">4.8</div>
            <div className="text-gray-600">Team Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Job Search */}
      <div className="container-responsive py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Find Your Role</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Jobs
              </label>
              <Input
                placeholder="Job title, keywords, or department"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none">
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none">
                <option value="">All Locations</option>
                <option value="nairobi">Nairobi, Kenya</option>
                <option value="remote">Remote</option>
                <option value="lagos">Lagos, Nigeria</option>
                <option value="accra">Accra, Ghana</option>
              </select>
            </div>
          </div>
          <Button variant="primary" className="w-full md:w-auto">
            Search Jobs
          </Button>
        </div>
      </div>

      {/* Job Openings */}
      <div id="openings" className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Open Positions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobOpenings.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                        {job.department}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <Briefcase className="w-8 h-8 text-gray-400" />
                </div>

                <p className="text-gray-600 mb-4">{job.description}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    {job.salary}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Posted {job.posted}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Key Requirements:</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button variant="primary" className="flex-1" href={`/careers/${job.id}`}>
                    Apply Now
                  </Button>
                  <Button variant="secondary" href={`/careers/${job.id}`}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Match Message */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Don't see a perfect match? We're always looking for great talent.
          </p>
          <Button variant="outline" href="mailto:careers@xarastore.com">
            Send Open Application
          </Button>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white py-16">
        <div className="container-responsive">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Work at Xarastore
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className={`w-14 h-14 ${benefit.color} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div id="values" className="container-responsive py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Our Culture & Values
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-8"
            >
              <div className="text-4xl font-bold text-white/20 mb-4">0{index + 1}</div>
              <h3 className="text-2xl font-bold mb-4">{value.title}</h3>
              <p className="opacity-90">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hiring Process */}
      <div className="bg-gray-50 py-16">
        <div className="container-responsive">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Our Hiring Process
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Process line */}
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 transform -translate-y-1/2"></div>
              
              {/* Steps */}
              <div className="relative flex justify-between">
                {[
                  { step: '1', title: 'Application', desc: 'Submit your application' },
                  { step: '2', title: 'Screening', desc: 'Initial phone screening' },
                  { step: '3', title: 'Interview', desc: 'Technical & cultural interviews' },
                  { step: '4', title: 'Case Study', desc: 'Practical assessment' },
                  { step: '5', title: 'Offer', desc: 'Decision & offer' },
                ].map((process, index) => (
                  <div key={index} className="relative flex flex-col items-center">
                    <div className="w-16 h-16 bg-white border-4 border-red-600 rounded-full flex items-center justify-center mb-4 z-10">
                      <span className="text-xl font-bold text-red-600">{process.step}</span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-gray-900 mb-1">{process.title}</h3>
                      <p className="text-sm text-gray-600">{process.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container-responsive py-16">
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Make an Impact?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join our team and help build the future of African e-commerce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" href="#openings" className="text-red-600">
              View All Openings
            </Button>
            <Button variant="outline" size="lg" href="mailto:careers@xarastore.com" className="text-white border-white">
              Contact Talent Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
