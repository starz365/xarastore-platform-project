import type { Metadata, Viewport } from 'next';
import './globals.css';
import localFont from 'next/font/local';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster, ToastProvider } from '@/components/shared/Toast';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { settingsManager } from '@/lib/utils/settings';
// Client-only PWA components
import ClientComponentsWrapper from './ClientComponentsWrapper';

// ----------------------
// Font Configuration (Self-hosted for reliability)
// ----------------------
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
// Dynamic Metadata with Settings Manager
// ----------------------
export async function generateMetadata(): Promise<Metadata> {
  const settings = await settingsManager.getSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com';
  
  return {
    // FIXED: Added metadataBase to resolve social image warnings
    metadataBase: new URL(siteUrl),
    
    title: {
      default: settings.seo_title || `${settings.site_name} - ${settings.site_tagline}`,
      template: `%s | ${settings.site_name}`,
    },
    
    description: settings.seo_description || 'Shop the best deals on electronics, fashion, home goods, and more. Kenya\'s fastest-growing online marketplace.',
    
    keywords: settings.seo_keywords || 'online shopping, Kenya, deals, electronics, fashion, home goods',
    
    authors: [{ name: settings.site_name || 'Xarastore' }],
    creator: settings.site_name || 'Xarastore',
    publisher: settings.site_name || 'Xarastore',
    
    openGraph: {
      type: 'website',
      locale: 'en_KE',
      url: siteUrl,
      title: settings.seo_title || settings.site_name,
      description: settings.seo_description || settings.site_tagline,
      siteName: settings.site_name,
      images: settings.logo_url ? [
        {
          url: settings.logo_url,
          width: 1200,
          height: 630,
          alt: settings.site_name,
        },
      ] : [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: settings.site_name || 'Xarastore',
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: settings.seo_title || settings.site_name,
      description: settings.seo_description || settings.site_tagline,
      images: settings.logo_url ? [settings.logo_url] : ['/twitter-image.png'],
      creator: '@xarastore', // Update with your actual Twitter handle if different
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
    
    // Additional metadata for better SEO
    alternates: {
      canonical: siteUrl,
    },
    
    // App-specific metadata
    applicationName: settings.site_name || 'Xarastore',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: settings.site_name || 'Xarastore',
    },
    
    formatDetection: {
      telephone: false,
    },
    
    manifest: '/manifest.json',
  };
}

// ----------------------
// Dynamic Viewport with Settings Manager
// ----------------------
export async function generateViewport(): Promise<Viewport> {
  const settings = await settingsManager.getSiteSettings();
  
  return {
    themeColor: settings.primary_color || '#dc2626',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  };
}

// ----------------------
// Root Layout
// ----------------------
export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
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
        className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col antialiased`}
      >
        <Providers>
          <ToastProvider>
            {/* CLIENT COMPONENTS (PWA features, install prompts, etc.) */}
            <ClientComponentsWrapper />
            
            {/* OFFLINE INDICATOR */}
            <OfflineIndicator />
            
            {/* MAIN LAYOUT */}
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            
            {/* TOAST NOTIFICATIONS */}
            <Toaster />
          </ToastProvider>
        </Providers>
        
        {/* Service Worker Registration (hydration-safe) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
