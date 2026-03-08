import { Metadata } from 'next';
import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'Account Settings | Xarastore',
  description: 'Manage your account settings, security, billing, and preferences.',
};

export default function AccountProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileClient />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
