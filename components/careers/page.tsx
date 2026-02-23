import { CareersSection } from '@/components/about/CareersSection';
import { JobOpenings } from '@/components/careers/JobOpenings';
import { ApplicationProcess } from '@/components/careers/ApplicationProcess';

export const metadata = {
  title: 'Careers at Xarastore | Join Our Team',
  description: 'Build the future of e-commerce in Africa. Explore career opportunities at Xarastore.',
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Build the Future of E-commerce
            </h1>
            <p className="text-xl opacity-90">
              Join our mission to transform online shopping in Africa. Work with talented teams on meaningful projects.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-8 space-y-12">
        <CareersSection />
        <JobOpenings />
        <ApplicationProcess />
      </div>
    </div>
  );
}
