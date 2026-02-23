{/*

import type { Metadata } from 'next';
import GiftCardsClient from './GiftCardsClient';

export const metadata: Metadata = {
  title: 'Gift Cards | Xarastore',
  description:
    'Give the perfect gift with Xarastore Gift Cards. Redeemable across millions of products with instant delivery.',
};

export default function GiftCardsPage() {
  return <GiftCardsClient />;
}
*/}



'use client';

import { LoadingProgress } from '@/components/loading/LoadingProgress';

export default function Loading({ routeInfo }: { routeInfo: any }) {
  return <LoadingProgress routeInfo={routeInfo} />;
}

