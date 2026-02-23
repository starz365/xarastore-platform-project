import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { Toaster } from '@/components/shared/Toast';
import { settingsManager } from '@/lib/utils/settings';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await settingsManager.getSiteSettings();
  
  return {
    title: settings.seo_title || `${settings.site_name} - ${settings.site_tagline}`,
    description: settings.seo_description || 'Shop the best deals on Xarastore',
    keywords: settings.seo_keywords || 'online shopping, Kenya, deals, electronics, fashion',
    authors: [{ name: settings.site_name }],
    openGraph: {
      type: 'website',
      locale: 'en_KE',
      url: 'https://xarastore.com',
      title: settings.site_name,
      description: settings.site_tagline,
      siteName: settings.site_name,
      images: settings.logo_url ? [
        {
          url: settings.logo_url,
          width: 1200,
          height: 630,
          alt: settings.site_name,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.site_name,
      description: settings.site_tagline,
      images: settings.logo_url ? [settings.logo_url] : [],
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
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await settingsManager.getSiteSettings();
  
  return {
    themeColor: settings.primary_color,
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}>
        <Providers>
          <OfflineIndicator />
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
        </Providers>
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
