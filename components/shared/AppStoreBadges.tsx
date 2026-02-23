import Link from 'next/link';
import Image from 'next/image';

export function AppStoreBadges() {
  const appStores = [
    {
      name: 'App Store',
      href: process.env.NEXT_PUBLIC_APP_STORE_URL || '#',
      badge: '/images/app-store-badge.svg',
      alt: 'Download on the App Store',
      width: 135,
      height: 40,
    },
    {
      name: 'Google Play',
      href: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL || '#',
      badge: '/images/google-play-badge.svg',
      alt: 'Get it on Google Play',
      width: 135,
      height: 40,
    },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {appStores.map((store) => (
        <Link
          key={store.name}
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block hover:opacity-90 transition-opacity"
        >
          <div className="relative w-[135px] h-[40px]">
            <Image
              src={store.badge}
              alt={store.alt}
              fill
              className="object-contain"
              sizes="135px"
              priority={false}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
