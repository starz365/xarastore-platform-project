import { ReactNode } from 'react';
import { DealsNavigation } from '@/components/deals/DealsNavigation';

export default function DealsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DealsNavigation />
      <main>{children}</main>
    </div>
  );
}
