import { PressReleases } from '@/components/press/PressReleases';
import { MediaResources } from '@/components/press/MediaResources';
import { PressContact } from '@/components/press/PressContact';

export const metadata = {
  title: 'Press & Media | Xarastore',
  description: 'Latest news, press releases, and media resources about Xarastore.',
};

export default function PressPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Press & Media
            </h1>
            <p className="text-xl opacity-90">
              Latest news, press releases, and media resources about Xarastore.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-8 space-y-12">
        <PressReleases />
        <MediaResources />
        <PressContact />
      </div>
    </div>
  );
}
