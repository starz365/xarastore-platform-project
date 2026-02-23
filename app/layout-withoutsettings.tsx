import type { Metadata, Viewport } from 'next';
import './globals.css';
import localFont from 'next/font/local';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster, ToastProvider } from '@/components/shared/Toast';

import { OfflineIndicator } from '@/components/shared/OfflineIndicator';

// Client-only PWA components
import ClientComponentsWrapper from './ClientComponentsWrapper';

export const inter = localFont({
  src: [
    {
      path: './fonts/Inter-fonts/web/InterVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
});

// ----------------------
// Metadata (server-only)
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com'
  ),
  title: 'Xarastore - it\'s a deal',
  description:
    'Shop the best deals on electronics, fashion, home goods, and more. Kenya\'s fastest-growing online marketplace.',
  keywords: 'online shopping, Kenya, deals, electronics, fashion, home goods',
  authors: [{ name: 'Xarastore' }],
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://xarastore.com',
    title: 'Xarastore - it\'s a deal',
    description: 'Shop the best deals in Kenya',
    siteName: 'Xarastore',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Xarastore',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xarastore - it\'s a deal',
    description: 'Shop the best deals in Kenya',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// ----------------------
// Root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}
      >
        <Providers>
          <ToastProvider>
            {/* CLIENT COMPONENTS */}
            <ClientComponentsWrapper />
            {/* MAIN LAYOUT */}
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </ToastProvider>
        </Providers>

        {/* Service Worker registration (hydration-safe) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
