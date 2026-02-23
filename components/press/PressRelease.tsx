import { Calendar, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/product/EmptyState';

interface PressRelease {
  id: string;
  title: string;
  date: string;
  summary: string;
  downloadUrl: string;
}

export function PressReleases() {
  // In production, this would come from API
  const pressReleases: PressRelease[] = [
    // This would be populated from API
  ];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Press Releases
        </h2>
        <p className="text-gray-600">
          Official announcements and company news
        </p>
      </div>

      {pressReleases.length > 0 ? (
        <div className="space-y-6">
          {pressReleases.map((release) => (
            <div
              key={release.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-red-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{release.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <FileText className="w-4 h-4" />
                      <span>Press Release</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {release.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {release.summary}
                  </p>
                </div>
                <Button variant="secondary" size="sm" href={release.downloadUrl}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Press Releases"
          description="Check back soon for company announcements and news."
          icon="search"
        />
      )}
    </section>
  );
}
