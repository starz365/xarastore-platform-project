import { FileText, Users, MessageSquare, CheckCircle } from 'lucide-react';

export function ApplicationProcess() {
  const steps = [
    {
      step: 1,
      title: 'Apply Online',
      description: 'Submit your application through our portal',
      icon: FileText,
    },
    {
      step: 2,
      title: 'Screening',
      description: 'Initial review by our talent team',
      icon: Users,
    },
    {
      step: 3,
      title: 'Interviews',
      description: 'Meet with the team (2-3 rounds)',
      icon: MessageSquare,
    },
    {
      step: 4,
      title: 'Offer',
      description: 'Receive and review your offer',
      icon: CheckCircle,
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Our Hiring Process
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We've designed a transparent and efficient process to help you succeed
        </p>
      </div>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200 hidden md:block" />
        <div className="grid md:grid-cols-4 gap-8 relative">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="text-center">
                <div className="relative mb-6">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto relative z-10">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-white">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What We Look For
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Required</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span>Passion for our mission</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span>Strong problem-solving skills</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <span>Collaborative mindset</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Nice to Have</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  +
                </div>
                <span>Experience in e-commerce</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  +
                </div>
                <span>Knowledge of African markets</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  +
                </div>
                <span>Startup experience</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
