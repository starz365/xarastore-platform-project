import { SustainabilityHero } from '@/components/sustainability/SustainabilityHero';
import { SustainabilityInitiatives } from '@/components/sustainability/SustainabilityInitiatives';
import { SustainabilityImpact } from '@/components/sustainability/SustainabilityImpact';
import { SustainabilityCommitment } from '@/components/sustainability/SustainabilityCommitment';

export const metadata = {
  title: 'Sustainability | Xarastore',
  description: 'Our commitment to environmental responsibility, social impact, and sustainable business practices.',
};

export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SustainabilityHero />
      <div className="container-responsive py-8 space-y-12">
        <SustainabilityInitiatives />
        <SustainabilityImpact />
        <SustainabilityCommitment />
      </div>
    </div>
  );
}
