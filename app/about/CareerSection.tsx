import { Briefcase, Users, Award, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CareersSection() {
  const benefits = [
    {
      icon: Briefcase,
      title: 'Meaningful Work',
      description: 'Work on projects that impact millions of customers.',
    },
    {
      icon: Users,
      title: 'Great Team',
      description: 'Collaborate with talented, passionate professionals.',
    },
    {
      icon: Award,
      title: 'Growth Opportunities',
      description: 'Clear career paths and learning programs.',
    },
    {
      icon: Coffee,
      title: 'Work-Life Balance',
      description: 'Flexible hours and remote work options.',
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Join Our Team
          </h2>
          <div className="space-y-4 text-gray-700 mb-8">
            <p>
              At Xarastore, we're building the future of e-commerce in Africa. We're looking for 
              passionate individuals who want to make a difference.
            </p>
            <p>
              Whether you're an engineer, marketer, designer, or operations expert, if you're excited 
              about creating exceptional customer experiences, we'd love to hear from you.
            </p>
          </div>
          <Button variant="primary" size="lg" href="/careers">
            View Open Positions
          </Button>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Why Work With Us
          </h3>
          <div className="space-y-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{benefit.title}</h4>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
