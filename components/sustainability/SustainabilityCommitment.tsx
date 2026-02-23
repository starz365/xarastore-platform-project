import { Target, Calendar, Award, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function SustainabilityCommitment() {
  const commitments = [
    {
      year: '2024',
      goals: [
        'Achieve 100% recyclable packaging',
        'Launch product take-back program',
        'Reduce delivery emissions by 30%',
      ],
    },
    {
      year: '2025',
      goals: [
        'Carbon-neutral operations',
        '50% renewable energy usage',
        'Zero waste to landfill',
      ],
    },
    {
      year: '2030',
      goals: [
        'Net-zero carbon footprint',
        '100% renewable energy',
        'Circular economy model',
      ],
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Our Commitment
          </h2>
        </div>
        <p className="text-gray-600 max-w-2xl">
          Ambitious goals and transparent reporting on our sustainability journey.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {commitments.map((commitment) => (
          <div key={commitment.year} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">{commitment.year} Goals</h3>
            </div>
            <ul className="space-y-3">
              {commitment.goals.map((goal, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-gray-700">{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Certifications & Reports</h3>
            </div>
            <p className="text-gray-600">
              Download our sustainability reports and view our certifications.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary">
              <FileText className="w-4 h-4 mr-2" />
              2023 Sustainability Report
            </Button>
            <Button variant="primary">
              View All Reports
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
