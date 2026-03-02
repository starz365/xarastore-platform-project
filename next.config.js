/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest.json$/],

  // ==========================
  // Runtime Caching
  // ==========================
  runtimeCaching: [
    // Navigation / Pages
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        fallbackURL: '/offline',
      },
    },
    // Static JS / CSS / TS
    {
      urlPattern: /\.(?:js|css|ts|tsx)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Images
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Fonts
    {
      urlPattern: /\.(?:woff2|woff|ttf|otf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Cart/Orders API (Background Sync)
    {
      urlPattern: /^https:\/\/api\.xarastore\.com\/(cart|orders)\/?.*$/,
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'offline-queue',
          options: {
            maxRetentionTime: 24 * 60, // 24 hours
          },
        },
      },
    },
    // Other API calls (Supabase / External)
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // ==========================
  // Images
  // ==========================
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.xarastore.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ==========================
  // Security & Performance Headers
  // ==========================
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Loading-Type', value: 'skeleton' },
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
  ],

  // ==========================
  // Server Components & Scroll Restoration
  // ==========================
  serverExternalPackages: ['@supabase/supabase-js'],

  // ==========================
  // On-demand entries (development performance)
  // ==========================
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // ==========================
  // Compiler options
  // ==========================
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ==========================
  // Turbopack config (empty to suppress errors)
  // ==========================
  turbopack: {},
};

module.exports = withPWA(nextConfig);

